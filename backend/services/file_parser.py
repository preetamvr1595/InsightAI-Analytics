"""
file_parser.py — Universal parser for PDF, DOCX, TXT, JSON, CSV, Excel
Keeps extracted text SHORT (8000 chars) so Ollama responds fast.
"""

import os
import json
from typing import Dict, Any
import pandas as pd


def parse_file(file_path: str, original_filename: str = "") -> Dict[str, Any]:
    ext = _get_extension(file_path, original_filename)
    parsers = {
        "pdf":  _parse_pdf,
        "docx": _parse_docx,
        "doc":  _parse_docx,
        "txt":  _parse_txt,
        "md":   _parse_txt,
        "json": _parse_json,
        "csv":  _parse_csv,
        "xlsx": _parse_excel,
        "xls":  _parse_excel,
    }
    parser = parsers.get(ext)
    if not parser:
        return {"text": "", "metadata": {"filename": original_filename, "type": ext}, "error": f"Unsupported: .{ext}"}
    try:
        result = parser(file_path)
        result["metadata"]["filename"] = original_filename
        result["metadata"]["type"]     = ext
        result["error"] = None
        return result
    except Exception as e:
        return {"text": "", "metadata": {"filename": original_filename, "type": ext}, "error": str(e)}


def _parse_pdf(path: str) -> Dict[str, Any]:
    import fitz
    doc   = fitz.open(path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append(f"[Page {i+1}]\n{text}")
        if len("\n\n".join(pages)) > 12000:   # stop early once we have enough
            break
    full_text = "\n\n".join(pages)
    return {"text": full_text[:12000], "metadata": {"pages": doc.page_count, "chars": len(full_text)}}


def _parse_docx(path: str) -> Dict[str, Any]:
    from docx import Document
    doc   = Document(path)
    paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paras)
    return {"text": full_text[:12000], "metadata": {"paragraphs": len(paras), "chars": len(full_text)}}


def _parse_txt(path: str) -> Dict[str, Any]:
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            with open(path, "r", encoding=enc) as f:
                text = f.read()
            break
        except UnicodeDecodeError:
            text = ""
    return {"text": text[:12000], "metadata": {"chars": len(text)}}


def _parse_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    pretty = json.dumps(data, indent=2, default=str)
    meta   = {"keys": list(data.keys()) if isinstance(data, dict) else f"{len(data)} records"}
    return {"text": pretty[:12000], "metadata": meta}


def _parse_csv(path: str) -> Dict[str, Any]:
    try:
        df = pd.read_csv(path, encoding="utf-8", on_bad_lines="skip")
    except Exception:
        df = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip")
    return _dataframe_to_text(df)


def _parse_excel(path: str) -> Dict[str, Any]:
    xl     = pd.ExcelFile(path)
    sheets = xl.sheet_names
    df     = xl.parse(sheets[0])
    result = _dataframe_to_text(df)
    result["metadata"]["sheets"] = sheets
    return result


def _dataframe_to_text(df: pd.DataFrame) -> Dict[str, Any]:
    lines = []
    lines.append(f"Rows: {len(df)} | Columns: {len(df.columns)}")
    lines.append(f"Columns: {', '.join(df.columns.tolist())}")
    lines.append("")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        lines.append("--- Statistics ---")
        lines.append(df[numeric_cols].describe().round(2).to_string())
        lines.append("")

    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if not missing.empty:
        lines.append("--- Missing Values ---")
        for col, cnt in missing.items():
            lines.append(f"  {col}: {cnt} missing")
        lines.append("")

    lines.append("--- Sample (first 20 rows) ---")
    lines.append(df.head(20).fillna("").astype(str).to_string(index=False))

    full_text = "\n".join(lines)
    return {
        "text": full_text[:12000],
        "metadata": {
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "column_names": df.columns.tolist(),
            "numeric_cols": numeric_cols,
            "missing_total": int(df.isnull().sum().sum()),
        }
    }


def _get_extension(file_path: str, original_filename: str = "") -> str:
    name = original_filename or file_path
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""