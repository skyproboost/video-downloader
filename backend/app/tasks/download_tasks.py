from pathlib import Path
from uuid import uuid4

import yt_dlp
from loguru import logger
from taskiq import Context, TaskiqDepends

from app.settings import settings
from app.tasks.broker import broker
from app.utils.http import notify_bot_upload

settings.download_dir.mkdir(parents=True, exist_ok=True)


@broker.task
async def download_video(url: str, res: str, context: Context = TaskiqDepends()) -> str:
    """Download video from URL via yt-dlp. Returns the filename (basename)."""
    try:
        filename: str = uuid4().hex
        logger.info(f"Downloading video: {url}")

        ydl_opts = {
            "format": "bestvideo+bestaudio/best",
            "format_sort": [f"res:{res}"],
            "merge_output_format": "mp4",
            "outtmpl": str(settings.download_dir / f"{filename}.%(ext)s"),
            "quiet": True,
            "postprocessors": [
                {
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mp4",
                },
            ],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filepath = Path(info["requested_downloads"][-1]["filepath"])
            basename = filepath.name
            logger.info(f"Downloaded video: {basename}")

        task_id = context.message.task_id
        await notify_bot_upload(task_id, f"{settings.video_base_url}/{basename}")
    except Exception as exc:
        logger.error(f"Failed to download video: {exc}")
        raise
