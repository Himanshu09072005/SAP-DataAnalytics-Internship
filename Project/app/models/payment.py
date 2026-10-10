from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DECIMAL,
    ForeignKey,
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

    # PaymentMethod: Bank Transfer, Cheque, UPI, NEFT, RTGS
    PaymentMethod = Column(String(30), nullable=False)

    AmountPaid = Column(
        DECIMAL(12, 2),
        nullable=False,
    )

    TransactionReference = Column(
        String(50),
        unique=True,
        nullable=False,
    )

    # Status: Completed, Failed, Processing
    Status = Column(String(20), nullable=False, default="Completed")

    Remarks = Column(String(255))
