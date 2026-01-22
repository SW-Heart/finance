# -*- coding: utf-8 -*-
"""
Finance App 后端服务
提供短信验证码登录 API
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from routes.auth import router as auth_router
from routes.assets import router as assets_router
from routes.import_data import router as import_router
from routes.ai_advisor import router as ai_router

app = FastAPI(title="Finance Auth API", version="1.0.0")

# 配置 CORS
origins = os.getenv("ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(assets_router, prefix="/api/assets", tags=["资产"])
app.include_router(import_router, prefix="/api/import", tags=["导入"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI咨询"])


@app.get("/")
async def root():
    return {"message": "Finance Auth API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    from database import AsyncSessionLocal
    from services.assets import seed_default_assets
    async with AsyncSessionLocal() as db:
        try:
            await seed_default_assets(db)
        except Exception as e:
            print(f"Startup Warning: Could not seed default assets. This is normal if tables are not created yet. Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
