from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_requisition import PurchaseRequisition
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


def generate_po_number(db: Session):
    last_po = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.POID.desc())
        .first()
    )

    if last_po:
        last_number = int(last_po.PONumber.replace("PO", ""))
        return f"PO{last_number + 1:04d}"

    return "PO0001"


@router.post("/", response_model=PurchaseOrderResponse)
def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.PRID == purchase_order.PRID
        )
        .first()
    )

    if not pr:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found",
        )

    if pr.Status != "Approved":
        raise HTTPException(
            status_code=400,
            detail="Only Approved Purchase Requisitions can be converted into Purchase Orders",
        )

    existing_po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.PRID == purchase_order.PRID)
        .first()
    )

    if existing_po:
        raise HTTPException(
            status_code=400,
            detail="Purchase Order already exists for this Purchase Requisition",
        )

    po = PurchaseOrder(
        PONumber=generate_po_number(db),
        PRID=pr.PRID,
        VendorID=pr.VendorID,
        UserID=pr.UserID,
        OrderDate=date.today(),
        ExpectedDeliveryDate=purchase_order.ExpectedDeliveryDate,
        TotalAmount=pr.TotalAmount,
        Status="Open",
        PaymentTerms=purchase_order.PaymentTerms,
        Remarks=purchase_order.Remarks,
    )

    db.add(po)

    pr.Status = "Ordered"

    db.commit()
    db.refresh(po)

    return po


@router.get("/", response_model=list[PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(PurchaseOrder).all()


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    return po


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    purchase_order: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    update_data = purchase_order.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(po, key, value)

    db.commit()
    db.refresh(po)

    return po


@router.put("/{po_id}/complete")
def complete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    po.Status = "Completed"

    db.commit()

    return {
        "message": "Purchase Order marked as Completed"
    }


@router.put("/{po_id}/cancel")
def cancel_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    po.Status = "Cancelled"

    db.commit()

    return {
        "message": "Purchase Order cancelled"
    }


@router.delete("/{po_id}")
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.POID == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    db.delete(po)
    db.commit()

    return {
        "message": "Purchase Order deleted successfully"
    }