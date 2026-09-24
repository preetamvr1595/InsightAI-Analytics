from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dataset_service import load_dataset, get_column_types

router = APIRouter()

EDUCATIONAL_KEYWORDS = ["student", "marks", "grade", "score", "exam", "quiz", "assignment", "study_hours", "attendance", "gpa", "cgpa", "performance"]

def detect_educational(df: pd.DataFrame):
    cols_lower = [c.lower() for c in df.columns]
    score_cols = [c for c in df.columns if any(k in c.lower() for k in EDUCATIONAL_KEYWORDS)]
    numeric_score_cols = [c for c in score_cols if pd.api.types.is_numeric_dtype(df[c])]
    return len(numeric_score_cols) > 0, numeric_score_cols

def compute_lsi(df: pd.DataFrame, score_cols: list) -> pd.Series:
    norm = pd.DataFrame()
    for col in score_cols:
        s = df[col].fillna(df[col].median())
        mn, mx = s.min(), s.max()
        norm[col] = (s - mn) / (mx - mn) if mx != mn else s * 0
    
    avg_score = norm.mean(axis=1)
    
    if len(score_cols) >= 2:
        first_half = norm[score_cols[:len(score_cols)//2]].mean(axis=1)
        second_half = norm[score_cols[len(score_cols)//2:]].mean(axis=1)
        improvement = (second_half - first_half + 1) / 2
    else:
        improvement = avg_score
    
    std_scores = norm.std(axis=1).fillna(0)
    consistency = 1 - std_scores
    
    lsi = 0.5 * avg_score + 0.3 * improvement + 0.2 * consistency
    return lsi.clip(0, 1)

def classify_learner(lsi: float) -> str:
    if lsi > 0.75: return "Fast Learner"
    if lsi > 0.50: return "Moderate Learner"
    if lsi > 0.30: return "Slow Learner"
    return "Struggling Learner"

@router.get("/research/{file_id}/check")
def check_compatibility(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    is_educational, score_cols = detect_educational(df)
    return {"is_educational": is_educational, "detected_columns": score_cols, "total_columns": df.columns.tolist()}

@router.get("/research/{file_id}/classify")
def classify_learners(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    _, score_cols = detect_educational(df)
    if not score_cols:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            raise HTTPException(400, "No numeric columns for analysis.")
        score_cols = numeric_cols[:5]
    
    lsi = compute_lsi(df, score_cols)
    categories = lsi.apply(classify_learner)
    counts = categories.value_counts().to_dict()
    
    id_col = next((c for c in df.columns if "id" in c.lower()), None)
    students = []
    for i in range(min(len(df), 200)):
        sid = str(df.iloc[i][id_col]) if id_col else str(i+1)
        students.append({
            "id": sid,
            "lsi": round(float(lsi.iloc[i]), 3),
            "category": categories.iloc[i],
            "scores": {c: round(float(df.iloc[i][c]),2) if pd.notna(df.iloc[i][c]) else None for c in score_cols[:5]}
        })
    
    return {
        "summary": counts,
        "lsi_distribution": {"values": lsi.round(3).tolist()[:500]},
        "students": students,
        "score_columns": score_cols
    }

@router.get("/research/{file_id}/clustering")
def cluster_students(file_id: str, n_clusters: int = 4):
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    numeric = df.select_dtypes(include=[np.number]).fillna(0)
    if len(numeric.columns) < 2:
        raise HTTPException(400, "Need at least 2 numeric columns.")
    scaler = StandardScaler()
    X = scaler.fit_transform(numeric.head(2000))
    km = KMeans(n_clusters=min(n_clusters, len(X)), random_state=42, n_init=10)
    labels = km.fit_predict(X)
    
    from sklearn.decomposition import PCA
    pca = PCA(n_components=2)
    coords = pca.fit_transform(X)
    
    return {
        "clusters": labels.tolist(),
        "x": coords[:,0].tolist(),
        "y": coords[:,1].tolist(),
        "n_clusters": n_clusters,
        "explained_variance": float(pca.explained_variance_ratio_.sum())
    }

@router.get("/research/{file_id}/risk")
def predict_risk(file_id: str):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    _, score_cols = detect_educational(df)
    if not score_cols:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        score_cols = numeric_cols[:5] if numeric_cols else []
    if not score_cols:
        raise HTTPException(400, "No numeric columns.")
    
    lsi = compute_lsi(df, score_cols)
    risk = 1 - lsi
    id_col = next((c for c in df.columns if "id" in c.lower()), None)
    
    high_risk = []
    for i in range(len(df)):
        if risk.iloc[i] > 0.7:
            sid = str(df.iloc[i][id_col]) if id_col else str(i+1)
            high_risk.append({"id": sid, "risk": round(float(risk.iloc[i]),3), "lsi": round(float(lsi.iloc[i]),3)})
    
    high_risk.sort(key=lambda x: x["risk"], reverse=True)
    return {"high_risk_students": high_risk[:20], "total_high_risk": len(high_risk), "risk_distribution": risk.round(3).tolist()[:300]}

@router.get("/research/{file_id}/recommendations/{student_index}")
def get_recommendations(file_id: str, student_index: int):
    df = load_dataset(file_id)
    if df is None:
        raise HTTPException(404, "Dataset not found.")
    _, score_cols = detect_educational(df)
    if not score_cols:
        score_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:5]
    if student_index >= len(df):
        raise HTTPException(404, "Student not found.")
    lsi = compute_lsi(df, score_cols)
    category = classify_learner(lsi.iloc[student_index])
    
    recs = {
        "Fast Learner": ["Explore advanced topics and research projects.", "Mentor peers and lead study groups.", "Consider accelerated coursework."],
        "Moderate Learner": ["Focus on consistent practice and review.", "Seek feedback on weaker areas.", "Set measurable weekly goals."],
        "Slow Learner": ["Increase practice frequency and review sessions.", "Use additional learning resources and tutorials.", "Schedule regular check-ins with instructor."],
        "Struggling Learner": ["Seek immediate academic support and tutoring.", "Break material into smaller, manageable segments.", "Consider foundational course review."]
    }
    
    id_col = next((c for c in df.columns if "id" in c.lower()), None)
    sid = str(df.iloc[student_index][id_col]) if id_col else str(student_index+1)
    
    return {
        "student_id": sid,
        "category": category,
        "lsi": round(float(lsi.iloc[student_index]), 3),
        "recommendations": recs[category]
    }
