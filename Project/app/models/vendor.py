from sqlalchemy import Column, Integer, String, Date

from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    VendorID = Column(Integer, primary_key=True, index=True)

    VendorCode = Column(String(10), unique=True, nullable=False)

    VendorName = Column(String(100), nullable=False)

    ContactPerson = Column(String(100))

    Phone = Column(String(15))

    Email = Column(String(100), unique=True)

    GSTNumber = Column(String(20))

    Address = Column(String(255))

    City = Column(String(50))

    State = Column(String(50))

    Country = Column(String(50))

    PostalCode = Column(String(10))

    PaymentTerms = Column(String(100))

    Status = Column(String(20), default="Active")

    CreatedDate = Column(Date)