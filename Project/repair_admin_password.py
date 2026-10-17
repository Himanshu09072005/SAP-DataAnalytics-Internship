
import asyncio

from app.mongo import client, database
from app.security import hash_password, verify_password


async def main():
    if client is None or database is None:
        raise RuntimeError("MongoDB configuration is missing.")

    username = "himanshu"
    new_password = "Admin@123"

    try:
        await client.admin.command("ping")

        user = await database["users"].find_one(
            {"Username": username}
        )

        if user is None:
            raise RuntimeError(
                f"User '{username}' was not found in MongoDB."
            )

        new_hash = hash_password(new_password)

        result = await database["users"].update_one(
            {
                "_id": user["_id"],
                "Username": username,
            },
            {"$set": {"Password": new_hash}},
        )

        updated_user = await database["users"].find_one(
            {"_id": user["_id"]}
        )

        if not updated_user or not verify_password(
            new_password, updated_user["Password"]
        ):
            raise RuntimeError("Password hash verification failed.")

        print(f"Password hash repaired for user '{username}'.")
        print("Verification: successful.")
        print(f"Modified documents: {result.modified_count}")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

