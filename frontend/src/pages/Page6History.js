import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { History, Database, FileSpreadsheet, FileText, HardDrive, Trash2, ExternalLink } from 'lucide-react';

export default function Page6History({ dataset, onDatasetLoaded, onNav }) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    api.getHistory().then(d => setHistory(d.datasets || []));
  };

  const handleSelect = (entry) => {
    setSelected(entry);
    setPreview(null);
    api.getHistoryPreview(entry.id).then(setPreview).catch(() => setPreview({ error: true }));
  };

  const handleDelete = (id) => {
    api.deleteDataset(id).then(() => {
      setHistory(h => h.filter(e => e.id !== id));
      if (selected?.id === id) { setSelected(null); setPreview(null); }
      setConfirmDelete(null);
    });
  };

  const handleOpen = async (entry) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/analytics/${entry.id}/summary`);
      const summary = await res.json();
      const previewRes = await fetch(`http://localhost:8000/api/dataset/${entry.id}/preview`);
      const previewData = await previewRes.json();
      onDatasetLoaded({
        file_id: entry.id,
        filename: entry.name,
        summary: summary.summary,
        quality_report: [],
        dataset_type: entry.dataset_type || 'General Dataset',
        preview: { columns: previewData.columns, data: previewData.data }
      });
    } catch {
      alert('Could not load dataset.');
    }
    setLoading(false);
  };

  const filtered = history.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)}KB`;
    return `${(bytes/1024/1024).toFixed(2)}MB`;
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex gap-12"><History className="sidebar-icon" size={32} /> Dataset History</h1>
          <p className="page-sub">Manage and access previously uploaded datasets.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNav(1)}>+ Upload New</button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-32">
        {[
          { l: 'Total Datasets', v: history.length, i: Database, c: 'var(--accent2)' },
          { l: 'CSV Files', v: history.filter(h => h.file_type === 'CSV').length, i: FileSpreadsheet, c: 'var(--accent-blue)' },
          { l: 'Excel Files', v: history.filter(h => h.file_type !== 'CSV').length, i: FileText, c: 'var(--accent-pink)' },
          { l: 'Total Storage', v: formatSize(history.reduce((s, h) => s + (h.size_bytes || 0), 0)), i: HardDrive, c: 'var(--purple)' },
        ].map(s => {
          const Icon = s.i;
          return (
            <div key={s.l} className="stat-card">
              <div style={{ color: s.c }}><Icon size={24} /></div>
              <div className="stat-value">{s.v}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        <div>
          <div className="flex gap-24 mb-32">
            <input className="input" style={{ flex: 1 }} placeholder="Search datasets…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary" onClick={loadHistory}>🔄 Refresh</button>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <h3 style={{ color: 'var(--text2)', fontFamily: 'DM Sans' }}>No datasets found</h3>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>Upload a dataset to get started.</p>
              <button className="btn btn-primary mt-24" onClick={() => onNav(1)}>Upload Dataset</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Rows</th>
                      <th>Cols</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(entry => (
                      <tr key={entry.id} style={{ cursor: 'pointer', background: selected?.id === entry.id ? 'rgba(59,130,246,0.05)' : 'transparent' }} onClick={() => handleSelect(entry)}>
                        <td>
                          <div className="flex gap-8">
                            <span style={{ fontSize: 16 }}>{entry.file_type === 'CSV' ? '📄' : '📊'}</span>
                            <span style={{ color: 'var(--accent2)', fontWeight: 500 }}>{entry.name}</span>
                          </div>
                        </td>
                        <td><span className="badge badge-blue">{entry.file_type}</span></td>
                        <td>{entry.rows?.toLocaleString()}</td>
                        <td>{entry.columns}</td>
                        <td>{formatSize(entry.size_bytes)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(entry.upload_date)}</td>
                        <td>
                          <div className="flex gap-4" onClick={e => e.stopPropagation()}>
                            <button className="btn btn-green" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleOpen(entry)} disabled={loading}>
                              Open
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => window.open(`http://localhost:8000/api/history/${entry.id}/download`, '_blank')}>
                              ⬇
                            </button>
                            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDelete(entry.id)}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 88 }}>
          {selected ? (
            <div>
              <div className="card mb-12">
                <h3 className="section-title mb-16">📁 Dataset Details</h3>
                {[
                  ['Name', selected.name],
                  ['Type', selected.file_type],
                  ['Rows', selected.rows?.toLocaleString()],
                  ['Columns', selected.columns],
                  ['Size', formatSize(selected.size_bytes)],
                  ['Dataset Type', selected.dataset_type || '—'],
                  ['Uploaded', formatDate(selected.upload_date)],
                ].map(([k, v]) => (
                  <div key={k} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500, textAlign: 'right', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                  </div>
                ))}
                <div className="mt-16 flex gap-8" style={{ flexDirection: 'column' }}>
                  <button className="btn btn-primary" onClick={() => handleOpen(selected)} disabled={loading}>
                    {loading ? 'Loading…' : '🚀 Open in Analytics'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => window.open(`http://localhost:8000/api/history/${selected.id}/download`, '_blank')}>
                    ⬇ Download Dataset
                  </button>
                </div>
              </div>

              {preview && !preview.error && (
                <div className="card">
                  <h3 className="section-title mb-12">Preview (first 10 rows)</h3>
                  <div className="data-table-wrap" style={{ maxHeight: 300 }}>
                    <table className="data-table">
                      <thead><tr>{preview.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {preview.data.map((row, i) => (
                          <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {preview?.error && <div className="alert alert-error">Could not load preview.</div>}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👈</div>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>Select a dataset to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginBottom: 12 }}>⚠️ Confirm Delete</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>Are you sure you want to permanently delete this dataset? This action cannot be undone.</p>
            <div className="flex gap-12">
              <button className="btn btn-danger btn-lg" style={{ flex: 1 }} onClick={() => handleDelete(confirmDelete)}>Delete</button>
              <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
