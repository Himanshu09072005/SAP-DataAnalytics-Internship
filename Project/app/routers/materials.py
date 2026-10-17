from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.security import get_current_user

router = APIRouter(prefix="/materials", tags=["Materials"])

@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(material: MaterialCreate, db = Depends(get_db), current_user = Depends(get_current_user)):
    # Ensure unique MaterialCode
    existing = await db["materials"].find_one({"MaterialCode": material.MaterialCode})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material code already exists.")
    # Generate new MaterialID (auto-increment style)
    last = await db["materials"].find_one(sort=[("MaterialID", -1)])
    new_id = (last.get("MaterialID", 0) + 1) if last else 1
    material_dict = material.model_dump()
    material_dict["MaterialID"] = new_id
    result = await db["materials"].insert_one(material_dict)
    material_dict["_id"] = result.inserted_id
    return material_dict

@router.get("/", response_model=list[MaterialResponse])
async def get_all_materials(db = Depends(get_db)):
    return await db["materials"].find().to_list(length=None)

@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material_by_id(material_id: int, db = Depends(get_db)):
    material = await db["materials"].find_one({"MaterialID": material_id})
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    return material

@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(material_id: int, material_data: MaterialUpdate, db = Depends(get_db), current_user = Depends(get_current_user)):
    existing = await db["materials"].find_one({"MaterialID": material_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    update_dict = material_data.model_dump(exclude_unset=True)
    await db["materials"].update_one({"MaterialID": material_id}, {"$set": update_dict})
    updated = await db["materials"].find_one({"MaterialID": material_id})
    return updated

@router.delete("/{material_id}")
async def delete_material(material_id: int, db = Depends(get_db), current_user = Depends(get_current_user)):
    existing = await db["materials"].find_one({"MaterialID": material_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    await db["materials"].delete_one({"MaterialID": material_id})
    return {"message": "Material deleted successfully."}