from datetime import datetime
from uuid import UUID, uuid4

import ormar
import sqlalchemy as sa
from databases import Database
from ormar import OrmarConfig

from app.settings import settings

meta = sa.MetaData()
database = Database(str(settings.db_url))

ormar_config = OrmarConfig(metadata=meta, database=database)


class BaseModel:
    id: UUID = ormar.UUID(primary_key=True, default=uuid4)
    created_date: datetime = ormar.DateTime(default=datetime.now)
