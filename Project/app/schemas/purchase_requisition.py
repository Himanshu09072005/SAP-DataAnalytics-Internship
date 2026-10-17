from app.schemas.base import MongoBaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class PurchaseRequisitionCreate(MongoBaseModel):
    MaterialID: int
    VendorID: int
    Quantity: Decimal
    UnitPrice: Decimal
    Priority: str
    RequestDate: date
    RequiredDate: date
    Remarks: Optional[str] = None


class PurchaseRequisitionUpdate(MongoBaseModel):
    MaterialID: Optional[int] = None
    VendorID: Optional[int] = None
    Quantity: Optional[Decimal] = None
    UnitPrice: Optional[Decimal] = None
    Priority: Optional[str] = None
    Status: Optional[str] = None
    RequestDate: Optional[date] = None
    RequiredDate: Optional[date] = None
    Remarks: Optional[str] = None


class PurchaseRequisitionResponse(MongoBaseModel):
    PRID: int
    PRNumber: str
    MaterialID: int
    VendorID: int
    UserID: int
    Quantity: Decimal
    UnitPrice: Decimal
    TotalAmount: Decimal
    Priority: str
    Status: str
    RequestDate: date
    RequiredDate: date
    Remarks: Optional[str]

    class Config:
        from_attributes = True