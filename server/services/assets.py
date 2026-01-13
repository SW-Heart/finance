from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models import AssetType, MonthlyRecord
from constants import DEFAULT_ASSET_TYPES
from uuid import UUID
from datetime import datetime
from typing import List, Optional

async def get_all_asset_types(db: AsyncSession, user_id: str):
    # Get user custom types AND system default types from DB
    result = await db.execute(select(AssetType).where(
        ((AssetType.user_id == user_id) | (AssetType.user_id == None)) & 
        (AssetType.is_deleted == False)
    ))
    all_types = result.scalars().all()
    
    # Convert to dicts for frontend
    # Note: If there's a conflict (same ID for global and user), 
    # user version should ideally win. But currently IDs are unique.
    return [
        {
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "parentCategory": t.parent_category,
            "icon": t.icon,
            "isCustom": t.is_custom
        }
        for t in all_types
    ]

async def create_custom_asset_type(db: AsyncSession, user_id: str, data: dict):
    # Allow passing ID from frontend if generated there, or generate here.
    # Model uses String ID.
    asset_id = data.get("id")
    
    if asset_id:
        # Check for existing
        result = await db.execute(select(AssetType).where(
            (AssetType.id == asset_id) & (AssetType.user_id == user_id)
        ))
        existing = result.scalars().first()
        if existing:
            # If exists, update it (restore if deleted)
            existing.name = data["name"]
            existing.category = data["category"]
            existing.parent_category = data["parentCategory"]
            existing.icon = data.get("icon", "Circle")
            existing.is_deleted = False
            
            await db.commit()
            await db.refresh(existing)
            return existing
    
    if asset_id:
        # Check for existing
        result = await db.execute(select(AssetType).where(
            (AssetType.id == asset_id) & (AssetType.user_id == user_id)
        ))
        existing = result.scalars().first()
        if existing:
            # If exists, update it (restore if deleted)
            existing.name = data["name"]
            existing.category = data["category"]
            existing.parent_category = data["parentCategory"]
            existing.icon = data.get("icon", "Circle")
            existing.is_deleted = False
            
            await db.commit()
            await db.refresh(existing)
            return existing

    new_type = AssetType(
        id=asset_id,
        user_id=user_id,
        name=data["name"],
        category=data["category"],
        parent_category=data["parentCategory"], # Input from frontend
        icon=data.get("icon", "Circle"),
        is_custom=True
    )
    db.add(new_type)
    await db.commit()
    await db.refresh(new_type)
    return new_type

async def update_asset_type(db: AsyncSession, user_id: str, type_id: str, data: dict):
    # Try to find asset by ID and user_id, OR if it's a global asset (user_id is null)
    # But wait, system defaults have user_id=None. Custom ones have user_id.
    # Frontend sends user_id.
    result = await db.execute(select(AssetType).where(
        (AssetType.id == type_id) & 
        ((AssetType.user_id == user_id) | (AssetType.user_id == None))
    ))
    asset_type = result.scalars().first()
    if asset_type:
        if "name" in data:
            asset_type.name = data["name"]
        if "icon" in data:
            asset_type.icon = data["icon"]
        # If it was a global asset and we modified it, should we make it user-specific?
        # For now, let's just allow editing the global one (prototype simplicity)
        # but ideally we'd fork it if it's global.
        # Given current requirements, let's keep it simple.
        await db.commit()
        await db.refresh(asset_type)
        return asset_type
    return None

async def delete_asset_type(db: AsyncSession, user_id: str, type_id: str):
    # Allow deleting custom types OR global ones
    result = await db.execute(select(AssetType).where(
        (AssetType.id == type_id) & 
        ((AssetType.user_id == user_id) | (AssetType.user_id == None))
    ))
    asset_type = result.scalars().first()
    if asset_type:
        asset_type.is_deleted = True
        await db.commit()
    return True

async def get_monthly_records(db: AsyncSession, user_id: str, month: Optional[str] = None):
    query = select(MonthlyRecord).where(MonthlyRecord.user_id == user_id)
    if month:
        query = query.where(MonthlyRecord.record_date == month)
        
    result = await db.execute(query)
    records = result.scalars().all()
    return records

async def upsert_monthly_record(db: AsyncSession, user_id: str, data: dict):
    # Check if record exists
    result = await db.execute(select(MonthlyRecord).where(
        (MonthlyRecord.user_id == user_id) &
        (MonthlyRecord.asset_id == data["assetId"]) &
        (MonthlyRecord.record_date == data["date"])
    ))
    record = result.scalars().first()
    
    if record:
        record.amount = data["amount"]
        record.currency = data.get("currency", "CNY")
        record.updated_at = datetime.utcnow()
    else:
        record = MonthlyRecord(
            user_id=user_id,
            asset_id=data["assetId"],
            record_date=data["date"],
            amount=data["amount"],
            currency=data.get("currency", "CNY")
        )
        db.add(record)
        
    await db.commit()
    await db.refresh(record)
    return record

async def batch_upsert_records(db: AsyncSession, user_id: str, records: List[dict]):
    results = []
    for data in records:
        # Optimization: Could do bulk upsert, but loop is safer for now.
        res = await upsert_monthly_record(db, user_id, data)
        results.append(res)
    return results

async def seed_default_assets(db: AsyncSession):
    for default_asset in DEFAULT_ASSET_TYPES:
        result = await db.execute(select(AssetType).where(AssetType.id == default_asset["id"]))
        existing = result.scalars().first()
        if not existing:
            new_asset = AssetType(
                id=default_asset["id"],
                name=default_asset["name"],
                category=default_asset["category"],
                parent_category=default_asset["parentCategory"],
                icon=default_asset["icon"],
                is_custom=False
            )
            db.add(new_asset)
    await db.commit()
