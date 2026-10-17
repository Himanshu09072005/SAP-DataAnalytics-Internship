import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_db
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)

async def generate_po_number(db) -> str:
    """Generate a new PO number based on the highest existing POID.

    The POID field is stored as an integer in each document. We find the max
    POID and increment the numeric part of the PONumber accordingly.
    """
    last_po = await db["purchase_orders"].find_one(sort=[("POID", -1)])
    if last_po and "PONumber" in last_po:
        last_number = int(last_po["PONumber"].replace("PO", ""))
        return f"PO{last_number + 1:04d}"
    return "PO0001"

@router.post("/", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Verify related Purchase Requisition exists and is approved
    pr = await db["purchase_requisitions"].find_one({"PRID": purchase_order.PRID})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found")
    if pr.get("Status") != "Approved":
        raise HTTPException(status_code=400, detail="Only Approved Purchase Requisitions can be converted into Purchase Orders")
    # Ensure no existing PO for this PRID
    existing_po = await db["purchase_orders"].find_one({"PRID": purchase_order.PRID})
    if existing_po:
        raise HTTPException(status_code=400, detail="Purchase Order already exists for this Purchase Requisition")

    po_number = await generate_po_number(db)
    po_doc = {
        "PONumber": po_number,
        "PRID": pr["PRID"],
        "VendorID": pr["VendorID"],
        "UserID": pr["UserID"],
        "OrderDate": date.today().isoformat(),
        "ExpectedDeliveryDate": purchase_order.ExpectedDeliveryDate,
        "TotalAmount": pr.get("TotalAmount"),
        "Status": "Open",
        "PaymentTerms": purchase_order.PaymentTerms,
        "Remarks": purchase_order.Remarks,
    }
    result = await db["purchase_orders"].insert_one(po_doc)
    po_doc["POID"] = result.inserted_id
    await db["purchase_requisitions"].update_one({"PRID": purchase_order.PRID}, {"$set": {"Status": "Ordered"}})
    return po_doc

@router.get("/", response_model=list[PurchaseOrderResponse])
async def get_purchase_orders(db=Depends(get_db)):
    cursor = db["purchase_orders"].find()
    return await cursor.to_list(length=None)

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(po_id: int, db=Depends(get_db)):
    po = await db["purchase_orders"].find_one({"POID": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po

@router.put("/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: int,
    purchase_order: PurchaseOrderUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = await db["purchase_orders"].find_one({"POID": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    update_data = purchase_order.model_dump(exclude_unset=True)
    await db["purchase_orders"].update_one({"POID": po_id}, {"$set": update_data})
    updated_po = await db["purchase_orders"].find_one({"POID": po_id})
    return updated_po

@router.put("/{po_id}/complete")
async def complete_purchase_order(po_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    po = await db["purchase_orders"].find_one({"POID": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    await db["purchase_orders"].update_one({"POID": po_id}, {"$set": {"Status": "Completed"}})
    return {"message": "Purchase Order marked as Completed"}

@router.put("/{po_id}/cancel")
async def cancel_purchase_order(po_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    po = await db["purchase_orders"].find_one({"POID": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    await db["purchase_orders"].update_one({"POID": po_id}, {"$set": {"Status": "Cancelled"}})
    return {"message": "Purchase Order cancelled"}

@router.delete("/{po_id}")
async def delete_purchase_order(po_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    po = await db["purchase_orders"].find_one({"POID": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    await db["purchase_orders"].delete_one({"POID": po_id})
    return {"message": "Purchase Order deleted successfully"}