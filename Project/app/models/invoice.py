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


class Invoice(Base):
    __tablename__ = "invoices"

    InvoiceID = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    InvoiceNumber = Column(
        String(20),
        unique=True,
        nullable=False,
    )

    GRID = Column(
        Integer,
        ForeignKey("goodsreceipts.GRID"),
        nullable=False,
    )

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

    InvoiceDate = Column(
        Date,
        nullable=False,
    )

    InvoiceAmount = Column(
        DECIMAL(12, 2),
        nullable=False,
    )

    GSTAmount = Column(
        DECIMAL(12, 2),
        nullable=False,
    )

    TotalAmount = Column(
        DECIMAL(12, 2),
        nullable=False,
    )

    PaymentStatus = Column(
        Enum(
            "Pending",
            "Paid",
            "Partially Paid",
            name="payment_status_enum",
        ),
        default="Pending",
    )

    Remarks = Column(String(255))