from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_db
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.security import get_current_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])

async def generate_invoice_number(db) -> str:
    """Generate the next invoice number based on the highest existing number."""
    last = await db["invoices"].find_one(sort=[("InvoiceNumber", -1)])
    if last and isinstance(last.get("InvoiceNumber"), str):
        try:
            number = int(last["InvoiceNumber"].replace("INV", ""))
            return f"INV{number + 1:04d}"
        except Exception:
            pass
    return "INV0001"

@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice: InvoiceCreate, db = Depends(get_db), current_user = Depends(get_current_user)):
    # Verify related GoodsReceipt exists
    goods_receipt = await db["goods_receipts"].find_one({"GRID": invoice.GRID})
    if not goods_receipt:
        raise HTTPException(status_code=404, detail="Goods Receipt not found")
    if goods_receipt.get("Status") != "Completed":
        raise HTTPException(status_code=400, detail="Invoice can only be created for Completed Goods Receipts.")
    # Ensure no existing invoice for this GRID
    existing = await db["invoices"].find_one({"GRID": invoice.GRID})
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this Goods Receipt.")
    total_amount = Decimal(str(invoice.InvoiceAmount)) + Decimal(str(invoice.GSTAmount))
    new_invoice = {
        "InvoiceNumber": await generate_invoice_number(db),
        "GRID": invoice.GRID,
        "POID": goods_receipt.get("POID"),
        "VendorID": goods_receipt.get("VendorID"),
        "InvoiceDate": date.today().isoformat(),
        "InvoiceAmount": float(invoice.InvoiceAmount),
        "GSTAmount": float(invoice.GSTAmount),
        "TotalAmount": float(total_amount),
        "PaymentStatus": "Pending",
        "Remarks": invoice.Remarks,
    }
    result = await db["invoices"].insert_one(new_invoice)
    new_invoice["_id"] = result.inserted_id
    return new_invoice

@router.get("/", response_model=list[InvoiceResponse])
async def get_invoices(db = Depends(get_db)):
    return await db["invoices"].find().to_list(length=None)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: int, db = Depends(get_db)):
    invoice = await db["invoices"].find_one({"InvoiceID": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(invoice_id: int, invoice_update: InvoiceUpdate, db = Depends(get_db), current_user = Depends(get_current_user)):
    invoice = await db["invoices"].find_one({"InvoiceID": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update_data = invoice_update.model_dump(exclude_unset=True)
    # Recalculate total if amounts changed
    if "InvoiceAmount" in update_data or "GSTAmount" in update_data:
        inv_amount = update_data.get("InvoiceAmount", invoice.get("InvoiceAmount"))
        gst_amount = update_data.get("GSTAmount", invoice.get("GSTAmount"))
        update_data["TotalAmount"] = float(Decimal(str(inv_amount)) + Decimal(str(gst_amount)))
    await db["invoices"].update_one({"InvoiceID": invoice_id}, {"$set": update_data})
    return await db["invoices"].find_one({"InvoiceID": invoice_id})

@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: int, db = Depends(get_db), current_user = Depends(get_current_user)):
    invoice = await db["invoices"].find_one({"InvoiceID": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await db["invoices"].delete_one({"InvoiceID": invoice_id})
    return {"message": "Invoice deleted successfully"}