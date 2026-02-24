import enum
import multiprocessing
from functools import cached_property
from pathlib import Path
from tempfile import gettempdir
from typing import Any

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from yarl import URL

TEMP_DIR = Path(gettempdir())


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class LogLevel(str, enum.Enum):  # noqa: WPS600
    """Possible log levels."""

    NOTSET = "NOTSET"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class Settings(BaseSettings):
    """
    Application settings.

    These parameters can be configured
    with environment variables.
    """

    host: str = "127.0.0.1"
    port: int = 8000

    # Current environment
    environment: str = "dev"

    # Mapping for environment-specific settings
    _env_config: dict[str, Any] = {
        "dev": {"reload": True, "workers_count": 1},
        "prod": {
            "reload": False,
            "workers_count": multiprocessing.cpu_count()
            if multiprocessing.cpu_count() <= 8
            else 8,
        },
        "kubernetes": {"reload": False, "workers_count": 1},
    }

    log_level: LogLevel = LogLevel.INFO
    # Variables for the database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "app"
    db_pass: str = "app"
    db_base: str = "app"
    db_echo: bool = False

    # Variables for Redis
    redis_host: str = "app-redis"
    redis_port: int = 6379
    redis_user: str | None = None
    redis_pass: str | None = None
    redis_base: int | None = None

    # Video storage
    download_dir: Path = Path("/tmp/downloads")
    video_storage_minutes: int = 60

    # Cookies & proxy
    cookies_dir: Path = Path("/app/cookies")
    # JSON mapping of cookie filename -> socks proxy URL
    # e.g. {"account1.txt": "socks5://user:pass@host:1080"}
    cookie_proxy_map: dict[str, str] = {}

    # Telegram bot callback
    tg_bot_base_url: str

    # API Key for download endpoint
    download_api_key: str

    video_base_url: str

    @computed_field
    @cached_property
    def db_url(self) -> URL:
        """
        Assemble database URL from settings.

        :return: database URL.
        """
        return URL.build(
            scheme="postgresql",
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_pass,
            path=f"/{self.db_base}",
        )

    @computed_field
    @cached_property
    def redis_url(self) -> URL:
        """
        Assemble REDIS URL from settings.

        :return: redis URL.
        """
        path = ""
        if self.redis_base is not None:
            path = f"/{self.redis_base}"
        return URL.build(
            scheme="redis",
            host=self.redis_host,
            port=self.redis_port,
            user=self.redis_user,
            password=self.redis_pass,
            path=path,
        )

    @computed_field
    @cached_property
    def reload(self) -> bool:
        """
        Reload the application on changes.

        :return: reload flag.
        """
        return self._env_config[self.environment].get("reload", False)

    @computed_field
    @cached_property
    def workers_count(self) -> int:
        """
        Number of worker processes (only for gunicorn).

        :return: number of worker processes.
        """
        return self._env_config[self.environment].get("workers_count", 1)

    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
