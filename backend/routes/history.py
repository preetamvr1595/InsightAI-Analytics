from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dataset_service import load_history, save_history, load_dataset, UPLOADS_DIR

router = APIRouter()

@router.get("/history")
def get_history():
    return {"datasets": load_history()}

@router.delete("/history/{file_id}")
def delete_dataset(file_id: str):
    history = load_history()
    history = [h for h in history if h["id"] != file_id]
    save_history(history)
    path = os.path.join(UPLOADS_DIR, file_id)
    if os.path.exists(path):
        os.remove(path)
    return {"message": "Dataset deleted."}

@router.get("/history/{file_id}/preview")
def preview_dataset(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    return {
        "columns": df.columns.tolist(),
        "data": df.head(10).fillna("").astype(str).values.tolist()
    }

@router.get("/history/{file_id}/download")
def download_history_file(file_id: str):
    path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found.")
    history = load_history()
    entry = next((h for h in history if h["id"] == file_id), None)
    name = entry["name"] if entry else file_id
    return FileResponse(path, filename=name)
