from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DECIMAL,
    ForeignKey,
    Enum,
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

    QualityStatus = Column(
        Enum(
            "Accepted",
            "Rejected",
            "Partially Accepted",
            name="quality_status_enum",
        ),
        default="Accepted",
    )

    WarehouseLocation = Column(
        Enum(
            "Warehouse-A",
            "Warehouse-B",
            "Warehouse-C",
            name="warehouse_location_enum",
        )
    )

    Status = Column(
        Enum(
            "Completed",
            "Pending Inspection",
            name="goods_receipt_status_enum",
        ),
        default="Completed",
    )

    Remarks = Column(String(255))