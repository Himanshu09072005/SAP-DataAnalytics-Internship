import asyncio
from app.mongo import client, database

async def main():
    if client is None or database is None:
        raise RuntimeError("MongoDB configuration is missing")

    try:
        await client.admin.command("ping")

        print("Database:", database.name)
        collections = await database.list_collection_names()

        if not collections:
            print("No collections found.")
            return

        print("\nCollections and document counts:")
        for name in sorted(collections):
            count = await database[name].count_documents({})
            print(f"{name}: {count}")

    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())