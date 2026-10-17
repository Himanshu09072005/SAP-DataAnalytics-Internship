from datetime import date
from decimal import Decimal
from typing import Optional

from app.schemas.base import MongoBaseModel


class PaymentCreate(MongoBaseModel):
    InvoiceID: int
    PaymentMethod: str
    AmountPaid: Decimal
    TransactionReference: str
    Remarks: Optional[str] = None


class PaymentUpdate(MongoBaseModel):
    PaymentMethod: Optional[str] = None
    AmountPaid: Optional[Decimal] = None
    TransactionReference: Optional[str] = None
    Status: Optional[str] = None
    Remarks: Optional[str] = None


class PaymentResponse(MongoBaseModel):
    PaymentID: int
    PaymentNumber: str
    InvoiceID: int
    VendorID: int
    PaymentDate: date
    PaymentMethod: str
    AmountPaid: Decimal
    TransactionReference: str
    Status: str
    Remarks: Optional[str]

    class Config:
        from_attributes = True