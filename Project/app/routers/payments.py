import logging
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_db
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.security import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

# Helper to generate next payment number
async def generate_payment_number(db):
    last = await db["payments"].find_one(sort=[("PaymentNumber", -1)])
    if last and "PaymentNumber" in last:
        try:
            number = int(last["PaymentNumber"].replace("PAY", ""))
            return f"PAY{number + 1:04d}"
        except Exception:
            logger.exception("Failed to parse PaymentNumber, resetting to PAY0001")
    return "PAY0001"

# Update invoice payment status based on payments collection
async def update_invoice_payment_status(db, invoice_id, total_amount):
    pipeline = [
        {"$match": {"InvoiceID": invoice_id, "Status": "Completed"}},
        {"$group": {"_id": None, "total_paid": {"$sum": "$AmountPaid"}}},
    ]
    agg = await db["payments"].aggregate(pipeline).to_list(length=1)
    total_paid = Decimal(agg[0]["total_paid"] if agg else 0)
    if total_paid <= Decimal("0.00"):
        status = "Pending"
    elif total_paid < Decimal(str(total_amount)):
        status = "Partially Paid"
    else:
        status = "Paid"
    await db["invoices"].update_one({"InvoiceID": invoice_id}, {"$set": {"PaymentStatus": status}})
    return status

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Verify invoice exists
    invoice = await db["invoices"].find_one({"InvoiceID": payment.InvoiceID})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if invoice.get("PaymentStatus") == "Paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid.")

    # Ensure unique transaction reference
    existing = await db["payments"].find_one({"TransactionReference": payment.TransactionReference})
    if existing:
        raise HTTPException(status_code=400, detail="Transaction Reference already exists.")

    # Compute remaining balance
    pipeline = [
        {"$match": {"InvoiceID": payment.InvoiceID, "Status": "Completed"}},
        {"$group": {"_id": None, "total_paid": {"$sum": "$AmountPaid"}}},
    ]
    agg = await db["payments"].aggregate(pipeline).to_list(length=1)
    total_paid = Decimal(agg[0]["total_paid"] if agg else 0)
    remaining = Decimal(str(invoice.get("TotalAmount"))) - total_paid
    if Decimal(str(payment.AmountPaid)) > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds remaining balance ({remaining}).",
        )

    payment_number = await generate_payment_number(db)
    payment_doc = {
        "PaymentNumber": payment_number,
        "InvoiceID": invoice["InvoiceID"],
        "VendorID": invoice.get("VendorID"),
        "PaymentDate": date.today().isoformat(),
        "PaymentMethod": payment.PaymentMethod,
        "AmountPaid": payment.AmountPaid,
        "TransactionReference": payment.TransactionReference,
        "Status": "Completed",
        "Remarks": payment.Remarks,
    }
    result = await db["payments"].insert_one(payment_doc)
    payment_doc["_id"] = result.inserted_id

    # Update invoice status
    await update_invoice_payment_status(db, invoice["InvoiceID"], invoice.get("TotalAmount"))
    return PaymentResponse(**payment_doc)

@router.get("/", response_model=list[PaymentResponse])
async def get_payments(db=Depends(get_db)):
    cursor = db["payments"].find()
    payments = []
    async for doc in cursor:
        payments.append(PaymentResponse(**doc))
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, db=Depends(get_db)):
    payment = await db["payments"].find_one({"PaymentID": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    return PaymentResponse(**payment)

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = await db["payments"].find_one({"PaymentID": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    # Ensure transaction reference uniqueness if changed
    update_data = payment_update.model_dump(exclude_unset=True)
    if "TransactionReference" in update_data and update_data["TransactionReference"] != payment.get("TransactionReference"):
        exists = await db["payments"].find_one({
            "TransactionReference": update_data["TransactionReference"],
            "PaymentID": {"$ne": payment_id},
        })
        if exists:
            raise HTTPException(status_code=400, detail="Transaction Reference already exists.")
    await db["payments"].update_one({"PaymentID": payment_id}, {"$set": update_data})
    # Refresh payment
    updated = await db["payments"].find_one({"PaymentID": payment_id})
    # Update related invoice status
    invoice = await db["invoices"].find_one({"InvoiceID": updated["InvoiceID"]})
    if invoice:
        await update_invoice_payment_status(db, invoice["InvoiceID"], invoice.get("TotalAmount"))
    return PaymentResponse(**updated)

@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = await db["payments"].find_one({"PaymentID": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    invoice_id = payment.get("InvoiceID")
    await db["payments"].delete_one({"PaymentID": payment_id})
    # Recalculate invoice status after deletion
    invoice = await db["invoices"].find_one({"InvoiceID": invoice_id})
    if invoice:
        await update_invoice_payment_status(db, invoice["InvoiceID"], invoice.get("TotalAmount"))
    return {"message": "Payment deleted successfully"}