import logging
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_db
from app.schemas.goods_receipt import GoodsReceiptCreate, GoodsReceiptUpdate, GoodsReceiptResponse
from app.security import get_current_user
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_requisition import PurchaseRequisition
from app.models.material import Material

router = APIRouter(prefix="/goods-receipts", tags=["Goods Receipts"])
logger = logging.getLogger(__name__)

# Helper to generate next GRNumber asynchronously
async def generate_gr_number(db):
    last = await db["goods_receipts"].find_one(sort=[("GRNumber", -1)])
    if last and "GRNumber" in last:
        try:
            number = int(last["GRNumber"].replace("GR", ""))
            return f"GR{number + 1:04d}"
        except Exception:
            logger.exception("Failed to parse GRNumber, resetting to GR0001")
    return "GR0001"

@router.post("/", response_model=GoodsReceiptResponse)
async def create_goods_receipt(
    receipt: GoodsReceiptCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Verify PO exists and is Open
    po = await db["purchase_orders"].find_one({"POID": receipt.POID})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.get("Status") != "Open":
        raise HTTPException(status_code=400, detail="Only Open Purchase Orders can receive goods.")

    # Ensure no existing goods receipt for this PO
    existing = await db["goods_receipts"].find_one({"POID": receipt.POID})
    if existing:
        raise HTTPException(status_code=400, detail="Goods Receipt already exists for this Purchase Order.")

    # Verify related PR
    pr = await db["purchase_requisitions"].find_one({"PRID": po["PRID"]})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Requisition not found.")

    if receipt.QuantityReceived > pr["Quantity"]:
        raise HTTPException(status_code=400, detail="Received quantity cannot exceed ordered quantity.")

    # Update material stock atomically
    material = await db["materials"].find_one({"MaterialID": pr["MaterialID"]})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")
    await db["materials"].update_one(
        {"MaterialID": material["MaterialID"]},
        {"$inc": {"CurrentStock": int(receipt.QuantityReceived)}},
    )

    # Mark PO as Completed
    await db["purchase_orders"].update_one({"POID": po["POID"]}, {"$set": {"Status": "Completed"}})

    gr_number = await generate_gr_number(db)
    goods_receipt_doc = {
        "GRNumber": gr_number,
        "POID": po["POID"],
        "VendorID": po["VendorID"],
        "ReceivedBy": current_user["UserID"],
        "ReceiptDate": date.today().isoformat(),
        "QuantityReceived": receipt.QuantityReceived,
        "QualityStatus": receipt.QualityStatus,
        "WarehouseLocation": receipt.WarehouseLocation,
        "Status": receipt.Status,
        "Remarks": receipt.Remarks,
    }
    result = await db["goods_receipts"].insert_one(goods_receipt_doc)
    goods_receipt_doc["_id"] = result.inserted_id
    return GoodsReceiptResponse(**goods_receipt_doc)

@router.get("/", response_model=list[GoodsReceiptResponse])
async def get_goods_receipts(db=Depends(get_db)):
    cursor = db["goods_receipts"].find()
    receipts = []
    async for doc in cursor:
        receipts.append(GoodsReceiptResponse(**doc))
    return receipts

@router.get("/{grid}", response_model=GoodsReceiptResponse)
async def get_goods_receipt(grid: int, db=Depends(get_db)):
    receipt = await db["goods_receipts"].find_one({"GRID": grid})
    if not receipt:
        raise HTTPException(status_code=404, detail="Goods Receipt not found")
    return GoodsReceiptResponse(**receipt)

@router.put("/{grid}", response_model=GoodsReceiptResponse)
async def update_goods_receipt(
    grid: int,
    update: GoodsReceiptUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    receipt = await db["goods_receipts"].find_one({"GRID": grid})
    if not receipt:
        raise HTTPException(status_code=404, detail="Goods Receipt not found")
    update_data = update.model_dump(exclude_unset=True)
    await db["goods_receipts"].update_one({"GRID": grid}, {"$set": update_data})
    updated = await db["goods_receipts"].find_one({"GRID": grid})
    return GoodsReceiptResponse(**updated)

@router.delete("/{grid}")
async def delete_goods_receipt(grid: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    receipt = await db["goods_receipts"].find_one({"GRID": grid})
    if not receipt:
        raise HTTPException(status_code=404, detail="Goods Receipt not found")
    await db["goods_receipts"].delete_one({"GRID": grid})
    return {"message": "Goods Receipt deleted successfully"}