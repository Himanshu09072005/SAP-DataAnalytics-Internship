import logging
from datetime import date
from bson.decimal128 import Decimal128
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_db
from app.schemas.dashboard import (
    DashboardSummary,
    PRStatusResponse,
    POStatusResponse,
    InventoryDashboardResponse,
    PaymentStatusResponse,
    UserDashboardResponse,
    VendorDashboardResponse,
    InvoiceDashboardResponse,
    MonthlyPurchaseResponse,
    TopMaterialResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)


def _to_float(value):
    """Safely convert numeric values returned by MongoDB to Python floats."""
    if value is None:
        return 0.0
    if isinstance(value, Decimal128):
        value = value.to_decimal()
    if isinstance(value, Decimal):
        return float(value)
    return float(value)

# Helper utilities
async def _count_collection(db, collection_name, filter_query=None):
    filter_query = filter_query or {}
    return await db[collection_name].count_documents(filter_query)

async def _sum_collection_field(db, collection_name, field_path, filter_query=None):
    """Sum a single numeric field across documents.

    Parameters
    ----------
    db: Motor database instance.
    collection_name: Name of the collection.
    field_path: Name of the field to sum (e.g., "TotalAmount").
    filter_query: Optional MongoDB filter.
    """
    filter_query = filter_query or {}
    pipeline = [
        {"$match": filter_query},
        {"$group": {"_id": None, "total": {"$sum": f"${field_path}"}}},
    ]
    result = await db[collection_name].aggregate(pipeline).to_list(length=1)
    return result[0]["total"] if result else 0

async def _sum_inventory_value(db, collection_name, quantity_field, price_field, filter_query=None):
    """Calculate total inventory value as sum(quantity * unit_price).
    Uses $multiply inside $sum via aggregation pipeline.
    """
    filter_query = filter_query or {}
    pipeline = [
        {"$match": filter_query},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": {"$multiply": [f"${quantity_field}", f"${price_field}"]}},
            }
        },
    ]
    result = await db[collection_name].aggregate(pipeline).to_list(length=1)
    return result[0]["total"] if result else 0

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db=Depends(get_db)):
    total_users = await _count_collection(db, "users")
    total_vendors = await _count_collection(db, "vendors")
    total_materials = await _count_collection(db, "materials")
    total_purchase_requisitions = await _count_collection(db, "purchaserequisitions")
    total_purchase_orders = await _count_collection(db, "purchaseorders")
    total_goods_receipts = await _count_collection(db, "goodsreceipts")
    total_invoices = await _count_collection(db, "invoices")
    total_payments = await _count_collection(db, "payments")

    total_inventory_value = await _sum_inventory_value(
        db,
        "materials",
        "CurrentStock",
        "UnitPrice",
    )
    total_invoice_value = await _sum_collection_field(db, "invoices", "TotalAmount")
    total_amount_paid = await _sum_collection_field(db, "payments", "AmountPaid", {"Status": "Completed"})

    return DashboardSummary(
        total_users=total_users,
        total_vendors=total_vendors,
        total_materials=total_materials,
        total_purchase_requisitions=total_purchase_requisitions,
        total_purchase_orders=total_purchase_orders,
        total_goods_receipts=total_goods_receipts,
        total_invoices=total_invoices,
        total_payments=total_payments,
        total_inventory_value=_to_float(total_inventory_value),
        total_invoice_value=_to_float(total_invoice_value),
        total_amount_paid=_to_float(total_amount_paid),
    )

@router.get("/pr-status", response_model=PRStatusResponse)
async def get_pr_status(db=Depends(get_db)):
    pipeline = [
        {"$group": {"_id": "$Status", "count": {"$sum": 1}}},
    ]
    results = await db["purchaserequisitions"].aggregate(pipeline).to_list(length=100)
    result_map = {"Pending": 0, "Approved": 0, "Ordered": 0, "Rejected": 0}
    for doc in results:
        status = doc["_id"]
        if status in result_map:
            result_map[status] = doc["count"]
    return PRStatusResponse(**result_map)

@router.get("/po-status", response_model=POStatusResponse)
async def get_po_status(db=Depends(get_db)):
    pipeline = [
        {"$group": {"_id": "$Status", "count": {"$sum": 1}}},
    ]
    results = await db["purchaseorders"].aggregate(pipeline).to_list(length=100)
    result_map = {"Open": 0, "Completed": 0, "Cancelled": 0}
    for doc in results:
        status = doc["_id"]
        if status in result_map:
            result_map[status] = doc["count"]
    return POStatusResponse(**result_map)

@router.get("/inventory", response_model=InventoryDashboardResponse)
async def get_inventory_dashboard(db=Depends(get_db)):
    total_stock = await _sum_collection_field(db, "materials", "CurrentStock")
    inventory_value = await _sum_inventory_value(
        db,
        "materials",
        "CurrentStock",
        "UnitPrice",
    )
    pipeline = [
        {"$match": {"$expr": {"$lte": ["$CurrentStock", "$ReorderLevel"]}}},
        {"$count": "reorderCount"}
    ]
    result = await db["materials"].aggregate(pipeline).to_list(length=1)
    reorder_materials = result[0]["reorderCount"] if result else 0
    return InventoryDashboardResponse(
        total_stock=int(_to_float(total_stock)),
        inventory_value=_to_float(inventory_value),
        reorder_materials=reorder_materials,
    )

