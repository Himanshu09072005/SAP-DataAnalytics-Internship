import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.invoices import router as invoice_router
from app.routers.payments import router as payment_router
from app.routers.goods_receipts import router as goods_receipt_router
from app.routers.purchase_orders import router as purchase_order_router
from app.routers.auth import router as auth_router
from app.routers.vendors import router as vendor_router
from app.routers.materials import router as material_router
from app.routers.dashboard import router as dashboard_router
from app.routers.purchase_requisitions import (
    router as purchase_requisition_router,
)

from app.database import engine, Base
from app.seed import run_seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup: create tables then seed default data."""
    logger.info("Startup: creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Startup: tables ready.")
    run_seed()
    logger.info("Startup: complete.")
    yield
    # (shutdown logic can go here if needed)


app = FastAPI(
    title="SAP Procurement System",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the deployed Render frontend and local dev.
# Override ALLOWED_ORIGINS env var on Render if you add more domains.
import os
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://sap-frontend-x0a1.onrender.com,http://localhost:5173,http://127.0.0.1:5173",
)
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vendor_router)
app.include_router(material_router)
app.include_router(purchase_requisition_router)
app.include_router(purchase_order_router)
app.include_router(goods_receipt_router)
app.include_router(invoice_router)
app.include_router(payment_router)
app.include_router(dashboard_router)


@app.get("/")
def home():
    return {
        "message": "SAP Procurement System API is Running",
        "docs": "/docs",
        "version": "1.0.0",
    }
