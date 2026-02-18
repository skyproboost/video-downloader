from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

# TODO: restore when DB is needed
# from app.db.base import database
from app.services.redis.lifespan import init_redis, shutdown_redis
from app.tasks.broker import broker


@asynccontextmanager
async def lifespan_setup(
    app: FastAPI,
) -> AsyncGenerator[None, None]:  # pragma: no cover
    """
    Actions to run on application startup.

    This function uses fastAPI app to store data
    in the state, such as db_engine.

    :param app: the fastAPI application.
    :return: function that actually performs actions.
    """

    app.middleware_stack = None
    # TODO: restore when DB is needed
    # await database.connect()
    init_redis(app)
    if not broker.is_worker_process:
        await broker.startup()
    app.middleware_stack = app.build_middleware_stack()

    yield
    if not broker.is_worker_process:
        await broker.shutdown()
    # TODO: restore when DB is needed
    # await database.disconnect()
    await shutdown_redis(app)
