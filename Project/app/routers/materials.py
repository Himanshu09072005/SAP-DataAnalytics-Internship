from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models.material import Material
from app.models.user import User
from app.schemas.material import (
    MaterialCreate,
    MaterialUpdate,
    MaterialResponse,
)
from app.security import get_current_user

router = APIRouter(
    prefix="/materials",
    tags=["Materials"]
)


# =========================
# CREATE MATERIAL
# =========================
@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_material = db.query(Material).filter(
        Material.MaterialCode == material.MaterialCode
    ).first()

    if existing_material:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material code already exists."
        )

    max_id = db.query(func.max(Material.MaterialID)).scalar() or 0

    new_material = Material(
        MaterialID=max_id + 1,
        **material.model_dump()
    )

    db.add(new_material)
    db.commit()
    db.refresh(new_material)

    return new_material


# =========================
# GET ALL MATERIALS
# =========================
@router.get("/", response_model=list[MaterialResponse])
def get_all_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    materials = db.query(Material).all()
    return materials


# =========================
# GET MATERIAL BY ID
# =========================
@router.get("/{material_id}", response_model=MaterialResponse)
def get_material_by_id(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.query(Material).filter(
        Material.MaterialID == material_id
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found."
        )

    return material


# =========================
# UPDATE MATERIAL
# =========================
@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    material_update: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.query(Material).filter(
        Material.MaterialID == material_id
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found."
        )

    update_data = material_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(material, key, value)

    db.commit()
    db.refresh(material)

    return material


# =========================
# DELETE MATERIAL
# =========================
@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.query(Material).filter(
        Material.MaterialID == material_id
    ).first()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found."
        )

    db.delete(material)
    db.commit()

    return {
        "message": "Material deleted successfully."
    }