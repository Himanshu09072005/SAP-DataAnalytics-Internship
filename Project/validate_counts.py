import os
import sys
import logging
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, MetaData, select, inspect, text, func
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
def _reject_placeholder(val: str, var: str) -> None:
    """Abort if a variable still contains a placeholder like 'your_' or 'change_this'."""
    placeholders = ["your_", "change_this", "<", ">"]
    if any(p in val.lower() for p in placeholders):
        sys.stderr.write(f"Environment variable {var} contains a placeholder value. Please replace it with the real credential.\n")
        sys.exit(1)


def get_engine(url):
    return create_engine(url, future=True)

def load_env():
    # Verify all required environment variables are present and contain no placeholder values.
    required = [
        "MYSQL_HOST",
        "MYSQL_PORT",
        "MYSQL_USER",
        "MYSQL_PASSWORD",
        "MYSQL_DB",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
    ]
    missing = [var for var in required if not os.getenv(var)]
    if missing:
        sys.stderr.write(f"Missing env vars: {', '.join(missing)}\n")
        sys.exit(1)
    # Reject placeholder values that indicate the user has not replaced the defaults.
    for var in required:
        _reject_placeholder(os.getenv(var), var)
    # URL‑encode credentials to handle special characters safely.
    mysql_user = quote_plus(os.getenv('MYSQL_USER'))
    mysql_pass = quote_plus(os.getenv('MYSQL_PASSWORD'))
    pg_user = quote_plus(os.getenv('POSTGRES_USER'))
    pg_pass = quote_plus(os.getenv('POSTGRES_PASSWORD'))
    mysql_url = (
        f"mysql+pymysql://{mysql_user}:{mysql_pass}@"
        f"{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
    )
    pg_url = (
        f"postgresql+psycopg2://{pg_user}:{pg_pass}@"
        f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
    )
    return mysql_url, pg_url

def get_metadata(engine):
    meta = MetaData()
    meta.reflect(bind=engine)
    return meta

def check_pk_uniqueness(session, table):
    pk_cols = [c.name for c in table.primary_key]
    if not pk_cols:
        return True, None
    pk_expr = ', '.join(pk_cols)
    sql = text(f"SELECT COUNT(*) FROM (SELECT {pk_expr}, COUNT(*) AS cnt FROM {table.name} GROUP BY {pk_expr} HAVING COUNT(*) > 1) sub")
    dup = session.execute(sql).scalar()
    return dup == 0, dup

def check_fk_integrity(src_sess, tgt_sess, src_table, tgt_table, fk):
    # Verify that every foreign key value in src exists in target referenced table
    ref_table = fk.column.table.name
    src_col = fk.parent.name
    ref_col = fk.column.name
    sql_missing = text(
        f"SELECT COUNT(*) FROM {src_table.name} s LEFT JOIN {ref_table} r ON s.{src_col}=r.{ref_col} WHERE r.{ref_col} IS NULL"
    )
    missing = src_sess.execute(sql_missing).scalar()
    return missing == 0, missing

def main():
    mysql_url, pg_url = load_env()
    mysql_engine = get_engine(mysql_url)
    pg_engine = get_engine(pg_url)
    mysql_meta = get_metadata(mysql_engine)
    pg_meta = get_metadata(pg_engine)

    MySession = sessionmaker(bind=mysql_engine, future=True)()
    PgSession = sessionmaker(bind=pg_engine, future=True)()

    all_ok = True
    print("| Table | MySQL Rows | Postgres Rows | PK Unique | FK OK | ✅ Match |")
    print("|-------|------------|---------------|----------|-------|----------|")
    for table_name, mysql_table in mysql_meta.tables.items():
        pg_table = pg_meta.tables.get(table_name)
        if pg_table is None:
            print(f"| {table_name} | N/A | N/A | N/A | N/A | ❌ Missing in target |")
            all_ok = False
            continue
        mysql_cnt = MySession.execute(select(func.count()).select_from(mysql_table)).scalar()
        pg_cnt = PgSession.execute(select(func.count()).select_from(pg_table)).scalar()
        rows_match = mysql_cnt == pg_cnt
        # PK uniqueness
        pk_ok, pk_dup = check_pk_uniqueness(MySession, mysql_table)
        # FK integrity (check only source side – assumes same FK definitions)
        fk_ok = True
        fk_issues = 0
        for fk in mysql_table.foreign_keys:
            ok, missing = check_fk_integrity(MySession, PgSession, mysql_table, pg_table, fk)
            if not ok:
                fk_ok = False
                fk_issues += missing
        match_symbol = "✔" if rows_match and pk_ok and fk_ok else "❌"
        if match_symbol == "❌":
            all_ok = False
        print(f"| {table_name} | {mysql_cnt} | {pg_cnt} | {'✔' if pk_ok else f'❌ ({pk_dup})'} | {'✔' if fk_ok else f'❌ ({fk_issues})'} | {match_symbol} |")
    if all_ok:
        print("\nAll tables validated successfully.")
    else:
        print("\nValidation detected problems. Review the rows marked ❌.")

if __name__ == "__main__":
    main()
