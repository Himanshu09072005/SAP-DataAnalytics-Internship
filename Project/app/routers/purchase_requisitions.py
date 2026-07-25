from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.security import get_current_user

from app.models.user import User
from app.models.vendor import Vendor
from app.models.material import Material
from app.models.purchase_requisition import PurchaseRequisition

from app.schemas.purchase_requisition import (
    PurchaseRequisitionCreate,
    PurchaseRequisitionUpdate,
    PurchaseRequisitionResponse,
)

router = APIRouter(
    prefix="/purchase-requisitions",
    tags=["Purchase Requisitions"],
)


# =====================================================
# Helper Function
# =====================================================

def generate_pr_number(db: Session):

    last_pr = (
        db.query(PurchaseRequisition)
        .order_by(PurchaseRequisition.PRID.desc())
        .first()
    )

    if last_pr:
        last_number = int(last_pr.PRNumber.replace("PR", ""))
        return f"PR{last_number + 1:06d}"

    return "PR000001"


# =====================================================
# CREATE PURCHASE REQUISITION
# =====================================================

@router.post(
    "/",
    response_model=PurchaseRequisitionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_requisition(
    requisition: PurchaseRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    material = (
        db.query(Material)
        .filter(Material.MaterialID == requisition.MaterialID)
        .first()
    )

    if not material:
        raise HTTPException(
            status_code=404,
            detail="Material not found.",
        )

    vendor = (
        db.query(Vendor)
        .filter(Vendor.VendorID == requisition.VendorID)
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found.",
        )

    total_amount = Decimal(requisition.Quantity) * Decimal(
        requisition.UnitPrice
    )

    new_pr = PurchaseRequisition(
        PRNumber=generate_pr_number(db),
        MaterialID=requisition.MaterialID,
        VendorID=requisition.VendorID,
        UserID=current_user.UserID,
        Quantity=requisition.Quantity,
        UnitPrice=requisition.UnitPrice,
        TotalAmount=total_amount,
        Priority=requisition.Priority,
        Status="Pending",
        RequestDate=requisition.RequestDate,
        RequiredDate=requisition.RequiredDate,
        Remarks=requisition.Remarks,
    )

    db.add(new_pr)
    db.commit()
    db.refresh(new_pr)

    return new_pr


# =====================================================
# GET ALL PURCHASE REQUISITIONS
# =====================================================

@router.get(
    "/",
    response_model=list[PurchaseRequisitionResponse],
)
def get_all_purchase_requisitions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisitions = (
        db.query(PurchaseRequisition)
        .order_by(PurchaseRequisition.PRID.desc())
        .all()
    )

    return requisitions


# =====================================================
# GET PURCHASE REQUISITION BY ID
# =====================================================

@router.get(
    "/{pr_id}",
    response_model=PurchaseRequisitionResponse,
)
def get_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisition = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == pr_id)
        .first()
    )

    if not requisition:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    return requisition



# =====================================================
# UPDATE PURCHASE REQUISITION
# =====================================================

@router.put(
    "/{pr_id}",
    response_model=PurchaseRequisitionResponse,
)
def update_purchase_requisition(
    pr_id: int,
    requisition_update: PurchaseRequisitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisition = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == pr_id)
        .first()
    )

    if not requisition:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    update_data = requisition_update.model_dump(exclude_unset=True)

    if "MaterialID" in update_data:
        material = (
            db.query(Material)
            .filter(Material.MaterialID == update_data["MaterialID"])
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=404,
                detail="Material not found.",
            )

    if "VendorID" in update_data:
        vendor = (
            db.query(Vendor)
            .filter(Vendor.VendorID == update_data["VendorID"])
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found.",
            )

    for key, value in update_data.items():
        setattr(requisition, key, value)

    requisition.TotalAmount = (
        Decimal(requisition.Quantity)
        * Decimal(requisition.UnitPrice)
    )

    db.commit()
    db.refresh(requisition)

    return requisition


# =====================================================
# APPROVE PURCHASE REQUISITION
# =====================================================

@router.put(
    "/{pr_id}/approve",
    response_model=PurchaseRequisitionResponse,
)
def approve_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisition = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == pr_id)
        .first()
    )

    if not requisition:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    requisition.Status = "Approved"

    db.commit()
    db.refresh(requisition)

    return requisition


# =====================================================
# REJECT PURCHASE REQUISITION
# =====================================================

@router.put(
    "/{pr_id}/reject",
    response_model=PurchaseRequisitionResponse,
)
def reject_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisition = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == pr_id)
        .first()
    )

    if not requisition:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    requisition.Status = "Rejected"

    db.commit()
    db.refresh(requisition)

    return requisition


# =====================================================
# DELETE PURCHASE REQUISITION
# =====================================================

@router.delete("/{pr_id}")
def delete_purchase_requisition(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    requisition = (
        db.query(PurchaseRequisition)
        .filter(PurchaseRequisition.PRID == pr_id)
        .first()
    )

    if not requisition:
        raise HTTPException(
            status_code=404,
            detail="Purchase Requisition not found.",
        )

    db.delete(requisition)
    db.commit()

    return {
        "message": "Purchase Requisition deleted successfully."
    }