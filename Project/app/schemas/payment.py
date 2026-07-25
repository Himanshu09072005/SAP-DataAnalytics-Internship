from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    InvoiceID: int
    PaymentMethod: str
    AmountPaid: Decimal
    TransactionReference: str
    Remarks: Optional[str] = None


class PaymentUpdate(BaseModel):
    PaymentMethod: Optional[str] = None
    AmountPaid: Optional[Decimal] = None
    TransactionReference: Optional[str] = None
    Status: Optional[str] = None
    Remarks: Optional[str] = None


class PaymentResponse(BaseModel):
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