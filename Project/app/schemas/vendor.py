from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional


class VendorCreate(BaseModel):
    VendorCode: str
    VendorName: str
    ContactPerson: Optional[str] = None
    Phone: Optional[str] = None
    Email: Optional[EmailStr] = None
    GSTNumber: Optional[str] = None
    Address: Optional[str] = None
    City: Optional[str] = None
    State: Optional[str] = None
    Country: Optional[str] = None
    PostalCode: Optional[str] = None
    PaymentTerms: Optional[str] = None
    Status: str = "Active"
    CreatedDate: date


class VendorUpdate(BaseModel):
    VendorName: Optional[str] = None
    ContactPerson: Optional[str] = None
    Phone: Optional[str] = None
    Email: Optional[EmailStr] = None
    GSTNumber: Optional[str] = None
    Address: Optional[str] = None
    City: Optional[str] = None
    State: Optional[str] = None
    Country: Optional[str] = None
    PostalCode: Optional[str] = None
    PaymentTerms: Optional[str] = None
    Status: Optional[str] = None


class VendorResponse(BaseModel):
    VendorID: int
    VendorCode: str
    VendorName: str
    ContactPerson: Optional[str]
    Phone: Optional[str]
    Email: Optional[EmailStr]
    GSTNumber: Optional[str]
    Address: Optional[str]
    City: Optional[str]
    State: Optional[str]
    Country: Optional[str]
    PostalCode: Optional[str]
    PaymentTerms: Optional[str]
    Status: str
    CreatedDate: date

    class Config:
        from_attributes = True