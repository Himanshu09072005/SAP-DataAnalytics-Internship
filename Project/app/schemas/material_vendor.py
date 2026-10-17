from app.schemas.base import MongoBaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class MaterialVendorCreate(MongoBaseModel):
    MaterialID: int
    VendorID: int
    PurchasePrice: Decimal
    LeadTimeDays: int
    MinimumOrderQty: int
    MaximumOrderQty: Optional[int] = None
    PreferredVendor: bool = False
    LastPurchaseDate: Optional[date] = None
    Status: str = "Active"


class MaterialVendorUpdate(MongoBaseModel):
    PurchasePrice: Optional[Decimal] = None
    LeadTimeDays: Optional[int] = None
    MinimumOrderQty: Optional[int] = None
    MaximumOrderQty: Optional[int] = None
    PreferredVendor: Optional[bool] = None
    LastPurchaseDate: Optional[date] = None
    Status: Optional[str] = None


class MaterialVendorResponse(MongoBaseModel):
    MaterialVendorID: int
    MaterialID: int
    VendorID: int
    PurchasePrice: Decimal
    LeadTimeDays: int
    MinimumOrderQty: int
    MaximumOrderQty: Optional[int]
    PreferredVendor: bool
    LastPurchaseDate: Optional[date]
    Status: str

    class Config:
        from_attributes = True