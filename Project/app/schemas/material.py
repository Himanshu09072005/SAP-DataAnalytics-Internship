from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class MaterialCreate(BaseModel):
    MaterialCode: str
    MaterialName: str
    Category: str
    MaterialType: str
    UnitOfMeasure: str
    UnitPrice: Decimal
    CurrentStock: int
    ReorderLevel: int
    StorageLocation: str
    Plant: str
    Status: str = "Active"
    CreatedDate: date


class MaterialUpdate(BaseModel):
    MaterialName: Optional[str] = None
    Category: Optional[str] = None
    MaterialType: Optional[str] = None
    UnitOfMeasure: Optional[str] = None
    UnitPrice: Optional[Decimal] = None
    CurrentStock: Optional[int] = None
    ReorderLevel: Optional[int] = None
    StorageLocation: Optional[str] = None
    Plant: Optional[str] = None
    Status: Optional[str] = None


class MaterialResponse(BaseModel):
    MaterialID: int
    MaterialCode: str
    MaterialName: str
    Category: str
    MaterialType: str
    UnitOfMeasure: str
    UnitPrice: Decimal
    CurrentStock: int
    ReorderLevel: int
    StorageLocation: str
    Plant: str
    Status: str
    CreatedDate: date

    class Config:
        from_attributes = True