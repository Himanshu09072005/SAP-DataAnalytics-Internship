import asyncio
from app.mongo import client, database

async def main():
    if client is None or database is None:
        raise RuntimeError("MongoDB settings are missing from .env")

    try:
        await client.admin.command("ping")
        print("MongoDB connection successful")
        print("Target database:", database.name)
    except Exception as e:
        print("MongoDB connection failed:", type(e).__name__)
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())