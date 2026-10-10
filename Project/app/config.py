from dotenv import load_dotenv
import os
import sys

load_dotenv()

# MySQL/PostgreSQL credentials (used only if DB_HOST is explicitly set)
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "sap")

if DB_HOST:
    # Use MySQL/PostgreSQL when explicitly configured via DB_HOST env var
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Default: SQLite
    # SQLITE_PATH env var overrides all (useful for Render: set to /tmp/sap_erp.db)
    if "SQLITE_PATH" in os.environ:
        sqlite_path = os.environ["SQLITE_PATH"]
    elif sys.platform.startswith("win"):
        # Windows local development: create a data/ folder beside the Project directory
        _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sqlite_dir = os.path.join(_base, "data")
        os.makedirs(sqlite_dir, exist_ok=True)
        sqlite_path = os.path.join(sqlite_dir, "sap_erp.db")
    else:
        # Linux / macOS / Render (free tier): /tmp is always writable
        # NOTE: /tmp is ephemeral on Render — data resets after restart/redeploy.
        # This is acceptable for an internship/demo deployment.
        sqlite_path = "/tmp/sap_erp.db"

    DATABASE_URL = f"sqlite:///{sqlite_path}"

SECRET_KEY = os.getenv("SECRET_KEY", "sap-demo-secret-key-change-in-production-please")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))