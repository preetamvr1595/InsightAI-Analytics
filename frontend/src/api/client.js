const BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

export const api = {
  upload: async (file, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  getAnalyticsSummary: (id) => fetch(`${BASE}/analytics/${id}/summary`).then(r => r.json()),
  getCorrelation: (id) => fetch(`${BASE}/analytics/${id}/correlation`).then(r => r.json()),
  getHistogram: (id, col) => fetch(`${BASE}/analytics/${id}/histogram/${encodeURIComponent(col)}`).then(r => r.json()),
  getScatter: (id, x, y) => fetch(`${BASE}/analytics/${id}/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`).then(r => r.json()),
  getOutliers: (id, col) => fetch(`${BASE}/analytics/${id}/outliers/${encodeURIComponent(col)}`).then(r => r.json()),
  getCategorical: (id, col) => fetch(`${BASE}/analytics/${id}/categorical/${encodeURIComponent(col)}`).then(r => r.json()),
  fillMissing: (id, method) => fetch(`${BASE}/analytics/${id}/fill_missing?method=${method}`, { method: 'POST' }).then(r => r.json()),
  getFeatureImportance: (id, target) => fetch(`${BASE}/analytics/${id}/feature_importance?target=${encodeURIComponent(target)}`).then(r => r.json()),
  
  getExplorerData: (id, page=1, pageSize=50, search='', sortCol='', sortDir='asc') =>
    fetch(`${BASE}/explorer/${id}/data?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}&sort_col=${encodeURIComponent(sortCol)}&sort_dir=${sortDir}`).then(r => r.json()),
  getColumnInfo: (id, col) => fetch(`${BASE}/explorer/${id}/column/${encodeURIComponent(col)}`).then(r => r.json()),
  getSchema: (id) => fetch(`${BASE}/explorer/${id}/schema`).then(r => r.json()),
  downloadDataset: (id, fmt='csv') => { window.open(`${BASE}/explorer/${id}/download?fmt=${fmt}`, '_blank'); },
  
  getHistory: () => fetch(`${BASE}/history`).then(r => r.json()),
  deleteDataset: (id) => fetch(`${BASE}/history/${id}`, { method: 'DELETE' }).then(r => r.json()),
  getHistoryPreview: (id) => fetch(`${BASE}/history/${id}/preview`).then(r => r.json()),
  
  sendChat: (fileId, messages, query) =>
    fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, messages, query })
    }).then(r => r.json()),
  getChatColumns: (id) => fetch(`${BASE}/chat/${id}/columns`).then(r => r.json()),
  
  checkResearch: (id) => fetch(`${BASE}/research/${id}/check`).then(r => r.json()),
  classifyLearners: (id) => fetch(`${BASE}/research/${id}/classify`).then(r => r.json()),
  clusterStudents: (id) => fetch(`${BASE}/research/${id}/clustering`).then(r => r.json()),
  predictRisk: (id) => fetch(`${BASE}/research/${id}/risk`).then(r => r.json()),
  getRecommendations: (id, idx) => fetch(`${BASE}/research/${id}/recommendations/${idx}`).then(r => r.json()),
};
