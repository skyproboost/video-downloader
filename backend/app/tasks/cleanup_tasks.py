import time

from loguru import logger

from app.settings import settings
from app.tasks.broker import broker


@broker.task(schedule=[{"cron": "*/5 * * * *"}])
def cleanup_old_videos() -> int:
    """Delete downloaded videos older than video_storage_minutes. Returns count removed."""
    max_age_seconds = settings.video_storage_minutes * 60
    now = time.time()
    removed = 0

    if not settings.download_dir.exists():
        return 0

    for file in settings.download_dir.iterdir():
        if not file.is_file():
            continue
        age = now - file.stat().st_mtime
        if age > max_age_seconds:
            file.unlink()
            logger.info(f"Cleaned up old video: {file.name} (age={age:.0f}s)")
            removed += 1

    if removed:
        logger.info(f"Cleanup complete: removed {removed} file(s)")
    return removed
