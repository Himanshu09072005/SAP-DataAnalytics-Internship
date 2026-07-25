from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User
from app.models.vendor import Vendor
from app.models.material import Material
from app.models.purchase_requisition import PurchaseRequisition
from app.models.purchase_order import PurchaseOrder
from app.models.goods_receipt import GoodsReceipt
from app.models.invoice import Invoice
from app.models.payment import Payment

from app.security import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_users = db.query(func.count(User.UserID)).scalar()

    total_vendors = db.query(func.count(Vendor.VendorID)).scalar()

    total_materials = db.query(func.count(Material.MaterialID)).scalar()

    total_purchase_requisitions = (
        db.query(func.count(PurchaseRequisition.PRID)).scalar()
    )

    total_purchase_orders = (
        db.query(func.count(PurchaseOrder.POID)).scalar()
    )

    total_goods_receipts = (
        db.query(func.count(GoodsReceipt.GRID)).scalar()
    )

    total_invoices = db.query(func.count(Invoice.InvoiceID)).scalar()

    total_payments = db.query(func.count(Payment.PaymentID)).scalar()

    total_inventory_value = (
        db.query(
            func.sum(
                Material.CurrentStock * Material.UnitPrice
            )
        ).scalar()
        or 0
    )

    total_invoice_value = (
        db.query(func.sum(Invoice.TotalAmount)).scalar()
        or 0
    )

    total_amount_paid = (
        db.query(func.sum(Payment.AmountPaid)).scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "total_vendors": total_vendors,
        "total_materials": total_materials,
        "total_purchase_requisitions": total_purchase_requisitions,
        "total_purchase_orders": total_purchase_orders,
        "total_goods_receipts": total_goods_receipts,
        "total_invoices": total_invoices,
        "total_payments": total_payments,
        "total_inventory_value": float(total_inventory_value),
        "total_invoice_value": float(total_invoice_value),
        "total_amount_paid": float(total_amount_paid),
    }


@router.get("/pr-status")
def get_pr_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_counts = (
        db.query(
            PurchaseRequisition.Status,
            func.count(PurchaseRequisition.PRID).label("count")
        )
        .group_by(PurchaseRequisition.Status)
        .all()
    )

    result = {
        "Pending": 0,
        "Approved": 0,
        "Ordered": 0,
        "Rejected": 0,
    }

    for status, count in status_counts:
        if status in result:
            result[status] = count

    return result



@router.get("/po-status")
def get_po_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_counts = (
        db.query(
            PurchaseOrder.Status,
            func.count(PurchaseOrder.POID).label("count")
        )
        .group_by(PurchaseOrder.Status)
        .all()
    )

    result = {
        "Open": 0,
        "Completed": 0,
        "Cancelled": 0,
    }

    for status, count in status_counts:
        if status in result:
            result[status] = count

    return result


@router.get("/inventory")
def get_inventory_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_stock = (
        db.query(func.sum(Material.CurrentStock)).scalar()
        or 0
    )

    inventory_value = (
        db.query(
            func.sum(
                Material.CurrentStock * Material.UnitPrice
            )
        ).scalar()
        or 0
    )

    reorder_materials = (
        db.query(func.count(Material.MaterialID))
        .filter(Material.CurrentStock <= Material.ReorderLevel)
        .scalar()
    )

    return {
        "total_stock": total_stock,
        "inventory_value": float(inventory_value),
        "reorder_materials": reorder_materials,
    }



