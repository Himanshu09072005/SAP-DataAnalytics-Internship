from sqlalchemy import Column, Integer, String

from app.database import Base


class User(Base):
    __tablename__ = "users"

    UserID = Column(Integer, primary_key=True, index=True)

    FullName = Column(String(100), nullable=False)

    Username = Column(String(50), unique=True, nullable=False)

    Password = Column(String(255), nullable=False)

    Email = Column(String(100), unique=True, nullable=False)

    # Role: Admin, Manager, Purchase Officer, Inventory Manager, Finance, Employee
    Role = Column(String(50), nullable=False, default="Employee")

    Department = Column(String(50))

    Phone = Column(String(15))

    # Status: Active, Inactive
    Status = Column(String(20), nullable=False, default="Active")
