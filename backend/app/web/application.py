from importlib import metadata

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.log import configure_logging
from app.settings import settings
from app.web.api.router import api_router
from app.web.lifespan import lifespan_setup

settings.download_dir.mkdir(parents=True, exist_ok=True)


def get_app() -> FastAPI:
    """
    Get FastAPI application.

    This is the main constructor of an application.

    :return: application.
    """
    configure_logging()

    app = FastAPI(
        title="downloader",
        version=metadata.version("downloader"),
        lifespan=lifespan_setup,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        default_response_class=ORJSONResponse,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Main router for the API.
    app.include_router(router=api_router, prefix="/api")

    # Serve downloaded videos as static files
    app.mount("/videos", StaticFiles(directory=settings.download_dir), name="videos")

    return app
