from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.goods_receipt import GoodsReceipt
from app.models.invoice import Invoice
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


def generate_invoice_number(db: Session):
    last = (
        db.query(Invoice)
        .order_by(Invoice.InvoiceID.desc())
        .first()
    )

    if last:
        number = int(last.InvoiceNumber.replace("INV", ""))
        return f"INV{number + 1:04d}"

    return "INV0001"


@router.post("/", response_model=InvoiceResponse)
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    goods_receipt = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.GRID == invoice.GRID)
        .first()
    )

    if not goods_receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods Receipt not found",
        )

    if goods_receipt.Status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Invoice can only be created for Completed Goods Receipts.",
        )

    existing_invoice = (
        db.query(Invoice)
        .filter(Invoice.GRID == invoice.GRID)
        .first()
    )

    if existing_invoice:
        raise HTTPException(
            status_code=400,
            detail="Invoice already exists for this Goods Receipt.",
        )

    total_amount = (
        Decimal(invoice.InvoiceAmount)
        + Decimal(invoice.GSTAmount)
    )

    new_invoice = Invoice(
        InvoiceNumber=generate_invoice_number(db),
        GRID=goods_receipt.GRID,
        POID=goods_receipt.POID,
        VendorID=goods_receipt.VendorID,
        InvoiceDate=date.today(),
        InvoiceAmount=invoice.InvoiceAmount,
        GSTAmount=invoice.GSTAmount,
        TotalAmount=total_amount,
        PaymentStatus="Pending",
        Remarks=invoice.Remarks,
    )

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)

    return new_invoice


@router.get("/", response_model=list[InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(Invoice).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_update: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    update_data = invoice_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(invoice, key, value)

    invoice.TotalAmount = (
        Decimal(invoice.InvoiceAmount)
        + Decimal(invoice.GSTAmount)
    )

    db.commit()
    db.refresh(invoice)

    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.InvoiceID == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    db.delete(invoice)
    db.commit()

    return {
        "message": "Invoice deleted successfully"
    }