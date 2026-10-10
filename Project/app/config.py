from dotenv import load_dotenv
import os
import sys

load_dotenv()

# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------
# DB_TYPE can be "mysql" (default) or "postgres".  In production the
# environment must provide a host for the chosen engine.  SQLite is retained
# only as a convenient local/dev fallback – it will never be used when
# DB_TYPE is "postgres".
DB_TYPE = os.getenv("DB_TYPE", "mysql").lower()

# Common credentials (used for both MySQL and PostgreSQL)
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "sap")

if DB_HOST:
    # An external database is configured.
    if DB_TYPE == "postgres":
        # PostgreSQL connection string (default port 5432)
        DB_PORT = DB_PORT or "5432"
        DATABASE_URL = (
            f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
    else:
        # MySQL / MariaDB connection string (default port 3306)
        DB_PORT = DB_PORT or "3306"
        DATABASE_URL = (
            f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
else:
    # No external DB configured – SQLite is allowed only for development.
    if DB_TYPE == "postgres":
        raise RuntimeError(
            "DB_HOST must be set for PostgreSQL in production. "
            "Set DB_HOST (and optional DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) "
            "or switch DB_TYPE to 'mysql' for a local MySQL instance."
        )
    # SQLite fallback (dev / Render demo)
    if "SQLITE_PATH" in os.environ:
        sqlite_path = os.environ["SQLITE_PATH"]
    elif sys.platform.startswith("win"):
        _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sqlite_dir = os.path.join(_base, "data")
        os.makedirs(sqlite_dir, exist_ok=True)
        sqlite_path = os.path.join(sqlite_dir, "sap_erp.db")
    else:
        sqlite_path = "/tmp/sap_erp.db"
    DATABASE_URL = f"sqlite:///{sqlite_path}"

# ---------------------------------------------------------------------------
# JWT settings (do NOT hard‑code secrets in source control)
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "sap-demo-secret-key-change-in-production-please")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)