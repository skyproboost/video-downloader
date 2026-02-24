import random
from fastapi import APIRouter, Depends
from app.utils.common import verify_api_key
from app.services.redis.rate_limit import rate_limit_download
from app.tasks.download_tasks import download_video as download_video_task
from app.web.api.download.schema import DownloadRequest
from app.settings import settings
import yt_dlp
from loguru import logger

router = APIRouter(tags=["download"])


@router.get("/get_download_link", dependencies=[Depends(rate_limit_download)])
async def download_video_link(url: str) -> dict:
    """Get direct video URL without downloading."""

    try:
        ydl_opts = {
            "quiet": True,
        }

        if settings.cookie_proxy_map:
            cookie_file = random.choice(list(settings.cookie_proxy_map.keys()))
            cookie_path = settings.cookies_dir / cookie_file
            if cookie_path.exists():
                ydl_opts["cookiefile"] = str(cookie_path)
                logger.info(f"Using cookie file: {cookie_file}")
            else:
                logger.warning(f"Cookie file not found: {cookie_path}")

            proxy = settings.cookie_proxy_map.get(cookie_file)
            if proxy:
                ydl_opts["proxy"] = proxy
                logger.info(f"Using proxy for {cookie_file}: {proxy}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # One entry per unique height — prefer muxed (audio+video) over video-only
        seen_heights: set[int | None] = set()
        resolutions: list[dict] = []
        url: str = ""
        ext: str = ""
        main_resolution: str = ""
        formats = info.get("formats", [])

        # First pass: muxed formats (have both video and audio)
        for fmt in reversed(formats):
            if fmt.get("vcodec") in (None, "none") or fmt.get("acodec") in (None, "none"):
                continue
            height = fmt.get("height")
            if height in seen_heights:
                continue
            seen_heights.add(height)
            url = fmt.get("url")
            ext = fmt.get("ext")
            main_resolution = fmt.get("height")

        # Second pass: video-only formats for heights not covered by muxed
        for fmt in reversed(formats):
            if fmt.get("vcodec") in (None, "none"):
                continue
            if fmt.get("acodec") not in (None, "none"):
                continue
            height = fmt.get("height")
            if height in seen_heights:
                continue
            seen_heights.add(height)
            resolutions.append(
                {
                    "format_id": fmt.get("format_id"),
                    "height": height,
                    "ext": fmt.get("ext"),
                    "fps": fmt.get("fps"),
                    "url": fmt.get("url"),
                    "http_headers": fmt.get("http_headers"),
                }
            )

        resolutions.sort(key=lambda f: f["height"] or 0, reverse=True)

        return {
            "title": info.get("title"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "url": url,
            "ext": ext,
            "main_resolution": main_resolution,
            "resolutions": resolutions,
        }
    except Exception as exc:
        logger.error(f"Failed to get download link: {str(exc)}")
        raise


@router.post("/download", dependencies=[Depends(verify_api_key)])
async def download_video(body: DownloadRequest) -> dict:
    """Download video in up to 4K with audio merged."""

    task = await download_video_task.kiq(body.url, body.res)

    return {"task_id": task.task_id}
