from fastapi import APIRouter, Depends
from app.utils.common import verify_api_key
from app.services.redis.rate_limit import rate_limit_download
from app.tasks.download_tasks import download_video as download_video_task
import yt_dlp

router = APIRouter(tags=["download"])


@router.get("/get_download_link", dependencies=[Depends(rate_limit_download)])
async def download_video_link(url: str) -> dict:
    """Get direct video URL without downloading."""

    ydl_opts = {
        "format": "best[vcodec!=none][acodec!=none]/best*",
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    return {
        "url": info["url"],
        "title": info.get("title"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "ext": info.get("ext"),
        "http_headers": info.get("http_headers"),
    }


@router.post("/download", dependencies=[Depends(verify_api_key)])
async def download_video(url: str, res: str) -> dict:
    """Download video in up to 4K with audio merged."""

    task = await download_video_task.kiq(url, res)

    return {"task_id": task.task_id}
