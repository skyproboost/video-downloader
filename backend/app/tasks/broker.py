from taskiq import TaskiqScheduler, TaskiqState
from taskiq_redis import (
    RedisScheduleSource,
    RedisStreamBroker,
)

from app.settings import settings

redis_source = RedisScheduleSource(str(settings.redis_url))
broker = RedisStreamBroker(
    url=str(settings.redis_url),
)
scheduler = TaskiqScheduler(broker, sources=[redis_source])


@broker.on_event("startup")
async def setup_logging(_state: TaskiqState) -> None:
    from app.log import configure_logging

    configure_logging()


__all__ = ["broker", "scheduler"]
