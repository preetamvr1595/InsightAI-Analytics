#!/bin/bash
# Start AI Analytics Platform

echo "Starting AI Analytics Platform..."

# Start backend
echo "Starting Backend (FastAPI)..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend running at http://localhost:8000"

# Start frontend
echo "Starting Frontend (React)..."
cd ../frontend
npm install -q
npm start &
FRONTEND_PID=$!
echo "Frontend running at http://localhost:3000"

echo ""
echo "✓ AI Analytics Platform is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
