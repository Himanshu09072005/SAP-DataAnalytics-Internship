from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DECIMAL,
    ForeignKey,
)

from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchaseorders"

    POID = Column(Integer, primary_key=True, index=True)

    PONumber = Column(String(20), unique=True, nullable=False)

    PRID = Column(
        Integer,
        ForeignKey("purchaserequisitions.PRID"),
        nullable=False,
    )

    VendorID = Column(
        Integer,
        ForeignKey("vendors.VendorID"),
        nullable=False,
    )

    UserID = Column(
        Integer,
        ForeignKey("users.UserID"),
        nullable=False,
    )

    OrderDate = Column(Date, nullable=False)

    ExpectedDeliveryDate = Column(Date, nullable=False)

    TotalAmount = Column(DECIMAL(12, 2), nullable=False)

    Status = Column(
        String(30),
        nullable=False,
        default="Open",
    )

    PaymentTerms = Column(String(100))

    Remarks = Column(String(255))