from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os, uuid, json
from datetime import datetime
import pandas as pd
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dataset_service import (
    get_summary, get_quality_report, detect_dataset_type,
    load_history, save_history, UPLOADS_DIR
)

router = APIRouter()
MAX_SIZE = 100 * 1024 * 1024  # 100MB

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    allowed = ["csv", "xlsx", "xls"]
    ext = file.filename.split(".")[-1].lower()
    if ext not in allowed:
        raise HTTPException(400, "Unsupported file format. Use CSV or Excel.")
    
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File exceeds 100MB limit.")
    if len(content) == 0:
        raise HTTPException(400, "File is empty.")
    
    file_id = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOADS_DIR, file_id)
    
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        if ext == "csv":
            try:
                df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
            except:
                df = pd.read_csv(file_path, encoding='latin-1', on_bad_lines='skip')
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(400, f"File could not be read: {str(e)}")
    
    if df.empty or len(df.columns) == 0:
        os.remove(file_path)
        raise HTTPException(400, "Dataset appears to be empty.")
    
    summary = get_summary(df)
    quality = get_quality_report(df)
    dataset_type = detect_dataset_type(df)
    
    preview_cols = df.columns.tolist()
    preview_data = df.head(20).fillna("").astype(str).values.tolist()
    
    history = load_history()
    entry = {
        "id": file_id,
        "name": file.filename,
        "upload_date": datetime.now().isoformat(),
        "rows": summary["rows"],
        "columns": summary["columns"],
        "size_bytes": len(content),
        "size_mb": round(len(content) / 1024 / 1024, 2),
        "file_type": ext.upper(),
        "dataset_type": dataset_type
    }
    history.insert(0, entry)
    save_history(history)
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "summary": summary,
        "quality_report": quality,
        "dataset_type": dataset_type,
        "preview": {
            "columns": preview_cols,
            "data": preview_data
        }
    }

@router.get("/dataset/{file_id}/preview")
def get_preview(file_id: str, rows: int = 20):
    from services.dataset_service import load_dataset
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    preview = df.head(rows).fillna("").astype(str)
    return {
        "columns": df.columns.tolist(),
        "data": preview.values.tolist(),
        "total_rows": len(df)
    }
