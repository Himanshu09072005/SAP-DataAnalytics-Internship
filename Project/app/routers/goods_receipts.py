from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.goods_receipt import GoodsReceipt
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_requisition import PurchaseRequisition
from app.models.material import Material
from app.schemas.goods_receipt import (
    GoodsReceiptCreate,
    GoodsReceiptUpdate,
    GoodsReceiptResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/goods-receipts",
    tags=["Goods Receipts"],
)


def generate_gr_number(db: Session):
    last = (
        db.query(GoodsReceipt)
        .order_by(GoodsReceipt.GRID.desc())
        .first()
    )

    if last:
        number = int(last.GRNumber.replace("GR", ""))
        return f"GR{number + 1:04d}"

    return "GR0001"


@router.post("/", response_model=GoodsReceiptResponse)
def create_goods_receipt(
    receipt: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == receipt.POID)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    if po.Status != "Open":
        raise HTTPException(
            status_code=400,
            detail="Only Open Purchase Orders can receive goods.",
        )

    existing = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.POID == receipt.POID)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Goods Receipt already exists for this Purchase Order.",
        )

    pr = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == po.PRID)
        .first()
    )

    if not pr:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    if receipt.QuantityReceived > pr.Quantity:
        raise HTTPException(
            status_code=400,
            detail="Received quantity cannot exceed ordered quantity.",
        )

    material = (
        db.query(Material)
        .filter(Material.MaterialID == pr.MaterialID)
        .first()
    )

    if not material:
        raise HTTPException(
            status_code=404,
            detail="Material not found.",
        )

    material.CurrentStock += int(receipt.QuantityReceived)

    po.Status = "Completed"

    goods_receipt = GoodsReceipt(
        GRNumber=generate_gr_number(db),
        POID=po.POID,
        VendorID=po.VendorID,
        ReceivedBy=current_user.UserID,
        ReceiptDate=date.today(),
        QuantityReceived=receipt.QuantityReceived,
        QualityStatus=receipt.QualityStatus,
        WarehouseLocation=receipt.WarehouseLocation,
        Status=receipt.Status,
        Remarks=receipt.Remarks,
    )

    db.add(goods_receipt)

    db.commit()

    db.refresh(goods_receipt)

    return goods_receipt


@router.get("/", response_model=list[GoodsReceiptResponse])
def get_goods_receipts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(GoodsReceipt).all()


@router.get("/{grid}", response_model=GoodsReceiptResponse)
def get_goods_receipt(
    grid: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.GRID == grid)
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods Receipt not found",
        )

    return receipt


@router.put("/{grid}", response_model=GoodsReceiptResponse)
def update_goods_receipt(
    grid: int,
    update: GoodsReceiptUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.GRID == grid)
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods Receipt not found",
        )

    data = update.model_dump(exclude_unset=True)

    for key, value in data.items():
        setattr(receipt, key, value)

    db.commit()
    db.refresh(receipt)

    return receipt


@router.delete("/{grid}")
def delete_goods_receipt(
    grid: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.GRID == grid)
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods Receipt not found",
        )

    db.delete(receipt)
    db.commit()

    return {
        "message": "Goods Receipt deleted successfully"
    }