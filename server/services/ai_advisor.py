# -*- coding: utf-8 -*-
"""
AI 财务咨询服务
使用 DeepSeek API 提供智能财务建议（支持流式输出）
"""
import os
import json
import httpx
from typing import List, Dict, Any, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from services.assets import get_all_asset_types, get_monthly_records
from datetime import datetime
from dateutil.relativedelta import relativedelta


DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


async def get_user_financial_summary(db: AsyncSession, user_id: str) -> str:
    """
    获取用户的完整财务数据摘要，用于 AI 上下文
    """
    # 获取资产类型
    asset_types = await get_all_asset_types(db, user_id)
    asset_type_map = {t["id"]: t for t in asset_types}
    
    # 获取所有月度记录
    all_records = await get_monthly_records(db, user_id)
    
    if not all_records:
        return "用户暂无任何资产记录。"
    
    # 整理数据
    records_by_month: Dict[str, List[Any]] = {}
    for record in all_records:
        month = record.record_date
        if month not in records_by_month:
            records_by_month[month] = []
        records_by_month[month].append(record)
    
    # 获取最近12个月的数据
    sorted_months = sorted(records_by_month.keys(), reverse=True)
    recent_months = sorted_months[:12]
    
    # 构建摘要
    summary_parts = []
    
    # 当前月份资产明细
    if recent_months:
        current_month = recent_months[0]
        summary_parts.append(f"## 当前月份 ({current_month}) 资产明细\n")
        
        # 按类别分组
        category_data = {"assets": [], "liabilities": []}
        
        for record in records_by_month[current_month]:
            asset_type = asset_type_map.get(record.asset_id, {})
            parent_category = asset_type.get("parentCategory", "assets")
            category_name = asset_type.get("category", "其他")
            asset_name = asset_type.get("name", "未知资产")
            
            item = {
                "name": asset_name,
                "category": category_name,
                "amount": float(record.amount),
                "currency": record.currency
            }
            
            if parent_category == "liabilities":
                category_data["liabilities"].append(item)
            else:
                category_data["assets"].append(item)
        
        # 资产明细
        total_assets = 0
        if category_data["assets"]:
            summary_parts.append("### 资产")
            assets_by_category = {}
            for item in category_data["assets"]:
                cat = item["category"]
                if cat not in assets_by_category:
                    assets_by_category[cat] = []
                assets_by_category[cat].append(item)
                total_assets += item["amount"]
            
            for cat, items in assets_by_category.items():
                cat_total = sum(i["amount"] for i in items)
                summary_parts.append(f"- {cat}: ¥{cat_total:,.2f}")
                for item in items:
                    summary_parts.append(f"  - {item['name']}: ¥{item['amount']:,.2f}")
        
        # 负债明细
        total_liabilities = 0
        if category_data["liabilities"]:
            summary_parts.append("\n### 负债")
            liabilities_by_category = {}
            for item in category_data["liabilities"]:
                cat = item["category"]
                if cat not in liabilities_by_category:
                    liabilities_by_category[cat] = []
                liabilities_by_category[cat].append(item)
                total_liabilities += item["amount"]
            
            for cat, items in liabilities_by_category.items():
                cat_total = sum(i["amount"] for i in items)
                summary_parts.append(f"- {cat}: ¥{cat_total:,.2f}")
                for item in items:
                    summary_parts.append(f"  - {item['name']}: ¥{item['amount']:,.2f}")
        
        # 净资产
        net_worth = total_assets - total_liabilities
        summary_parts.append(f"\n### 汇总")
        summary_parts.append(f"- 总资产: ¥{total_assets:,.2f}")
        summary_parts.append(f"- 总负债: ¥{total_liabilities:,.2f}")
        summary_parts.append(f"- 净资产: ¥{net_worth:,.2f}")
        
        # 计算月度增长趋势
        if len(recent_months) >= 2:
            summary_parts.append(f"\n## 近期资产变化趋势")
            
            for i, month in enumerate(recent_months[:6]):
                month_records = records_by_month[month]
                month_assets = 0
                month_liabilities = 0
                
                for record in month_records:
                    asset_type = asset_type_map.get(record.asset_id, {})
                    parent_category = asset_type.get("parentCategory", "assets")
                    if parent_category == "liabilities":
                        month_liabilities += float(record.amount)
                    else:
                        month_assets += float(record.amount)
                
                month_net = month_assets - month_liabilities
                
                if i == 0:
                    summary_parts.append(f"- {month}: 净资产 ¥{month_net:,.2f}")
                else:
                    prev_month = recent_months[i-1]
                    prev_records = records_by_month[prev_month]
                    prev_assets = 0
                    prev_liabilities = 0
                    
                    for record in prev_records:
                        asset_type = asset_type_map.get(record.asset_id, {})
                        parent_category = asset_type.get("parentCategory", "assets")
                        if parent_category == "liabilities":
                            prev_liabilities += float(record.amount)
                        else:
                            prev_assets += float(record.amount)
                    
                    prev_net = prev_assets - prev_liabilities
                    change = month_net - prev_net
                    change_str = f"+¥{change:,.2f}" if change >= 0 else f"-¥{abs(change):,.2f}"
                    summary_parts.append(f"- {month}: 净资产 ¥{month_net:,.2f} (环比{change_str})")
    
    return "\n".join(summary_parts)


