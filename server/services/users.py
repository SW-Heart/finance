from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User
from datetime import datetime

async def get_or_create_user(db: AsyncSession, phone_number: str) -> User:
    result = await db.execute(select(User).where(User.phone_number == phone_number))
    user = result.scalars().first()
    
    if not user:
        user = User(phone_number=phone_number)
        db.add(user)
        # We commit in the controller usually, or here? 
        # Committing here ensures ID is generated if we need it immediately.
        await db.commit()
        await db.refresh(user)
        
    return user
