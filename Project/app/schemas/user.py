from app.schemas.base import MongoBaseModel, EmailStr
from typing import Optional


class UserRegister(MongoBaseModel):
    FullName: str
    Username: str
    Password: str
    Email: EmailStr
    Role: str
    Department: Optional[str] = None
    Phone: Optional[str] = None


class UserLogin(MongoBaseModel):
    Username: str
    Password: str


class UserResponse(MongoBaseModel):
    UserID: int
    FullName: str
    Username: str
    Email: EmailStr
    Role: str
    Department: Optional[str]
    Phone: Optional[str]
    Status: str

    class Config:
        from_attributes = True


class Token(MongoBaseModel):
    access_token: str
    token_type: str