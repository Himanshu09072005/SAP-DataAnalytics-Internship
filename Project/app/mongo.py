
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from typing import AsyncGenerator

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE")

if not MONGODB_URI or not MONGODB_DATABASE:
    client = None
    database = None
else:
    # Use the connection URI exactly as configured in .env.
    # URL-encode special characters in the username/password in .env.
    client = AsyncIOMotorClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,
    )
    database = client[MONGODB_DATABASE]


async def get_database() -> AsyncGenerator:
    if database is None:
        raise RuntimeError(
            "MongoDB configuration missing. "
            "Set MONGODB_URI and MONGODB_DATABASE in .env."
        )

    yield database
