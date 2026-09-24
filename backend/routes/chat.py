"""
chat.py — Fixed: proper JSON parsing, never shows raw JSON as text
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx, os, uuid, sys, json, re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.file_parser import parse_file
from services.report_generator import generate_pdf, generate_docx, generate_csv, generate_excel
from services.dataset_service import load_dataset, get_column_types, UPLOADS_DIR

router = APIRouter()

OLLAMA_URL     = "http://localhost:11434/api/chat"
OLLAMA_MODEL   = "gpt-oss:20b-cloud"
OLLAMA_TIMEOUT = 300.0

CHAT_UPLOADS_DIR = "chat_uploads"
os.makedirs(CHAT_UPLOADS_DIR, exist_ok=True)
SUPPORTED_EXTENSIONS = {"pdf","docx","doc","txt","md","json","csv","xlsx","xls"}


class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    query: str
    file_id: Optional[str] = None
    file_context: Optional[str] = None
    file_name: Optional[str] = None

class ReportRequest(BaseModel):
    messages: List[Dict[str, Any]]
    format: str


def detect_chart_intent(query: str) -> Optional[str]:
    q = query.lower()
    if any(w in q for w in ["pie chart","pie graph","in pie","as pie"]):            return "pie"
    if any(w in q for w in ["bar chart","bar graph","in bar","as bar","barchart"]): return "bar"
    if any(w in q for w in ["line chart","line graph","in line","trend"]):          return "line"
    return None

def detect_table_intent(query: str) -> bool:
    q = query.lower()
    return any(w in q for w in ["table","tabular","in table","as table","list","show","display","top","give me"])


def build_system_prompt(file_context, file_name, chart_type, want_table):
    # Very simple direct prompt — no JSON template to confuse the model
    lines = [
        "You are a data analyst. Respond ONLY with a valid JSON object.",
        "No text before or after JSON. No markdown. No code blocks. Just the JSON.",
        "",
        "Required JSON keys:",
        '  "summary": string (2-3 sentences)',
        '  "bullets": array of strings (max 4 points)',
        '  "chart": object with keys: type (bar/pie/line/none), title, labels (array), values (array of numbers)',
        '  "table": object with keys: columns (array of strings), rows (array of arrays) OR null',
        '  "followup": string (a follow-up question suggestion)',
        "",
    ]

    if chart_type:
        lines.append(f'Set chart.type = "{chart_type}". Fill chart.labels and chart.values with real data from the dataset.')
    else:
        lines.append('Set chart.type = "none", chart.labels = [], chart.values = []')

    if want_table:
        lines.append('Fill table.columns and table.rows with real data.')
    else:
        lines.append('Set table = null')

    if file_context:
        lines.append("")
        lines.append(f"Dataset: {file_name or 'data'}")
        lines.append("Data:")
        lines.append(file_context[:6000])
        lines.append("Use ONLY this data to answer the user query.")

    return "\n".join(lines)


def extract_json(raw: str) -> Dict[str, Any]:
    """Try every possible way to extract JSON from model output."""
    if not raw or not raw.strip():
        return None

    text = raw.strip()

    # Remove thinking tags
    text = re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.DOTALL).strip()
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

    # Remove markdown fences
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = text.strip()

    # Try 1: direct parse
    try:
        result = json.loads(text)
        if isinstance(result, dict) and 'summary' in result:
            return result
    except:
        pass

    # Try 2: find { ... } block
    try:
        start = text.index('{')
        depth = 0
        end = start
        for i in range(start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        chunk = text[start:end]
        result = json.loads(chunk)
        if isinstance(result, dict):
            return result
    except:
        pass

    # Try 3: fix truncated JSON by finding last complete key-value
    try:
        start = text.index('{')
        chunk = text[start:]
        # Close any open brackets
        opens = chunk.count('{') - chunk.count('}')
        arr_opens = chunk.count('[') - chunk.count(']')
        chunk += ']' * max(0, arr_opens) + '}' * max(0, opens)
        result = json.loads(chunk)
        if isinstance(result, dict):
            return result
    except:
        pass

    return None


async def call_ollama_raw(system_prompt: str, messages: List[Message], query: str) -> str:
    ollama_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages[-4:]:
        ollama_messages.append({"role": msg.role, "content": msg.content})
    ollama_messages.append({"role": "user", "content": query})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 1500,
            "num_ctx": 6000,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            raw = response.json()["message"]["content"]
            print(f"\n===RAW===\n{raw[:1000]}\n===END===\n")
            return raw
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is not running.")
    except httpx.TimeoutException:
        raise HTTPException(504, "Ollama timed out. Try a shorter question.")
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")


@router.post("/chat")
async def chat(req: ChatRequest):
    file_context = req.file_context
    file_name    = req.file_name

    if req.file_id and not file_context:
        df = load_dataset(req.file_id)
        if df is not None:
            from services.file_parser import _dataframe_to_text
            r            = _dataframe_to_text(df)
            file_context = r["text"]
            file_name    = req.file_id

    chart_type = detect_chart_intent(req.query)
    want_table = detect_table_intent(req.query)
    sys_prompt = build_system_prompt(file_context, file_name, chart_type, want_table)

    raw    = await call_ollama_raw(sys_prompt, req.messages, req.query)
    parsed = extract_json(raw)

    # ── If JSON parse succeeded ──────────────────────────────
    if parsed:
        # Normalize chart
        chart = parsed.get("chart")
        if not isinstance(chart, dict):
            chart = None
        elif chart.get("type") in (None, "none", "") or not chart.get("labels") or not chart.get("values"):
            chart = None

        # Normalize table
        table = parsed.get("table")
        if not isinstance(table, dict) or not table.get("columns") or not table.get("rows"):
            table = None

        # Build text from summary + bullets
        summary = parsed.get("summary", "")
        bullets = parsed.get("bullets", [])
        if not isinstance(bullets, list):
            bullets = []
        text = summary
        if bullets:
            text += "\n" + "\n".join(f"• {b}" for b in bullets if b)

        return {
            "text":     text,
            "chart":    chart,
            "table":    table,
            "followup": parsed.get("followup", ""),
            "role":     "assistant"
        }

    # ── If JSON parse FAILED — return raw text cleaned up ───
    # Remove any JSON-looking parts and just show readable text
    clean = re.sub(r'\{.*?\}', '', raw, flags=re.DOTALL).strip()
    if not clean:
        clean = raw.strip()
    # If still looks like JSON, just show a friendly message
    if clean.startswith('{') or '"summary"' in clean:
        clean = "I analyzed your data but had a formatting issue. Please try rephrasing your question."

    return {
        "text":     clean,
        "chart":    None,
        "table":    None,
        "followup": "Could you rephrase your question?",
        "role":     "assistant"
    }


@router.post("/chat/upload-file")
async def upload_file_for_chat(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: .{ext}")
    content = await file.read()
    if not content: raise HTTPException(400, "File is empty.")
    if len(content) > 50*1024*1024: raise HTTPException(400, "File too large. Max 50MB.")
    temp_path = os.path.join(CHAT_UPLOADS_DIR, f"{uuid.uuid4().hex}.{ext}")
    with open(temp_path, "wb") as f: f.write(content)
    result = parse_file(temp_path, file.filename)
    try: os.remove(temp_path)
    except: pass
    if result["error"]: raise HTTPException(422, f"Could not parse: {result['error']}")
    return {"file_name": file.filename, "file_type": ext.upper(),
            "context": result["text"], "metadata": result["metadata"],
            "chars": len(result["text"]), "success": True}


@router.post("/chat/download-report")
async def download_report(req: ReportRequest):
    fmt = req.format.lower()
    msgs = req.messages
    if fmt == "pdf":
        return Response(content=generate_pdf(msgs), media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=InsightAI_Report.pdf"})
    elif fmt == "docx":
        return Response(content=generate_docx(msgs),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=InsightAI_Report.docx"})
    elif fmt == "csv":
        return Response(content=generate_csv(msgs), media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=InsightAI_Report.csv"})
    elif fmt == "xlsx":
        return Response(content=generate_excel(msgs),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=InsightAI_Report.xlsx"})
    else:
        raise HTTPException(400, f"Unknown format: {fmt}")


@router.get("/chat/{file_id}/columns")
def get_columns(file_id: str):
    df = load_dataset(file_id)
    if df is None: raise HTTPException(404, "Dataset not found.")
    return {"columns": df.columns.tolist(), "column_types": get_column_types(df), "rows": len(df)}


@router.get("/chat/health")
async def ollama_health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("http://localhost:11434/api/tags")
            models = r.json().get("models", [])
            names  = [m["name"] for m in models]
            return {"ollama_running": True, "models_available": names,
                    "llama3_ready": any("gpt-oss" in n or "llama3" in n or "gemma" in n for n in names)}
    except:
        return {"ollama_running": False, "models_available": [], "llama3_ready": False}