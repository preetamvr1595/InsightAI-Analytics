from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import json
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dataset_service import load_dataset, get_summary, get_descriptive_stats, get_column_types

router = APIRouter()

def safe_val(v):
    if v is None: return None
    if isinstance(v, float) and np.isnan(v): return None
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating,)): return float(v)
    return v

@router.get("/analytics/{file_id}/summary")
def analytics_summary(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    summary = get_summary(df)
    stats = get_descriptive_stats(df)
    col_types = get_column_types(df)
    
    # Missing per column
    missing_per_col = {col: int(df[col].isnull().sum()) for col in df.columns}
    
    return {
        "summary": summary,
        "descriptive_stats": stats,
        "column_types": col_types,
        "missing_per_column": missing_per_col,
        "columns": df.columns.tolist(),
        "dtypes": {col: str(df[col].dtype) for col in df.columns}
    }

@router.get("/analytics/{file_id}/correlation")
def get_correlation(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    numeric = df.select_dtypes(include=[np.number])
    if numeric.shape[1] < 2:
        return {"matrix": [], "columns": []}
    corr = numeric.corr()
    matrix = []
    for i, row in enumerate(corr.index):
        for j, col in enumerate(corr.columns):
            v = corr.iloc[i, j]
            matrix.append({"x": col, "y": row, "value": round(float(v), 4) if not np.isnan(v) else 0})
    return {"matrix": matrix, "columns": corr.columns.tolist()}

@router.get("/analytics/{file_id}/histogram/{column}")
def get_histogram(file_id: str, column: str, bins: int = 30):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    if column not in df.columns:
        raise HTTPException(404, "Column not found.")
    series = df[column].dropna()
    if not pd.api.types.is_numeric_dtype(series):
        counts = series.value_counts().head(20)
        return {"type": "bar", "labels": counts.index.tolist(), "values": counts.values.tolist()}
    counts, edges = np.histogram(series, bins=bins)
    labels = [f"{edges[i]:.2f}-{edges[i+1]:.2f}" for i in range(len(counts))]
    return {"type": "histogram", "labels": labels, "values": counts.tolist(), "edges": edges.tolist()}

@router.get("/analytics/{file_id}/scatter")
def get_scatter(file_id: str, x: str, y: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    subset = df[[x, y]].dropna().head(1000)
    return {"x": subset[x].tolist(), "y": subset[y].tolist(), "x_col": x, "y_col": y}

@router.get("/analytics/{file_id}/outliers/{column}")
def get_outliers(file_id: str, column: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    series = df[column].dropna()
    if not pd.api.types.is_numeric_dtype(series):
        raise HTTPException(400, "Column must be numeric.")
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - 1.5 * IQR
    upper = Q3 + 1.5 * IQR
    outliers = series[(series < lower) | (series > upper)]
    return {
        "outlier_count": len(outliers),
        "lower_bound": float(lower),
        "upper_bound": float(upper),
        "Q1": float(Q1),
        "Q3": float(Q3),
        "IQR": float(IQR),
        "values": series.tolist()[:500],
        "outlier_indices": outliers.index.tolist()[:100]
    }

@router.get("/analytics/{file_id}/categorical/{column}")
def get_categorical(file_id: str, column: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    counts = df[column].value_counts().head(20)
    return {"labels": counts.index.astype(str).tolist(), "values": counts.values.tolist()}

@router.post("/analytics/{file_id}/fill_missing")
def fill_missing(file_id: str, method: str = "mean"):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if method == "mean":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
    elif method == "median":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    elif method == "mode":
        for col in df.columns:
            df[col] = df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else df[col])
    elif method == "drop_rows":
        df = df.dropna()
    elif method == "drop_cols":
        df = df.dropna(axis=1)
    path = os.path.join("uploads", file_id)
    df.to_csv(path, index=False)
    return {"message": f"Missing values handled using {method}.", "remaining_missing": int(df.isnull().sum().sum())}

@router.get("/analytics/{file_id}/feature_importance")
def feature_importance(file_id: str, target: str):
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.preprocessing import LabelEncoder
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    if target not in df.columns:
        raise HTTPException(404, "Target column not found.")
    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target]
    if len(feature_cols) < 2:
        raise HTTPException(400, "Not enough numeric feature columns.")
    X = df[feature_cols].fillna(0)
    y = df[target].fillna(0)
    try:
        if pd.api.types.is_numeric_dtype(y):
            model = RandomForestRegressor(n_estimators=50, random_state=42)
        else:
            le = LabelEncoder()
            y = le.fit_transform(y.astype(str))
            model = RandomForestClassifier(n_estimators=50, random_state=42)
        model.fit(X, y)
        importances = model.feature_importances_
        result = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
        return {"features": [r[0] for r in result], "importances": [round(float(r[1]), 4) for r in result]}
    except Exception as e:
        raise HTTPException(500, str(e))
