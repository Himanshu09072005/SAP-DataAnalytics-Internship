from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class GoodsReceiptCreate(BaseModel):
    POID: int
    QuantityReceived: Decimal
    QualityStatus: str = "Accepted"
    WarehouseLocation: Optional[str] = None
    Status: str = "Completed"
    Remarks: Optional[str] = None


class GoodsReceiptUpdate(BaseModel):
    QualityStatus: Optional[str] = None
    WarehouseLocation: Optional[str] = None
    Status: Optional[str] = None
    Remarks: Optional[str] = None


class GoodsReceiptResponse(BaseModel):
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