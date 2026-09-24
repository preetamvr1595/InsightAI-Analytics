import pandas as pd
import numpy as np
import json
import os
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List
import warnings
warnings.filterwarnings('ignore')

HISTORY_FILE = "data/history.json"
UPLOADS_DIR = "uploads"

def load_history() -> List[Dict]:
    os.makedirs("data", exist_ok=True)
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []

def save_history(history: List[Dict]):
    os.makedirs("data", exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2, default=str)

def load_dataset(file_id: str) -> Optional[pd.DataFrame]:
    path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(path):
        return None
    ext = file_id.split(".")[-1].lower()
    try:
        if ext == "csv":
            return pd.read_csv(path, encoding='utf-8', on_bad_lines='skip')
        elif ext in ["xlsx", "xls"]:
            return pd.read_excel(path)
    except:
        try:
            if ext == "csv":
                return pd.read_csv(path, encoding='latin-1', on_bad_lines='skip')
        except:
            pass
    return None

def get_column_types(df: pd.DataFrame) -> Dict[str, List[str]]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    bool_cols = df.select_dtypes(include=['bool']).columns.tolist()
    date_cols = []
    for col in df.columns:
        if col not in numeric_cols + categorical_cols + bool_cols:
            date_cols.append(col)
        elif df[col].dtype == object:
            try:
                pd.to_datetime(df[col].dropna().head(10))
                if col in categorical_cols:
                    categorical_cols.remove(col)
                date_cols.append(col)
            except:
                pass
    return {
        "numeric": numeric_cols,
        "categorical": categorical_cols,
        "datetime": date_cols,
        "boolean": bool_cols
    }

def get_summary(df: pd.DataFrame) -> Dict[str, Any]:
    col_types = get_column_types(df)
    missing = int(df.isnull().sum().sum())
    total_cells = df.shape[0] * df.shape[1]
    missing_pct = round(missing / total_cells * 100, 2) if total_cells > 0 else 0
    size_bytes = df.memory_usage(deep=True).sum()
    
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "numeric_columns": len(col_types["numeric"]),
        "categorical_columns": len(col_types["categorical"]),
        "date_columns": len(col_types["datetime"]),
        "boolean_columns": len(col_types["boolean"]),
        "missing_values": missing,
        "missing_percentage": missing_pct,
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_usage_bytes": int(size_bytes),
        "memory_usage_mb": round(size_bytes / 1024 / 1024, 2),
        "column_types": col_types
    }

def get_quality_report(df: pd.DataFrame) -> List[Dict]:
    report = []
    for col in df.columns:
        missing = int(df[col].isnull().sum())
        unique = int(df[col].nunique())
        dtype = str(df[col].dtype)
        mem = int(df[col].memory_usage(deep=True))
        report.append({
            "column": col,
            "data_type": dtype,
            "missing_values": missing,
            "missing_pct": round(missing / len(df) * 100, 2),
            "unique_values": unique,
            "memory_bytes": mem
        })
    return report

def get_descriptive_stats(df: pd.DataFrame) -> Dict:
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.empty:
        return {}
    desc = numeric_df.describe().to_dict()
    result = {}
    for col, stats in desc.items():
        result[col] = {k: round(float(v), 4) if not np.isnan(v) else None for k, v in stats.items()}
        result[col]["median"] = round(float(numeric_df[col].median()), 4)
        try:
            result[col]["mode"] = round(float(numeric_df[col].mode()[0]), 4)
        except:
            result[col]["mode"] = None
        result[col]["skewness"] = round(float(numeric_df[col].skew()), 4)
        result[col]["kurtosis"] = round(float(numeric_df[col].kurtosis()), 4)
    return result

def detect_dataset_type(df: pd.DataFrame) -> str:
    cols_lower = [c.lower() for c in df.columns]
    keywords = {
        "Student Performance": ["student", "marks", "grade", "score", "exam", "quiz", "assignment", "attendance", "gpa"],
        "Sales/Revenue": ["sales", "revenue", "profit", "price", "customer", "order", "product", "quantity"],
        "Healthcare": ["patient", "diagnosis", "treatment", "age", "blood", "heart", "medical", "hospital"],
        "Financial": ["stock", "price", "volume", "market", "equity", "return", "portfolio", "risk"],
        "HR/Employee": ["employee", "salary", "department", "hire", "performance", "rating", "tenure"],
        "E-commerce": ["product", "category", "rating", "review", "purchase", "cart", "user"],
    }
    scores = {}
    for dtype, words in keywords.items():
        score = sum(1 for w in words if any(w in c for c in cols_lower))
        if score > 0:
            scores[dtype] = score
    if scores:
        return max(scores, key=scores.get)
    return "General Dataset"

def safe_json(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj) if not np.isnan(obj) else None
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return str(obj)
    return obj
