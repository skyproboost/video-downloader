import httpx
from loguru import logger

from app.settings import settings


async def notify_bot_upload(task_id: str, video_url: str) -> None:
    """POST to the telegram bot /api/upload endpoint with the video URL."""
    url = f"{settings.tg_bot_base_url}/api/upload"
    headers = {"X-API-Key": settings.download_api_key}
    payload = {"task_id": task_id, "url": video_url}

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    logger.info(f"Notified bot for task {task_id}")
