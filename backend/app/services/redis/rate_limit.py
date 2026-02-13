import time
from dataclasses import dataclass

from fastapi import HTTPException, Request, status
from redis.asyncio import ConnectionPool, Redis

# Lua script for atomic sliding window counter
# This runs atomically on Redis, preventing race conditions
SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local window_start = now - window
local current_key = key .. ":" .. math.floor(now / window)
local previous_key = key .. ":" .. math.floor(now / window - 1)

-- Get counts from current and previous windows
local current_count = tonumber(redis.call("GET", current_key) or "0")
local previous_count = tonumber(redis.call("GET", previous_key) or "0")

-- Calculate weighted count using sliding window
local elapsed = now % window
local weighted_previous = previous_count * ((window - elapsed) / window)
local total = weighted_previous + current_count

if total >= limit then
    local retry_after = window - elapsed
    return {0, math.ceil(total), math.ceil(retry_after)}
end

-- Increment current window and set expiry
redis.call("INCR", current_key)
redis.call("EXPIRE", current_key, window * 2)

return {1, math.ceil(total + 1), 0}
"""


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""

    allowed: bool
    current_count: int
    retry_after: int  # seconds until rate limit resets


class RateLimiter:
    """
    Sliding window counter rate limiter using Redis.

    This implementation provides:
    - Accurate rate limiting without fixed window boundary issues
    - Atomic operations via Lua scripting (no race conditions)
    - Memory efficient (only stores 2 counters per key)
    - Configurable per-endpoint limits
    """

    def __init__(self, redis_pool: ConnectionPool) -> None:
        self.redis_pool = redis_pool
        self._script_sha: str | None = None

    async def _get_script_sha(self, redis: Redis) -> str:
        """Load and cache the Lua script SHA."""
        if self._script_sha is None:
            self._script_sha = await redis.script_load(SLIDING_WINDOW_SCRIPT)
        return self._script_sha

    async def check(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult:
        """
        Check if request is allowed under rate limit.

        Args:
            key: Unique identifier (e.g., "download:192.168.1.1")
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            RateLimitResult with allowed status and metadata
        """
        async with Redis(connection_pool=self.redis_pool) as redis:
            now = time.time()
            script_sha = await self._get_script_sha(redis)

            try:
                result = await redis.evalsha(
                    script_sha,
                    1,  # number of keys
                    key,
                    str(now),
                    str(window_seconds),
                    str(limit),
                )
            except Exception:
                # Script not loaded, reload it
                self._script_sha = None
                script_sha = await self._get_script_sha(redis)
                result = await redis.evalsha(
                    script_sha,
                    1,
                    key,
                    str(now),
                    str(window_seconds),
                    str(limit),
                )

            return RateLimitResult(
                allowed=bool(result[0]),
                current_count=int(result[1]),
                retry_after=int(result[2]),
            )


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""

    requests_per_window: int
    window_seconds: int
    key_prefix: str = "ratelimit"

    def get_key(self, identifier: str) -> str:
        """Generate Redis key for the identifier."""
        return f"{self.key_prefix}:{identifier}"


# Preset configurations for different use cases
DOWNLOAD_LIMIT = RateLimitConfig(
    requests_per_window=5,  # 5 downloads
    window_seconds=60,  # per minute
    key_prefix="ratelimit:download",
)

INFO_LIMIT = RateLimitConfig(
    requests_per_window=30,  # 30 info requests
    window_seconds=60,  # per minute
    key_prefix="ratelimit:info",
)


def get_client_ip(request: Request) -> str:
    """Extract client IP, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_rate_limit(
    request: Request,
    config: RateLimitConfig,
) -> None:
    """
    FastAPI dependency to enforce rate limiting.

    Raises HTTPException 429 if rate limit exceeded.
    """
    redis_pool: ConnectionPool = request.app.state.redis_pool
    limiter = RateLimiter(redis_pool)

    client_ip = get_client_ip(request)
    key = config.get_key(client_ip)

    result = await limiter.check(
        key=key,
        limit=config.requests_per_window,
        window_seconds=config.window_seconds,
    )

    # Add rate limit headers to response
    request.state.rate_limit_limit = config.requests_per_window
    request.state.rate_limit_remaining = max(
        0, config.requests_per_window - result.current_count
    )
    request.state.rate_limit_reset = result.retry_after

    if not result.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{result.retry_after}",
            headers={
                "Retry-After": str(result.retry_after),
                "X-RateLimit-Limit": str(config.requests_per_window),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(result.retry_after),
            },
        )



async def rate_limit_download(request: Request) -> None:
    """Rate limit dependency for download endpoint."""
    await check_rate_limit(request, DOWNLOAD_LIMIT)