def build_system_prompt(financial_summary: str) -> str:
    """
    构建 AI 系统提示词
    """
    return f"""你是一位专业的个人/家庭财务规划师和资产顾问。你的名字叫"小金"。

## 你的职责
1. 根据用户的资产数据，为用户提供个性化的财务分析和建议
2. 回答用户关于资产配置、投资理财、负债管理等方面的问题
3. 帮助用户制定财务目标和储蓄计划
4. 用通俗易懂的语言解释财务概念

## 用户当前的财务数据
{financial_summary}

## 回答原则
1. 基于用户的真实数据进行分析，不要编造数据
2. 给出具体、可操作的建议
3. 保持积极正面的态度，鼓励用户
4. 如果用户问到你不了解的信息，诚实告知
5. 使用中文回答
6. 适当使用 emoji 让回复更友好 🎯

## 输出格式要求（非常重要）
你必须使用 Markdown 格式来组织回复，确保内容清晰易读：

1. **段落分隔**：不同观点或主题之间用空行分隔
2. **使用标题**：用 `##` 或 `###` 来标记重要部分
3. **使用列表**：
   - 多个要点用无序列表 (`-` 或 `*`)
   - 步骤性内容用有序列表 (`1.` `2.` `3.`)
4. **强调关键信息**：用 `**粗体**` 标记重要数字和结论
5. **适当换行**：每个完整的意思表达后换行，不要把所有内容挤在一起

### 回复示例格式

## 📊 资产分析

根据你的数据，你当前的净资产是 **¥xxx,xxx**。

### 资产构成
- 流动资产：¥xx,xxx（占比 xx%）
- 固定资产：¥xx,xxx（占比 xx%）

### 💡 建议
1. 第一条建议
2. 第二条建议

如有更多问题，欢迎随时问我！
"""


async def chat_with_advisor_stream(
    db: AsyncSession,
    user_id: str,
    messages: List[Dict[str, str]]
) -> AsyncGenerator[str, None]:
    """
    与 AI 财务顾问对话（流式输出）
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        messages: 对话历史 [{"role": "user"|"assistant", "content": "..."}]
    
    Yields:
        AI 回复的文本片段
    """
    # 获取用户财务摘要
    financial_summary = await get_user_financial_summary(db, user_id)
    
    # 构建系统提示词
    system_prompt = build_system_prompt(financial_summary)
    
    # 构建完整的消息列表
    full_messages = [
        {"role": "system", "content": system_prompt}
    ] + messages
    
    # 调用 DeepSeek API（流式）
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": full_messages,
                "temperature": 0.7,
                "max_tokens": 1500,
                "stream": True
            }
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise Exception(f"DeepSeek API 调用失败: {response.status_code} - {error_text.decode()}")
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # 去掉 "data: " 前缀
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue


# 保留非流式版本作为备用
async def chat_with_advisor(
    db: AsyncSession,
    user_id: str,
    messages: List[Dict[str, str]]
) -> str:
    """
    与 AI 财务顾问对话（非流式）
    """
    financial_summary = await get_user_financial_summary(db, user_id)
    system_prompt = build_system_prompt(financial_summary)
    
    full_messages = [
        {"role": "system", "content": system_prompt}
    ] + messages
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": full_messages,
                "temperature": 0.7,
                "max_tokens": 1500
            }
        )
        
        if response.status_code != 200:
            error_msg = response.text
            raise Exception(f"DeepSeek API 调用失败: {response.status_code} - {error_msg}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
