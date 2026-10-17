from datetime import date
from decimal import Decimal
from typing import Optional

from app.schemas.base import MongoBaseModel


class InvoiceCreate(MongoBaseModel):
    GRID: int
    InvoiceAmount: Decimal
    GSTAmount: Decimal
    Remarks: Optional[str] = None


class InvoiceUpdate(MongoBaseModel):
    InvoiceAmount: Optional[Decimal] = None
    GSTAmount: Optional[Decimal] = None
    PaymentStatus: Optional[str] = None
    Remarks: Optional[str] = None


class InvoiceResponse(MongoBaseModel):
    InvoiceID: int
    InvoiceNumber: str
    GRID: int
    POID: int
    VendorID: int
    InvoiceDate: date
    InvoiceAmount: Decimal
    GSTAmount: Decimal
    TotalAmount: Decimal
    PaymentStatus: str
    Remarks: Optional[str]

    class Config:
        from_attributes = True