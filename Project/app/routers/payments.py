from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment
from app.models.invoice import Invoice
from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


def generate_payment_number(db: Session):
    last = (
        db.query(Payment)
        .order_by(Payment.PaymentID.desc())
        .first()
    )

    if last:
        number = int(last.PaymentNumber.replace("PAY", ""))
        return f"PAY{number + 1:04d}"

    return "PAY0001"


def update_invoice_payment_status(db: Session, invoice: Invoice):
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.AmountPaid), 0))
        .filter(
            Payment.InvoiceID == invoice.InvoiceID,
            Payment.Status == "Completed",
        )
        .scalar()
    )

    total_paid = Decimal(total_paid)

    if total_paid <= Decimal("0.00"):
        invoice.PaymentStatus = "Pending"

    elif total_paid < Decimal(invoice.TotalAmount):
        invoice.PaymentStatus = "Partially Paid"

    else:
        invoice.PaymentStatus = "Paid"

    db.flush()


@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == payment.InvoiceID)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    if invoice.PaymentStatus == "Paid":
        raise HTTPException(
            status_code=400,
            detail="Invoice is already fully paid.",
        )

    existing_reference = (
        db.query(Payment)
        .filter(
            Payment.TransactionReference ==
            payment.TransactionReference
        )
        .first()
    )

    if existing_reference:
        raise HTTPException(
            status_code=400,
            detail="Transaction Reference already exists.",
        )

    total_paid = (
        db.query(func.coalesce(func.sum(Payment.AmountPaid), 0))
        .filter(
            Payment.InvoiceID == payment.InvoiceID,
            Payment.Status == "Completed",
        )
        .scalar()
    )

    total_paid = Decimal(total_paid)

    remaining = Decimal(invoice.TotalAmount) - total_paid

    if Decimal(payment.AmountPaid) > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds remaining balance ({remaining}).",
        )

    new_payment = Payment(
        PaymentNumber=generate_payment_number(db),
        InvoiceID=invoice.InvoiceID,
        VendorID=invoice.VendorID,
        PaymentDate=date.today(),
        PaymentMethod=payment.PaymentMethod,
        AmountPaid=payment.AmountPaid,
        TransactionReference=payment.TransactionReference,
        Status="Completed",
        Remarks=payment.Remarks,
    )

    db.add(new_payment)
    db.flush()

    update_invoice_payment_status(db, invoice)

    db.commit()
    db.refresh(new_payment)

    return new_payment


@router.get("/", response_model=list[PaymentResponse])
def get_payments(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(Payment).all()


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(Payment.PaymentID == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(Payment.PaymentID == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == payment.InvoiceID)
        .first()
    )

    update_data = payment_update.model_dump(exclude_unset=True)

    if (
        "TransactionReference" in update_data
        and update_data["TransactionReference"] != payment.TransactionReference
    ):
        exists = (
            db.query(Payment)
            .filter(
                Payment.TransactionReference ==
                update_data["TransactionReference"],
                Payment.PaymentID != payment.PaymentID,
            )
            .first()
        )

        if exists:
            raise HTTPException(
                status_code=400,
                detail="Transaction Reference already exists.",
            )

    for key, value in update_data.items():
        setattr(payment, key, value)

    db.flush()

    update_invoice_payment_status(db, invoice)

    db.commit()
    db.refresh(payment)

    return payment


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(Payment.PaymentID == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == payment.InvoiceID)
        .first()
    )

    db.delete(payment)
    db.flush()

    update_invoice_payment_status(db, invoice)

    db.commit()

    return {
        "message": "Payment deleted successfully"
    }