from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Numeric, Date, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    settings = Column(JSON, default={})

    asset_types = relationship("AssetType", back_populates="user")
    monthly_records = relationship("MonthlyRecord", back_populates="user")


class AssetType(Base):
    __tablename__ = "asset_types"

    id = Column(String, primary_key=True) # Using string ID to match frontend 'bank_card' etc, or should we use UUID? 
    # Frontend sends string IDs like 'bank_card', 'alipay'. 
    # For custom assets, frontend generates IDs. 
    # Let's keep String to be compatible with current logic easily.
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Null for system defaults
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # liquid, safe, etc
    parent_category = Column(String, nullable=False) # assets, liabilities
    icon = Column(String, nullable=True)
    is_custom = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    user = relationship("User", back_populates="asset_types")
    records = relationship("MonthlyRecord", back_populates="asset_type")


class MonthlyRecord(Base):
    __tablename__ = "monthly_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    asset_id = Column(String, ForeignKey("asset_types.id"), nullable=False)
    record_date = Column(String, nullable=False) # Format 'YYYY-MM' to match frontend, or use Date? 
    # Frontend uses 'YYYY-MM'. Let's use String for simplicity in matching, or Date (first of month). 
    # String 'YYYY-MM' is easier for now to avoid conversion issues.
    
    amount = Column(Numeric(precision=18, scale=2), default=0)
    currency = Column(String, default="CNY")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="monthly_records")
    asset_type = relationship("AssetType", back_populates="records")
