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


class Payment(Base):
    __tablename__ = "payments"

    PaymentID = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    PaymentNumber = Column(
        String(20),
        unique=True,
        nullable=False,
    )

    InvoiceID = Column(
        Integer,
        ForeignKey("invoices.InvoiceID"),
        nullable=False,
    )

    VendorID = Column(
        Integer,
        ForeignKey("vendors.VendorID"),
        nullable=False,
    )

    PaymentDate = Column(
        Date,
        nullable=False,
    )

    PaymentMethod = Column(
        Enum(
            "Bank Transfer",
            "Cheque",
            "UPI",
            "NEFT",
            "RTGS",
            name="payment_method_enum",
        ),
        nullable=False,
    )

    AmountPaid = Column(
        DECIMAL(12, 2),
        nullable=False,
    )

    TransactionReference = Column(
        String(50),
        unique=True,
        nullable=False,
    )

    Status = Column(
        Enum(
            "Completed",
            "Failed",
            "Processing",
            name="payment_status_enum",
        ),
        nullable=False,
        default="Completed",
    )

    Remarks = Column(String(255))