from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.security import get_current_user

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(vendor: VendorCreate, db = Depends(get_db), current_user = Depends(get_current_user)):
    # Check for existing vendor code
    existing = await db["vendors"].find_one({"VendorCode": vendor.VendorCode})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor Code already exists.")
    # Check for existing email if provided
    if vendor.Email:
        email_exists = await db["vendors"].find_one({"Email": vendor.Email})
        if email_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists.")
    vendor_dict = vendor.model_dump()
    result = await db["vendors"].insert_one(vendor_dict)
    vendor_dict["VendorID"] = result.inserted_id
    return vendor_dict

@router.get("/", response_model=list[VendorResponse])
async def get_all_vendors(db = Depends(get_db)):
    vendors = await db["vendors"].find().to_list(length=None)
    return vendors

@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: int, db = Depends(get_db)):
    vendor = await db["vendors"].find_one({"VendorID": vendor_id})
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    return vendor

@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(vendor_id: int, vendor_data: VendorUpdate, db = Depends(get_db), current_user = Depends(get_current_user)):
    vendor = await db["vendors"].find_one({"VendorID": vendor_id})
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    update_data = vendor_data.model_dump(exclude_unset=True)
    await db["vendors"].update_one({"VendorID": vendor_id}, {"$set": update_data})
    updated = await db["vendors"].find_one({"VendorID": vendor_id})
    return updated

@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: int, db = Depends(get_db), current_user = Depends(get_current_user)):
    vendor = await db["vendors"].find_one({"VendorID": vendor_id})
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found.")
    await db["vendors"].delete_one({"VendorID": vendor_id})
    return {"message": "Vendor deleted successfully."}