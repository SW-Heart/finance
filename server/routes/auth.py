# -*- coding: utf-8 -*-
"""
认证路由
处理短信验证码登录相关 API
"""
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.users import get_or_create_user
from services.sms import send_verification_code, verify_code

router = APIRouter()


class SendCodeRequest(BaseModel):
    """发送验证码请求"""
    phone_number: str
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        # 中国大陆手机号验证
        if not re.match(r'^1[3-9]\d{9}$', v):
            raise ValueError('请输入有效的手机号')
        return v


class VerifyCodeRequest(BaseModel):
    """验证码校验请求"""
    phone_number: str
    code: str
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^1[3-9]\d{9}$', v):
            raise ValueError('请输入有效的手机号')
        return v
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not re.match(r'^\d{4,6}$', v):
            raise ValueError('验证码格式错误')
        return v


@router.post("/send-code")
async def send_code(request: SendCodeRequest):
    """
    发送短信验证码
    
    - **phone_number**: 手机号 (中国大陆11位)
    """
    # 发送验证码（阿里云自动生成）
    result = send_verification_code(request.phone_number)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "message": "验证码已发送，请注意查收"
    }


@router.post("/verify-code")
async def verify(request: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    """
    校验短信验证码
    
    - **phone_number**: 手机号
    - **code**: 验证码
    """
    result = verify_code(request.phone_number, request.code)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    # 验证成功，获取或创建用户
    user = await get_or_create_user(db, request.phone_number)
    
    return {
        "success": True,
        "message": "登录成功",
        "user": {
            "id": str(user.id),
            "phone": user.phone_number,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "settings": user.settings
        }
    }
