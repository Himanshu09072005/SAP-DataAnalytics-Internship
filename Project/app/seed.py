"""
Async seed implementation for MongoDB.
"""
import logging
from app.mongo import get_database
from app.security import hash_password

logger = logging.getLogger(__name__)

async def _ensure_admin(db):
    """Create default admin user if it does not exist."""
    existing = await db["users"].find_one({"Username": "himanshu"})
    if existing:
        logger.info("Seed: default admin already exists — skipping.")
        return
    admin = {
        "FullName": "Himanshu Patil",
        "Username": "himanshu",
        "Password": hash_password("Admin@123"),
        "Email": "himanshu.patil@sap-erp.example",
        "Role": "Admin",
        "Department": "Administration",
        "Phone": None,
        "Status": "Active",
    }
    result = await db["users"].insert_one(admin)
    logger.info("Seed: default admin created with _id=%s", result.inserted_id)

async def _ensure_indexes(db):
    """Create required unique indexes for fast look‑ups.

    This function is idempotent – MongoDB will ignore existing indexes.
    """
    # Users: unique username and email
    await db["users"].create_index("Username", unique=True)
    await db["users"].create_index("Email", unique=True)
    # Vendors: unique vendor code
    await db["vendors"].create_index("VendorCode", unique=True)
    # Materials: ensure MaterialID is indexed (optional uniqueness depending on source)
    await db["materials"].create_index("MaterialID")
    # Additional collections can have indexes added here as needed

async def run_seed() -> None:
    """Entry point called from FastAPI startup. Executes async seeding.
    """
    logger.info("Seed: starting async database seeding...")
    async for db in get_database():
        await _ensure_admin(db)
        await _ensure_indexes(db)
    logger.info("Seed: completed.")
