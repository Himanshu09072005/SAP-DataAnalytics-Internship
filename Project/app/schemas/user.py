from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegister(BaseModel):
    FullName: str
    Username: str
    Password: str
    Email: EmailStr
    Role: str
    Department: Optional[str] = None
    Phone: Optional[str] = None


class UserLogin(BaseModel):
    Username: str
    Password: str


class UserResponse(BaseModel):
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


class Token(BaseModel):
    access_token: str
    token_type: str