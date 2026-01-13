import asyncio
from sqlalchemy import select
from database import get_db
from models import AssetType
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

async def check_default_asset():
    # We need to manually create session since get_db is a generator
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/finance")
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as db:
        result = await db.execute(select(AssetType).where(AssetType.id == 'bank_card'))
        asset = result.scalars().first()
        if asset:
            print("Found bank_card")
        else:
            print("bank_card NOT found in DB")

if __name__ == "__main__":
    asyncio.run(check_default_asset())
