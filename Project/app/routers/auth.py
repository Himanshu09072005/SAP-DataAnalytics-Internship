from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token
from app.dependencies import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])\

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserRegister,
    db = Depends(get_db),
):
    # Check for existing username
    if await db["users"].find_one({"Username": user.Username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    # Check for existing email
    if user.Email and await db["users"].find_one({"Email": user.Email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user_dict = user.model_dump()
    user_dict["Password"] = hash_password(user.Password)
    user_dict["Status"] = "Active"
    result = await db["users"].insert_one(user_dict)
    # MongoDB uses _id; we expose it as UserID for compatibility
    user_dict["UserID"] = result.inserted_id
    return user_dict

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_db),
):
    db_user = await db["users"].find_one({"Username": form_data.username})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(form_data.password, db_user["Password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token({
        "sub": db_user["Username"],
        "role": db_user.get("Role"),
        "user_id": str(db_user.get("UserID", db_user.get("_id"))),
    })
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user