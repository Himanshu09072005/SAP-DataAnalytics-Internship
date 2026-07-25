from sqlalchemy import Column, Integer, Date, DECIMAL, Boolean, ForeignKey, String
from app.database import Base


class MaterialVendor(Base):
    __tablename__ = "materialvendors"

    MaterialVendorID = Column(Integer, primary_key=True, index=True)

    MaterialID = Column(
        Integer,
        ForeignKey("materials.MaterialID"),
        nullable=False,
    )

    VendorID = Column(
        Integer,
        ForeignKey("vendors.VendorID"),
        nullable=False,
    )

    PurchasePrice = Column(DECIMAL(10, 2), nullable=False)

    LeadTimeDays = Column(Integer, nullable=False)

    MinimumOrderQty = Column(Integer, nullable=False)

    MaximumOrderQty = Column(Integer)

    PreferredVendor = Column(Boolean, default=False)

    LastPurchaseDate = Column(Date)

    Status = Column(String(20), default="Active")