from sqlalchemy import Column, Integer, String, Date, DECIMAL

from app.database import Base


class Material(Base):
    __tablename__ = "materials"

    MaterialID = Column(Integer, primary_key=True, index=True)

    MaterialCode = Column(String(10), unique=True, nullable=False)

    MaterialName = Column(String(100), nullable=False)

    Category = Column(String(50), nullable=False)

    MaterialType = Column(String(30), nullable=False)

    UnitOfMeasure = Column(String(20), nullable=False)

    UnitPrice = Column(DECIMAL(10, 2), nullable=False)

    CurrentStock = Column(Integer, nullable=False)

    ReorderLevel = Column(Integer, nullable=False)

    StorageLocation = Column(String(50), nullable=False)

    Plant = Column(String(50), nullable=False)

    Status = Column(String(20), default="Active")

    CreatedDate = Column(Date, nullable=False)