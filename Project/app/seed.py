"""
seed.py — Database initialization and default data seeding.

Called once at application startup (from main.py) after tables are created.
Safe to call on every restart: checks existence before inserting.
"""

import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.security import hash_password

logger = logging.getLogger(__name__)


def seed_default_admin() -> None:
    """
    Ensure the default administrator account exists in the database.

    Credentials:
        Username : himanshu
        Password : Admin@123  (stored as bcrypt hash — NEVER plaintext)
        Role     : Admin
        Status   : Active

    This function is idempotent:
    - If the user already exists, it does nothing (no password overwrite).
    - If the user does not exist, it creates it with a hashed password.
    """
    db: Session = SessionLocal()
    try:
        existing = (
            db.query(User)
            .filter(User.Username == "himanshu")
            .first()
        )
        if existing:
            logger.info(
                "Seed: default admin 'himanshu' already exists — skipping creation."
            )
            return

        admin = User(
            FullName="Himanshu Patil",
            Username="himanshu",
            Password=hash_password("Admin@123"),
            Email="himanshu.patil@sap-erp.example",
            Role="Admin",
            Department="Administration",
            Phone=None,
            Status="Active",
        )
        db.add(admin)
        db.commit()
        logger.info(
            "Seed: default admin 'himanshu' created successfully."
        )
    except Exception as exc:
        db.rollback()
        logger.error("Seed: failed to create default admin user: %s", exc)
        raise
    finally:
        db.close()


def run_seed() -> None:
    """Entry point called from main.py startup."""
    logger.info("Seed: running startup database seeding...")
    seed_default_admin()
    logger.info("Seed: completed.")
