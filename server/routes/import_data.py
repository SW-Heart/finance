from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Form
from services.import_service import parse_file
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_ai: bool = Form(False) 
):
    """
    Accepts a file upload (Excel/CSV) and returns parsed asset data.
    """
    logger.info(f"Received file upload: {file.filename}, use_ai={use_ai}")
    
    if not file.filename.endswith(('.csv', '.xls', '.xlsx')):
         raise HTTPException(status_code=400, detail="Invalid file type. Only CSV and Excel allowed.")

    try:
        content = await file.read()
        parsed_data = await parse_file(content, file.filename, use_ai)
        return {"success": True, "data": parsed_data}
    except Exception as e:
        logger.error(f"Upload processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class TextImportRequest(BaseModel):
    text: str
    use_ai: bool = False

@router.post("/paste")
async def paste_text(request: TextImportRequest):
    """
    Accepts raw text (CSV/TSV content) and returns parsed asset data.
    """
    logger.info(f"Received text paste, length={len(request.text)}, use_ai={request.use_ai}")
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")

    try:
        from services.import_service import parse_text
        parsed_data = await parse_text(request.text, request.use_ai)
        return {"success": True, "data": parsed_data}
    except Exception as e:
        logger.error(f"Paste processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
