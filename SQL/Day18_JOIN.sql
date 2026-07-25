SELECT
    Purchase_Order.PO_ID,
    Vendor.Vendor_Name,
    Material.Material_Name,
    Purchase_Order.Quantity,
    Purchase_Order.Purchase_Date
FROM Purchase_Order
INNER JOIN Vendor
ON Purchase_Order.Vendor_ID = Vendor.Vendor_ID
INNER JOIN Material
ON Purchase_Order.Material_ID = Material.Material_ID;