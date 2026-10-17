from app.schemas.base import MongoBaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class PurchaseOrderCreate(MongoBaseModel):
    PRID: int
    ExpectedDeliveryDate: date
    PaymentTerms: Optional[str] = None
    Remarks: Optional[str] = None


class PurchaseOrderUpdate(MongoBaseModel):
    ExpectedDeliveryDate: Optional[date] = None
    Status: Optional[str] = None
    PaymentTerms: Optional[str] = None
    Remarks: Optional[str] = None


class PurchaseOrderResponse(MongoBaseModel):
    POID: int
    PONumber: str
    PRID: int
    VendorID: int
    UserID: int
    OrderDate: date
    ExpectedDeliveryDate: date
    TotalAmount: Decimal
    Status: str
    PaymentTerms: Optional[str]
    Remarks: Optional[str]

    class Config:
        from_attributes = True