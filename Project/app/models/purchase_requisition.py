from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DECIMAL,
    ForeignKey,
)

from app.database import Base


class PurchaseRequisition(Base):
    __tablename__ = "purchaserequisitions"

    PRID = Column(Integer, primary_key=True, index=True)

    PRNumber = Column(String(20), unique=True, nullable=False)

    MaterialID = Column(
        Integer,
        ForeignKey("materials.MaterialID"),
        nullable=False
    )

    VendorID = Column(
        Integer,
        ForeignKey("vendors.VendorID"),
        nullable=False
    )

    UserID = Column(
        Integer,
        ForeignKey("users.UserID"),
        nullable=False
    )

    Quantity = Column(DECIMAL(10, 2), nullable=False)

    UnitPrice = Column(DECIMAL(10, 2), nullable=False)

    TotalAmount = Column(DECIMAL(12, 2), nullable=False)

    Priority = Column(String(20), nullable=False)

    Status = Column(
        String(20),
        nullable=False,
        default="Pending"
    )

    RequestDate = Column(Date, nullable=False)

    RequiredDate = Column(Date, nullable=False)

    Remarks = Column(String(255))