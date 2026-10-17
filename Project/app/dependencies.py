from typing import AsyncGenerator
from app.mongo import get_database

# Alias for backward compatibility with existing routers that expect `get_db`
async def get_db() -> AsyncGenerator:
    """Yield a Motor database instance.

    FastAPI dependencies can use ``Depends(get_db)`` just like the original
    SQLAlchemy version. The underlying implementation delegates to
    :func:`app.mongo.get_database`.
    """
    async for db in get_database():
        yield db

