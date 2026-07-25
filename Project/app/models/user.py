from sqlalchemy import Column, Integer, String, Enum

from app.database import Base


class User(Base):
    __tablename__ = "users"

    UserID = Column(Integer, primary_key=True, index=True)

    FullName = Column(String(100), nullable=False)

    Username = Column(String(50), unique=True, nullable=False)

    Password = Column(String(100), nullable=False)

    Email = Column(String(100), unique=True, nullable=False)

    Role = Column(
        Enum(
            "Admin",
            "Manager",
            "Purchase Officer",
            "Inventory Manager",
            "Finance",
            "Employee",
            name="role_enum",
        ),
        nullable=False,
    )

    Department = Column(String(50))

    Phone = Column(String(15))

    Status = Column(
        Enum("Active", "Inactive", name="status_enum"),
        nullable=False,
        default="Active",
    )