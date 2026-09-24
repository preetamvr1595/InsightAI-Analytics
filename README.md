# AI-Powered Data Analytics Platform

A full-stack, production-ready analytics platform with 6 complete pages.

## Pages

| Page | Feature |
|------|---------|
| 1 | Dataset Upload & Initial Analysis |
| 2 | Automated Analytics Dashboard |
| 3 | AI Research Engine (Learning Analytics) |
| 4 | AI Dataset Chat Assistant |
| 5 | Dataset Explorer (Interactive Viewer) |
| 6 | Dataset History & Management |

## Tech Stack

- **Frontend**: React 18, Recharts, CSS custom properties
- **Backend**: Python, FastAPI, pandas, numpy, scikit-learn
- **Storage**: Local filesystem + JSON metadata

## Setup & Run

### Option 1: Automatic
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

## Features

### Page 1 – Upload
- Drag & drop CSV/Excel files
- File validation (format, size, encoding)
- Dataset preview (first 20 rows)
- Quality report (missing values, dtypes)
- Dataset type auto-detection

### Page 2 – Analytics Dashboard
- Descriptive statistics
- Correlation heatmap
- Distribution histograms
- Scatter plots
- Outlier detection (IQR)
- Missing value handling
- Feature importance (Random Forest)

### Page 3 – AI Research Engine
- Learning Speed Index (LSI) computation
- Learner classification (Fast/Moderate/Slow/Struggling)
- K-Means clustering with PCA visualization
- Performance risk prediction
- AI-generated recommendations

### Page 4 – AI Chat Assistant
- Natural language dataset queries
- Automatic analysis (correlation, stats, filters, top-N)
- Table and chart responses
- Context-aware conversation

### Page 5 – Dataset Explorer
- Paginated table view (50 rows/page)
- Global search + column sort
- Column details panel with mini charts
- Dataset schema viewer
- CSV/Excel download

### Page 6 – History Management
- Full dataset history list
- Metadata tracking (rows, cols, size, date)
- Dataset preview
- Reopen in analytics
- Delete with confirmation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload dataset |
| GET | /api/analytics/{id}/summary | Get analytics summary |
| GET | /api/analytics/{id}/correlation | Correlation matrix |
| GET | /api/analytics/{id}/histogram/{col} | Column histogram |
| GET | /api/analytics/{id}/outliers/{col} | Outlier analysis |
| GET | /api/analytics/{id}/feature_importance | Feature importance |
| GET | /api/explorer/{id}/data | Paginated data |
| GET | /api/explorer/{id}/column/{col} | Column info |
| GET | /api/explorer/{id}/download | Download dataset |
| POST | /api/chat | AI chat query |
| GET | /api/research/{id}/classify | Classify learners |
| GET | /api/research/{id}/clustering | K-Means clustering |
| GET | /api/research/{id}/risk | Risk prediction |
| GET | /api/history | Get dataset history |
| DELETE | /api/history/{id} | Delete dataset |

## File Structure

```
ai-analytics-platform/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── routes/
│   │   ├── upload.py        # Upload endpoint
│   │   ├── analytics.py     # Analytics endpoints
│   │   ├── explorer.py      # Explorer endpoints
│   │   ├── chat.py          # AI chat endpoint
│   │   ├── research.py      # Research endpoints
│   │   └── history.py       # History endpoints
│   ├── services/
│   │   └── dataset_service.py  # Core data processing
│   ├── uploads/             # Dataset files
│   ├── data/                # Metadata JSON
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── index.css
    │   ├── api/client.js
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   └── Charts.js
    │   └── pages/
    │       ├── Page1Upload.js
    │       ├── Page2Analytics.js
    │       ├── Page3Research.js
    │       ├── Page4Chat.js
    │       ├── Page5Explorer.js
    │       └── Page6History.js
    └── package.json
```
