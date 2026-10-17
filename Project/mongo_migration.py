
import argparse
import asyncio
import json
from datetime import date, datetime
from decimal import Decimal

from bson.decimal128 import Decimal128
from pymongo import ReplaceOne
from sqlalchemy import MetaData, Table, inspect, select, func

from app.database import engine, SessionLocal
from app.mongo import client as mongo_client, database as mongo_db


BATCH_SIZE = 500


def convert_value(value):
    """Convert MySQL values to BSON-compatible values."""
    if isinstance(value, Decimal):
        return Decimal128(value)

    # BSON stores dates as datetimes, so preserve date values at midnight.
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, datetime.min.time())

    if isinstance(value, dict):
        return {key: convert_value(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [convert_value(item) for item in value]

    return value


def discover_tables():
    """Discover every real table in the configured MySQL database."""
    inspector = inspect(engine)
    return sorted(inspector.get_table_names())


def get_table(table_name):
    """Reflect the current MySQL table definition."""
    metadata = MetaData()
    return Table(table_name, metadata, autoload_with=engine)


def make_document(row, primary_key_columns):
    """Preserve the original columns and construct a stable MongoDB _id."""
    document = {
        column: convert_value(value)
        for column, value in row.items()
    }

    if not primary_key_columns:
        raise RuntimeError(
            f"Table '{row}' has no primary key. "
            "Migration stopped rather than inventing an identifier."
        )

    if len(primary_key_columns) == 1:
        pk_name = primary_key_columns[0]
        document["_id"] = document[pk_name]
    else:
        # Stable ID for a composite primary key; original columns remain intact.
        key_values = {
            column: document[column]
            for column in primary_key_columns
        }
        document["_id"] = "composite:" + json.dumps(
            key_values,
            sort_keys=True,
            default=str,
            separators=(",", ":"),
        )

    return document


async def migrate_table(session, table_name, dry_run=False):
    """Migrate a table using upserts, making reruns safe from duplicates."""
    table = get_table(table_name)
    primary_key_columns = [
        column.name for column in table.primary_key.columns
    ]

    if not primary_key_columns:
        raise RuntimeError(
            f"Table '{table_name}' has no primary key. "
            "No documents were written for this table."
        )

    mysql_count = session.execute(
        select(func.count()).select_from(table)
    ).scalar_one()

    print(f"\n[INFO] {table_name}: {mysql_count} MySQL rows")

    if dry_run:
        print(f"[DRY RUN] Would process {mysql_count} rows.")
        return mysql_count

    collection = mongo_db[table_name]
    operations = []
    processed = 0
    upserted = 0
    matched = 0

    result = session.execute(select(table).execution_options(
        stream_results=True
    ))

    for row in result.mappings():
        document = make_document(dict(row), primary_key_columns)

        operations.append(
            ReplaceOne(
                {"_id": document["_id"]},
                document,
                upsert=True,
            )
        )

        if len(operations) >= BATCH_SIZE:
            bulk_result = await collection.bulk_write(
                operations, ordered=True
            )
            processed += len(operations)
            upserted += bulk_result.upserted_count
            matched += bulk_result.matched_count
            operations = []

    if operations:
        bulk_result = await collection.bulk_write(
            operations, ordered=True
        )
        processed += len(operations)
        upserted += bulk_result.upserted_count
        matched += bulk_result.matched_count

    mongo_count = await collection.count_documents({})

    print(
        f"[DONE] {table_name}: processed={processed}, "
        f"new={upserted}, existing_matched={matched}, "
        f"MySQL={mysql_count}, MongoDB={mongo_count}"
    )

    return mysql_count


async def validate_tables(session, table_names):
    """Compare MySQL and MongoDB counts for all discovered tables."""
    print("\n========== VALIDATION REPORT ==========")
    all_match = True

    for table_name in table_names:
        table = get_table(table_name)

        mysql_count = session.execute(
            select(func.count()).select_from(table)
        ).scalar_one()

        mongo_count = await mongo_db[table_name].count_documents({})

        matches = mysql_count == mongo_count
        if not matches:
            all_match = False

        status = "OK" if matches else "MISMATCH"
        print(
            f"{table_name}: MySQL={mysql_count}, "
            f"MongoDB={mongo_count} [{status}]"
        )

    print(
        "\nAll table counts match."
        if all_match
        else "\nSome counts do not match. Investigate before using the data."
    )
    return all_match


async def main():
    parser = argparse.ArgumentParser(
        description="Migrate all MySQL tables to MongoDB Atlas."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report row counts without writing to MongoDB.",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Compare MySQL and MongoDB counts after migration.",
    )
    args = parser.parse_args()

    if mongo_client is None or mongo_db is None:
        raise RuntimeError(
            "MongoDB configuration is missing. Check the existing .env "
            "configuration without sharing its secrets."
        )

    session = SessionLocal()

    try:
        # Fail before writing if either database is unreachable.
        await mongo_client.admin.command("ping")
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        table_names = discover_tables()

        if not table_names:
            raise RuntimeError("No MySQL tables were discovered.")

        print(f"MySQL tables discovered: {len(table_names)}")
        print(f"MongoDB target database: {mongo_db.name}")
        print("Source MySQL data will not be modified or deleted.")

        if not args.dry_run:
            confirmation = input(
                "\nType MIGRATE to write/upsert these tables into "
                "the target MongoDB database: "
            )
            if confirmation != "MIGRATE":
                print("Migration cancelled. No documents were written.")
                return

        for table_name in table_names:
            await migrate_table(
                session,
                table_name,
                dry_run=args.dry_run,
            )

        if args.validate and not args.dry_run:
            await validate_tables(session, table_names)

    finally:
        session.close()
        mongo_client.close()


if __name__ == "__main__":
    asyncio.run(main())
