from datetime import date
from decimal import Decimal
from typing import Optional

from app.schemas.base import MongoBaseModel


class GoodsReceiptCreate(MongoBaseModel):
    POID: int
    QuantityReceived: Decimal
    QualityStatus: str = "Accepted"
    WarehouseLocation: Optional[str] = None
    Status: str = "Completed"
    Remarks: Optional[str] = None


class GoodsReceiptUpdate(MongoBaseModel):
    QualityStatus: Optional[str] = None
    WarehouseLocation: Optional[str] = None
    Status: Optional[str] = None
    Remarks: Optional[str] = None


class GoodsReceiptResponse(MongoBaseModel):
    GRID: int
    GRNumber: str
    POID: int
    VendorID: int
    ReceivedBy: int
    ReceiptDate: date
    QuantityReceived: Decimal
    QualityStatus: str
    WarehouseLocation: Optional[str]
    Status: str
    Remarks: Optional[str]

    class Config:
        from_attributes = True