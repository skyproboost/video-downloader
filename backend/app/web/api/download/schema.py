from pydantic import BaseModel


class VideoInfo(BaseModel):
    """Video information response."""

    url: str
    title: str | None = None
    duration: int | None = None
    thumbnail: str | None = None
    formats: list[dict] | None = None


class DownloadRequest(BaseModel):
    """Download request payload."""

    url: str
    res: str
