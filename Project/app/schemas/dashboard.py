from app.schemas.base import MongoBaseModel
from typing import List, Dict

class DashboardSummary(MongoBaseModel):
    total_users: int
    total_vendors: int
    total_materials: int
    total_purchase_requisitions: int
    total_purchase_orders: int
    total_goods_receipts: int
    total_invoices: int
    total_payments: int
    total_inventory_value: float
    total_invoice_value: float
    total_amount_paid: float

class PRStatusResponse(MongoBaseModel):
    Pending: int
    Approved: int
    Ordered: int
    Rejected: int

class POStatusResponse(MongoBaseModel):
    Open: int
    Completed: int
    Cancelled: int

class InventoryDashboardResponse(MongoBaseModel):
    total_stock: int
    inventory_value: float
    reorder_materials: int

class PaymentStatusResponse(MongoBaseModel):
    payment_transactions: Dict[str, int]
    invoice_payment_status: Dict[str, int]
    total_amount_paid: float

class UserDashboardResponse(MongoBaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    roles: Dict[str, int]

class VendorDashboardResponse(MongoBaseModel):
    total_vendors: int
    active_vendors: int
    inactive_vendors: int

class InvoiceDashboardResponse(MongoBaseModel):
    Pending: int
    Partially_Paid: int
    Paid: int
    total_invoice_amount: float

class MonthlyPurchaseResponse(MongoBaseModel):
    month: str
    total_purchase_amount: float

class TopMaterialResponse(MongoBaseModel):
    material_name: str
    total_requested_quantity: float