@router.get("/payment-status", response_model=PaymentStatusResponse)
async def get_payment_status(db=Depends(get_db)):
    # Transaction status counts
    payment_tx_counts = await db["payments"].aggregate([
        {"$group": {"_id": "$Status", "count": {"$sum": 1}}},
    ]).to_list(length=100)
    payment_transactions = {"Completed": 0, "Processing": 0, "Failed": 0}
    for doc in payment_tx_counts:
        status = doc["_id"]
        if status in payment_transactions:
            payment_transactions[status] = doc["count"]

    # Invoice payment status counts
    invoice_status_counts = await db["invoices"].aggregate([
        {"$group": {"_id": "$PaymentStatus", "count": {"$sum": 1}}},
    ]).to_list(length=100)
    invoice_payment_status = {"Pending": 0, "Partially Paid": 0, "Paid": 0}
    for doc in invoice_status_counts:
        status = doc["_id"]
        if status in invoice_payment_status:
            invoice_payment_status[status] = doc["count"]

    total_amount_paid = await _sum_collection_field(db, "payments", "AmountPaid", {"Status": "Completed"})

    return PaymentStatusResponse(
        payment_transactions=payment_transactions,
        invoice_payment_status=invoice_payment_status,
        total_amount_paid=_to_float(total_amount_paid),
    )

@router.get("/users", response_model=UserDashboardResponse)
async def get_user_dashboard(db=Depends(get_db)):
    total_users = await _count_collection(db, "users")
    active_users = await _count_collection(db, "users", {"Status": "Active"})
    inactive_users = await _count_collection(db, "users", {"Status": "Inactive"})
    pipeline = [
        {"$group": {"_id": "$Role", "count": {"$sum": 1}}},
    ]
    role_counts = await db["users"].aggregate(pipeline).to_list(length=100)
    roles = {"Admin": 0, "Manager": 0, "Purchase Officer": 0, "Inventory Manager": 0, "Finance": 0, "Employee": 0}
    for doc in role_counts:
        role = doc["_id"]
        if role in roles:
            roles[role] = doc["count"]
    return UserDashboardResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        roles=roles,
    )

@router.get("/vendors", response_model=VendorDashboardResponse)
async def get_vendor_dashboard(db=Depends(get_db)):
    total_vendors = await _count_collection(db, "vendors")
    active_vendors = await _count_collection(db, "vendors", {"Status": "Active"})
    inactive_vendors = await _count_collection(db, "vendors", {"Status": "Inactive"})
    return VendorDashboardResponse(
        total_vendors=total_vendors,
        active_vendors=active_vendors,
        inactive_vendors=inactive_vendors,
    )

@router.get("/invoices", response_model=InvoiceDashboardResponse)
async def get_invoice_dashboard(db=Depends(get_db)):
    pipeline = [
        {"$group": {"_id": "$PaymentStatus", "count": {"$sum": 1}}},
    ]
    invoice_status = await db["invoices"].aggregate(pipeline).to_list(length=100)
    result = {"Pending": 0, "Partially Paid": 0, "Paid": 0}
    for doc in invoice_status:
        status = doc["_id"]
        if status in result:
            result[status] = doc["count"]
    total_invoice_amount = await _sum_collection_field(db, "invoices", "TotalAmount")
    result["total_invoice_amount"] = _to_float(total_invoice_amount)
    return InvoiceDashboardResponse(**result)

@router.get("/monthly-purchases", response_model=list[MonthlyPurchaseResponse])
async def get_monthly_purchases(db=Depends(get_db)):
    pipeline = [
        {"$group": {
            "_id": {"month": {"$month": "$OrderDate"}},
            "total": {"$sum": "$TotalAmount"},
        }},
        {"$sort": {"_id.month": 1}},
    ]
    data = await db["purchaseorders"].aggregate(pipeline).to_list(length=100)
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
        MonthlyPurchaseResponse(
            month=month_names.get(item["_id"]["month"], "Unknown"),
            total_purchase_amount=_to_float(item["total"]),
        )
        for item in data
    ]

@router.get("/top-materials", response_model=list[TopMaterialResponse])
async def get_top_materials(db=Depends(get_db)):
    pipeline = [
        {
            "$lookup": {
                "from": "purchaserequisitions",
                "localField": "MaterialID",
                "foreignField": "MaterialID",
                "as": "pr",
            }
        },
        {"$unwind": "$pr"},
        {
            "$group": {
                "_id": {"MaterialID": "$MaterialID", "MaterialName": "$MaterialName"},
                "total_quantity": {"$sum": "$pr.Quantity"},
            }
        },
        {"$sort": {"total_quantity": -1}},
        {"$limit": 10},
    ]
    result = await db["materials"].aggregate(pipeline).to_list(length=10)
    return [
        TopMaterialResponse(
            material_name=doc["_id"]["MaterialName"],
            total_requested_quantity=_to_float(doc["total_quantity"]),
        )
        for doc in result
    ]