# -*- coding: utf-8 -*-
"""
AI 财务咨询路由
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
import json

from database import get_db
from services.ai_advisor import chat_with_advisor, chat_with_advisor_stream

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" 或 "assistant"
    content: str


class ChatRequest(BaseModel):
    user_id: str
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    与 AI 财务顾问对话（非流式）
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        reply = await chat_with_advisor(db, request.user_id, messages)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 服务异常: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    与 AI 财务顾问对话（流式输出 SSE）
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    async def generate():
        try:
            async for chunk in chat_with_advisor_stream(db, request.user_id, messages):
                # SSE 格式: data: <json_encoded_content>\n\n
                # 使用 json.dumps 确保换行符等特殊字符被正确转义
                payload = json.dumps({"content": chunk})
                yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_payload = json.dumps({"error": str(e)})
            yield f"data: [ERROR] {error_payload}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
