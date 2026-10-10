from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DECIMAL,
    ForeignKey,
)

from app.database import Base


class GoodsReceipt(Base):
    __tablename__ = "goodsreceipts"

    GRID = Column(Integer, primary_key=True, index=True)

    GRNumber = Column(String(20), unique=True, nullable=False)

    POID = Column(
        Integer,
        ForeignKey("purchaseorders.POID"),
        nullable=False,
    )

    VendorID = Column(
        Integer,
        ForeignKey("vendors.VendorID"),
        nullable=False,
    )

    ReceivedBy = Column(
        Integer,
        ForeignKey("users.UserID"),
        nullable=False,
    )

    ReceiptDate = Column(Date, nullable=False)

    QuantityReceived = Column(DECIMAL(10, 2), nullable=False)

    # QualityStatus: Accepted, Rejected, Partially Accepted
    QualityStatus = Column(String(30), default="Accepted")

    # WarehouseLocation: Warehouse-A, Warehouse-B, Warehouse-C
    WarehouseLocation = Column(String(30))

    # Status: Completed, Pending Inspection
    Status = Column(String(30), default="Completed")

    Remarks = Column(String(255))
