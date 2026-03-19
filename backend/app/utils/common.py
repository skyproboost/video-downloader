from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader

from app.settings import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Verify the API key from the request header."""
    if api_key is None or api_key != settings.download_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


async def api_key_or_rate_limit(
    request: Request,
    api_key: str = Security(api_key_header),
) -> None:
    """Allow requests with a valid API key; otherwise apply rate limiting."""
    if api_key and api_key == settings.download_api_key:
        return

    from app.services.redis.rate_limit import check_rate_limit, DOWNLOAD_LIMIT
    await check_rate_limit(request, DOWNLOAD_LIMIT)