from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services import assets
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

router = APIRouter()

# Schema models
class AssetTypeCreate(BaseModel):
    id: str
    name: str
    category: str
    parentCategory: str
    icon: Optional[str] = "Circle"

class MonthlyRecordCreate(BaseModel):
    assetId: str
    date: str
    amount: float
    currency: Optional[str] = "CNY"


@router.get("/types")
async def get_types(user_id: str, db: AsyncSession = Depends(get_db)):
    # Note: user_id should ideally come from Auth Header/Token.
    # For now, we accept it as query param but this is insecure.
    # Getting it from token requires implementing JWT middleware.
    # Given the scope, validating simple user_id for now is 'okay' for prototype migration,
    # but we should probably use a proper dependency if we can.
    # Let's assume the frontend passes user_id for now.
    return await assets.get_all_asset_types(db, user_id)

@router.post("/types")
async def create_type(user_id: str, type_data: AssetTypeCreate, db: AsyncSession = Depends(get_db)):
    return await assets.create_custom_asset_type(db, user_id, type_data.dict())

class AssetTypeUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None

@router.put("/types/{type_id}")
async def update_type(user_id: str, type_id: str, type_data: AssetTypeUpdate, db: AsyncSession = Depends(get_db)):
    updated = await assets.update_asset_type(db, user_id, type_id, type_data.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Asset type not found or not customizable")
    return updated

@router.delete("/types/{type_id}")
async def delete_type(user_id: str, type_id: str, db: AsyncSession = Depends(get_db)):
    await assets.delete_asset_type(db, user_id, type_id)
    return {"success": True}

@router.get("/records")
async def get_records(user_id: str, month: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    records = await assets.get_monthly_records(db, user_id, month)
    # Transform to match frontend needs if necessary
    return [
        {
            "id": str(r.id), # UUID to string
            "date": r.record_date,
            "assetId": r.asset_id,
            "amount": float(r.amount),
            "currency": r.currency
        }
        for r in records
    ]

@router.post("/records")
async def upsert_record(user_id: str, record: MonthlyRecordCreate, db: AsyncSession = Depends(get_db)):
    res = await assets.upsert_monthly_record(db, user_id, record.dict())
    return {
        "id": str(res.id),
        "assetId": res.asset_id,
        "amount": float(res.amount),
        "date": res.record_date
    }

@router.post("/records/batch")
async def batch_upsert(user_id: str, records: List[MonthlyRecordCreate], db: AsyncSession = Depends(get_db)):
    # Convert Pydantic models to dicts
    data = [r.dict() for r in records]
    results = await assets.batch_upsert_records(db, user_id, data)
    return {"success": True, "count": len(results)}
