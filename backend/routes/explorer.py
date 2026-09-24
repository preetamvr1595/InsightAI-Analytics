from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import io, os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dataset_service import load_dataset

router = APIRouter()

@router.get("/explorer/{file_id}/data")
def get_data(file_id: str, page: int = 1, page_size: int = 50, search: str = "", sort_col: str = "", sort_dir: str = "asc"):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    
    if search:
        mask = df.astype(str).apply(lambda row: row.str.contains(search, case=False, na=False)).any(axis=1)
        df = df[mask]
    
    if sort_col and sort_col in df.columns:
        asc = sort_dir == "asc"
        try:
            df = df.sort_values(sort_col, ascending=asc)
        except:
            pass
    
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]
    
    return {
        "columns": df.columns.tolist(),
        "data": page_df.fillna("").astype(str).values.tolist(),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/explorer/{file_id}/column/{column}")
def get_column_info(file_id: str, column: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    if column not in df.columns:
        raise HTTPException(404, "Column not found.")
    series = df[column]
    info = {
        "name": column,
        "dtype": str(series.dtype),
        "missing": int(series.isnull().sum()),
        "unique": int(series.nunique()),
        "total": len(series)
    }
    if pd.api.types.is_numeric_dtype(series):
        info["min"] = float(series.min()) if not np.isnan(series.min()) else None
        info["max"] = float(series.max()) if not np.isnan(series.max()) else None
        info["mean"] = float(series.mean()) if not np.isnan(series.mean()) else None
        counts, edges = np.histogram(series.dropna(), bins=20)
        info["histogram"] = {"values": counts.tolist(), "edges": [round(float(e),2) for e in edges.tolist()]}
    else:
        counts = series.value_counts().head(10)
        info["top_values"] = {"labels": counts.index.astype(str).tolist(), "values": counts.values.tolist()}
    return info

@router.get("/explorer/{file_id}/download")
def download_dataset(file_id: str, fmt: str = "csv"):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    if fmt == "csv":
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(io.BytesIO(buf.read().encode()), media_type="text/csv",
                                 headers={"Content-Disposition": f"attachment; filename={file_id}.csv"})
    else:
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 headers={"Content-Disposition": f"attachment; filename={file_id}.xlsx"})

@router.get("/explorer/{file_id}/schema")
def get_schema(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    schema = []
    for col in df.columns:
        schema.append({"column": col, "dtype": str(df[col].dtype), "missing": int(df[col].isnull().sum()), "unique": int(df[col].nunique())})
    return {"schema": schema}