@router.get("/payment-status")
def get_payment_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Payment transaction status
    payment_status_counts = (
        db.query(
            Payment.Status,
            func.count(Payment.PaymentID).label("count")
        )
        .group_by(Payment.Status)
        .all()
    )

    payment_transactions = {
        "Completed": 0,
        "Processing": 0,
        "Failed": 0,
    }

    for status, count in payment_status_counts:
        if status in payment_transactions:
            payment_transactions[status] = count

    # Invoice payment status
    invoice_status_counts = (
        db.query(
            Invoice.PaymentStatus,
            func.count(Invoice.InvoiceID).label("count")
        )
        .group_by(Invoice.PaymentStatus)
        .all()
    )

    invoice_payment_status = {
        "Pending": 0,
        "Partially Paid": 0,
        "Paid": 0,
    }

    for status, count in invoice_status_counts:
        if status in invoice_payment_status:
            invoice_payment_status[status] = count

    total_amount_paid = (
        db.query(func.sum(Payment.AmountPaid))
        .filter(Payment.Status == "Completed")
        .scalar()
        or 0
    )

    return {
        "payment_transactions": payment_transactions,
        "invoice_payment_status": invoice_payment_status,
        "total_amount_paid": float(total_amount_paid),
    }



from sqlalchemy import extract


@router.get("/users")
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_users = db.query(func.count(User.UserID)).scalar() or 0

    active_users = (
        db.query(func.count(User.UserID))
        .filter(User.Status == "Active")
        .scalar()
        or 0
    )

    inactive_users = (
        db.query(func.count(User.UserID))
        .filter(User.Status == "Inactive")
        .scalar()
        or 0
    )

    role_counts = (
        db.query(
            User.Role,
            func.count(User.UserID).label("count"),
        )
        .group_by(User.Role)
        .all()
    )

    roles = {
        "Admin": 0,
        "Manager": 0,
        "Purchase Officer": 0,
        "Inventory Manager": 0,
        "Finance": 0,
        "Employee": 0,
    }

    for role, count in role_counts:
        if role in roles:
            roles[role] = count

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "roles": roles,
    }


@router.get("/vendors")
def get_vendor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_vendors = db.query(func.count(Vendor.VendorID)).scalar() or 0

    active_vendors = (
        db.query(func.count(Vendor.VendorID))
        .filter(Vendor.Status == "Active")
        .scalar()
        or 0
    )

    inactive_vendors = (
        db.query(func.count(Vendor.VendorID))
        .filter(Vendor.Status == "Inactive")
        .scalar()
        or 0
    )

    return {
        "total_vendors": total_vendors,
        "active_vendors": active_vendors,
        "inactive_vendors": inactive_vendors,
    }


@router.get("/invoices")
def get_invoice_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice_status = (
        db.query(
            Invoice.PaymentStatus,
            func.count(Invoice.InvoiceID).label("count"),
        )
        .group_by(Invoice.PaymentStatus)
        .all()
    )

    result = {
        "Pending": 0,
        "Partially Paid": 0,
        "Paid": 0,
    }

    for status, count in invoice_status:
        if status in result:
            result[status] = count

    total_invoice_amount = (
        db.query(func.sum(Invoice.TotalAmount)).scalar() or 0
    )

    result["total_invoice_amount"] = float(total_invoice_amount)

    return result


@router.get("/monthly-purchases")
def get_monthly_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    monthly_data = (
        db.query(
            extract("month", PurchaseOrder.OrderDate).label("month"),
            func.sum(PurchaseOrder.TotalAmount).label("total"),
        )
        .group_by(extract("month", PurchaseOrder.OrderDate))
        .order_by(extract("month", PurchaseOrder.OrderDate))
        .all()
    )

    month_names = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December",
    }

    return [
        {
            "month": month_names[int(month)],
            "total_purchase_amount": float(total),
        }
        for month, total in monthly_data
    ]


@router.get("/top-materials")
def get_top_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    materials = (
        db.query(
            Material.MaterialName,
            func.sum(PurchaseRequisition.Quantity).label(
                "total_quantity"
            ),
        )
        .join(
            PurchaseRequisition,
            Material.MaterialID == PurchaseRequisition.MaterialID,
        )
        .group_by(Material.MaterialID, Material.MaterialName)
        .order_by(
            func.sum(PurchaseRequisition.Quantity).desc()
        )
        .limit(10)
        .all()
    )

    return [
        {
            "material_name": name,
            "total_requested_quantity": float(quantity),
        }
        for name, quantity in materials
    ]