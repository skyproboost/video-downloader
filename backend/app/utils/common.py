from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.settings import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Verify the API key from the request header."""
    if api_key is None or api_key != settings.download_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key