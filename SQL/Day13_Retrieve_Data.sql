USE chemical_procurement;
SELECT Vendor_Name, City
FROM Vendor
WHERE City = 'Ankleshwar'
ORDER BY Vendor_Name
LIMIT 1;