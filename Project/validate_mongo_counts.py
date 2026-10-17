
import asyncio
from dotenv import load_dotenv
from sqlalchemy import func, select, inspect
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app.mongo import get_database, client as mongo_client

# Import model modules so SQLAlchemy registers their tables.
import app.models.user
import app.models.vendor
import app.models.material
import app.models.material_vendor
import app.models.purchase_requisition
import app.models.purchase_order
import app.models.goods_receipt
import app.models.invoice
import app.models.payment

load_dotenv()


async def main():
    session: Session | None = None
    db_generator = get_database()

    try:
        session = SessionLocal()
        db = await anext(db_generator)

        # Actual tables in the configured relational database.
        actual_tables = set(inspect(engine).get_table_names())
        model_tables = set(Base.metadata.tables.keys())

        print("\nValidation Report (MySQL rows vs MongoDB documents)")
        print(f"Relational tables found: {len(actual_tables)}")
        print(f"Tables registered in SQLAlchemy: {len(model_tables)}")

        if not actual_tables:
            print("ERROR: No relational tables found. Check DATABASE_URL.")
            return

        if not model_tables:
            print("ERROR: No SQLAlchemy model tables registered.")
            return

        missing_models = sorted(actual_tables - model_tables)
        if missing_models:
            print("\nTables without registered SQLAlchemy models:")
            for name in missing_models:
                print(f"  {name} (not checked)")

        print("\nCount comparison:")
        for table_name in sorted(actual_tables & model_tables):
            table = Base.metadata.tables[table_name]
            mysql_count = session.execute(
                select(func.count()).select_from(table)
            ).scalar_one()

            mongo_count = await db[table_name].count_documents({})
            status = "MATCH" if mysql_count == mongo_count else "MISMATCH"

            print(
                f"{table_name}: MySQL={mysql_count}, "
                f"MongoDB={mongo_count} [{status}]"
            )

    finally:
        if session is not None:
            session.close()

        await db_generator.aclose()

        if mongo_client is not None:
            mongo_client.close()


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
