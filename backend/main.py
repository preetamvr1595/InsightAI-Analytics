from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routes import upload, analytics, explorer, history, chat, research

app = FastAPI(title="AI Analytics Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(explorer.router, prefix="/api", tags=["explorer"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(research.router, prefix="/api", tags=["research"])

@app.get("/")
def root():
    return {"status": "AI Analytics Platform Running"}
