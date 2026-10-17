import os
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db
from app.schemas.purchase_requisition import (
    PurchaseRequisitionCreate,
    PurchaseRequisitionUpdate,
    PurchaseRequisitionResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/purchase-requisitions",
    tags=["Purchase Requisitions"],
)

async def generate_pr_number(db) -> str:
    """Generate the next PR number based on the highest existing PRID.

    PRID is stored as an integer field; we use it to determine the next sequential
    number and format the PRNumber accordingly.
    """
    last_pr = await db["purchase_requisitions"].find_one(sort=[("PRID", -1)])
    if last_pr and "PRNumber" in last_pr:
        last_number = int(last_pr["PRNumber"].replace("PR", ""))
        return f"PR{last_number + 1:06d}"
    return "PR000001"

@router.post("/", response_model=PurchaseRequisitionResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_requisition(
    requisition: PurchaseRequisitionCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Validate material existence
    material = await db["materials"].find_one({"MaterialID": requisition.MaterialID})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
    # Validate vendor existence
    vendor = await db["vendors"].find_one({"VendorID": requisition.VendorID})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    # Compute total amount
    total_amount = Decimal(requisition.Quantity) * Decimal(requisition.UnitPrice)
    pr_number = await generate_pr_number(db)
    pr_doc = {
        "PRNumber": pr_number,
        "MaterialID": requisition.MaterialID,
        "VendorID": requisition.VendorID,
        "UserID": current_user.get("UserID", current_user.get("_id")),
        "Quantity": requisition.Quantity,
        "UnitPrice": requisition.UnitPrice,
        "TotalAmount": float(total_amount),
        "Priority": requisition.Priority,
        "Status": "Pending",
        "RequestDate": requisition.RequestDate,
        "RequiredDate": requisition.RequiredDate,
        "Remarks": requisition.Remarks,
    }
    result = await db["purchase_requisitions"].insert_one(pr_doc)
    pr_doc["PRID"] = result.inserted_id
    return pr_doc

@router.get("/", response_model=list[PurchaseRequisitionResponse])
async def get_all_purchase_requisitions(db=Depends(get_db)):
    cursor = db["purchase_requisitions"].find().sort("PRID", -1)
    return await cursor.to_list(length=None)

@router.get("/{pr_id}", response_model=PurchaseRequisitionResponse)
async def get_purchase_requisition(pr_id: int, db=Depends(get_db)):
    pr = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    return pr

@router.put("/{pr_id}", response_model=PurchaseRequisitionResponse)
async def update_purchase_requisition(
    pr_id: int,
    requisition_update: PurchaseRequisitionUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    pr = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    update_data = requisition_update.model_dump(exclude_unset=True)
    # Re‑validate foreign keys if they are changed
    if "MaterialID" in update_data:
        material = await db["materials"].find_one({"MaterialID": update_data["MaterialID"]})
        if not material:
            raise HTTPException(status_code=404, detail="Material not found.")
    if "VendorID" in update_data:
        vendor = await db["vendors"].find_one({"VendorID": update_data["VendorID"]})
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found.")
    # Recompute total amount if quantity or price changed
    if "Quantity" in update_data or "UnitPrice" in update_data:
        qty = update_data.get("Quantity", pr.get("Quantity"))
        price = update_data.get("UnitPrice", pr.get("UnitPrice"))
        update_data["TotalAmount"] = float(Decimal(qty) * Decimal(price))
    await db["purchase_requisitions"].update_one({"PRID": pr_id}, {"$set": update_data})
    updated = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    return updated

@router.put("/{pr_id}/approve", response_model=PurchaseRequisitionResponse)
async def approve_purchase_requisition(pr_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    pr = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    await db["purchase_requisitions"].update_one({"PRID": pr_id}, {"$set": {"Status": "Approved"}})
    updated = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    return updated

@router.put("/{pr_id}/reject", response_model=PurchaseRequisitionResponse)
async def reject_purchase_requisition(pr_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    pr = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    await db["purchase_requisitions"].update_one({"PRID": pr_id}, {"$set": {"Status": "Rejected"}})
    updated = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    return updated

@router.delete("/{pr_id}")
async def delete_purchase_requisition(pr_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    pr = await db["purchase_requisitions"].find_one({"PRID": pr_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")
    await db["purchase_requisitions"].delete_one({"PRID": pr_id})
    return {"message": "Purchase Requisition deleted successfully."}