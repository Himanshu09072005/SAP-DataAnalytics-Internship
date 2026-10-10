import os
import sys
from urllib.parse import quote_plus
import logging
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, MetaData, Table, select, text, func
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_engine(db_url: str) -> Engine:
    """Create a SQLAlchemy engine with future flag enabled."""
    return create_engine(db_url, future=True)

def _reject_placeholder(val: str, var: str) -> None:
    """Abort if a variable still contains a placeholder like 'your_' or 'change_this'."""
    placeholders = ["your_", "change_this", "<", ">"]
    if any(p in val.lower() for p in placeholders):
        sys.stderr.write(f"Environment variable {var} contains a placeholder value. Please replace it with the real credential.\n")
        sys.exit(1)

def load_env():
    required = [
        "MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DB",
        "POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB",
    ]
    missing = []
    for var in required:
        val = os.getenv(var)
        if not val:
            missing.append(var)
        else:
            _reject_placeholder(val, var)
    if missing:
        sys.stderr.write(f"Missing environment variables: {', '.join(missing)}\n")
        sys.exit(1)
    mysql_user = quote_plus(os.getenv('MYSQL_USER'))
    mysql_password = quote_plus(os.getenv('MYSQL_PASSWORD'))
    mysql_url = (
        f"mysql+pymysql://{mysql_user}:{mysql_password}@"
        f"{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
    )
    pg_user = quote_plus(os.getenv('POSTGRES_USER'))
    pg_password = quote_plus(os.getenv('POSTGRES_PASSWORD'))
    postgres_url = (
        f"postgresql+psycopg2://{pg_user}:{pg_password}@"
        f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
    )
    return mysql_url, postgres_url

def reflect_metadata(engine: Engine) -> MetaData:
    meta = MetaData()
    meta.reflect(bind=engine)
    return meta

def copy_table(source_table: Table, target_table: Table, src_sess, tgt_sess) -> int:
    """Copy all rows from source_table to target_table.
    Returns the number of rows inserted.
    """
    rows = src_sess.execute(select(source_table)).fetchall()
    if not rows:
        return 0
    data = [dict(row) for row in rows]
    tgt_sess.execute(target_table.insert(), data)
    tgt_sess.commit()
    return len(data)

def reset_postgres_sequences(engine: Engine, meta: MetaData) -> None:
    """Reset identity/sequence values for PostgreSQL tables that use SERIAL/Identity.
    Ensures next INSERT picks a value greater than any existing PK.
    """
    with engine.connect() as conn:
        for table in meta.sorted_tables:
            pk_cols = [c for c in table.primary_key.columns]
            if not pk_cols:
                continue
            col = pk_cols[0]
            # Only handle integer primary keys
            if not getattr(col.type, "python_type", None) is int:
                continue
            seq_sql = text(f"SELECT pg_get_serial_sequence('{table.name}', '{col.name}')")
            seq_name = conn.execute(seq_sql).scalar()
            if not seq_name:
                continue
            max_sql = text(f"SELECT max({col.name}) FROM {table.name}")
            max_val = conn.execute(max_sql).scalar() or 0
            set_sql = text(f"SELECT setval('{seq_name}', :next_val, true)")
            conn.execute(set_sql, {"next_val": max_val + 1})
        conn.commit()

def main():
    mysql_url, pg_url = load_env()
    mysql_engine = get_engine(mysql_url)
    pg_engine = get_engine(pg_url)

    mysql_meta = reflect_metadata(mysql_engine)
    pg_meta = reflect_metadata(pg_engine)

    # Ensure target has all tables (create missing ones). This respects foreign keys.
    mysql_meta.create_all(pg_engine, checkfirst=True)
    pg_meta.reflect(bind=pg_engine)  # refresh after creation

    MySession = sessionmaker(bind=mysql_engine, future=True)()
    PgSession = sessionmaker(bind=pg_engine, future=True)()

    total_copied = 0
    for table in mysql_meta.sorted_tables:
        table_name = table.name
        target_table = pg_meta.tables.get(table_name)
        if target_table is None:
            logger.error(f"Target table {table_name} was not created in PostgreSQL. Aborting.")
            sys.exit(1)
        # Row counts
        src_cnt = MySession.execute(select(func.count()).select_from(table)).scalar()
        tgt_cnt = PgSession.execute(select(func.count()).select_from(target_table)).scalar()
        if tgt_cnt == src_cnt:
            logger.info(f"Table {table_name} already fully migrated ({src_cnt} rows). Skipping.")
            continue
        if tgt_cnt != 0 and tgt_cnt < src_cnt:
            logger.error(
                f"Partial data detected in target table {table_name}: {tgt_cnt}/{src_cnt} rows. Manual intervention required."
            )
            sys.exit(1)
        copied = copy_table(table, target_table, MySession, PgSession)
        logger.info(f"Copied {copied} rows into {table_name}")
        total_copied += copied

    reset_postgres_sequences(pg_engine, pg_meta)
    logger.info(f"Migration completed successfully. Total rows copied: {total_copied}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        logger.exception("Migration failed: %s", exc)
        sys.exit(1)
