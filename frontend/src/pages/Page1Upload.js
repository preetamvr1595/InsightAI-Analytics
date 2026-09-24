import { useState, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { SimpleBarChart } from '../components/Charts';
import { List, Columns, Hash, Tags, Calendar, AlertCircle, BarChart3, FolderPlus, CloudUpload, ArrowRight, RefreshCw } from 'lucide-react';

export default function Page1Upload({ onDatasetLoaded, onNav }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const fileRef = useRef();

  const handleFile = useCallback(async (file) => {
    setError('');
    setResult(null);
    setUploading(true);
    setProgress(10);
    const timer = setInterval(() => setProgress(p => Math.min(p + 10, 85)), 300);
    try {
      const data = await api.upload(file);
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => { setResult(data); setUploading(false); }, 300);
    } catch (e) {
      clearInterval(timer);
      setUploading(false);
      setProgress(0);
      setError(e.message);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onFileChange = (e) => { const f = e.target.files[0]; if (f) handleFile(f); };

  const missingChart = result ? (() => {
    const missing = result.quality_report.filter(r => r.missing_values > 0);
    if (!missing.length) return null;
    return { labels: missing.map(r => r.column), values: missing.map(r => r.missing_values) };
  })() : null;

  const filteredPreview = result ? (() => {
    let rows = result.preview.data;
    if (search) {
      rows = rows.filter(row => row.some(cell => cell.toLowerCase().includes(search.toLowerCase())));
    }
    if (sortCol) {
      const idx = result.preview.columns.indexOf(sortCol);
      if (idx !== -1) {
        rows = [...rows].sort((a, b) => {
          const av = isNaN(a[idx]) ? a[idx] : parseFloat(a[idx]);
          const bv = isNaN(b[idx]) ? b[idx] : parseFloat(b[idx]);
          return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
    }
    return rows;
  })() : [];

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-12 align-center">
          <BarChart3 className="sidebar-icon" size={40} />
          <div>
            <h1 className="page-title">AI Data Analytics Platform</h1>
            <p className="page-sub">Upload your dataset to begin automated AI-driven analysis.</p>
          </div>
        </div>
      </div>

      {!result && (
        <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 className="section-title"><FolderPlus size={20} className="sidebar-icon" /> Upload Dataset</h2>
          <div
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} style={{ display: 'none' }} />
            <div className="drop-icon"><CloudUpload size={64} color="var(--accent)" /></div>
            <h3 style={{ marginBottom: 8, color: 'var(--text)' }}>Drag & drop your dataset here</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>or click to browse files</p>
            <div className="flex gap-8" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-blue">CSV</span>
              <span className="badge badge-blue">XLSX</span>
              <span className="badge badge-blue">XLS</span>
              <span className="badge badge-orange">Max 100MB</span>
            </div>
          </div>
          {uploading && (
            <div className="mt-16">
              <div className="flex-between mb-8">
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Uploading & analyzing…</span>
                <span style={{ fontSize: 13, color: 'var(--accent2)' }}>{progress}%</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {error && <div className="alert alert-error mt-16">⚠️ {error}</div>}
        </div>
      )}

      {result && (
        <div>
          <div className="flex-between mb-32">
            <div className="flex gap-12">
              <div>
                <div className="flex gap-8 mb-4">
                  <span className="badge badge-green">✓ Uploaded</span>
                  <span className="badge badge-blue">{result.dataset_type}</span>
                </div>
                <h2 style={{ color: 'var(--text)' }}>{result.filename}</h2>
              </div>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-secondary flex gap-8" onClick={() => { setResult(null); setProgress(0); }}>
                <RefreshCw size={16} /> Replace
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => onDatasetLoaded(result)}>
                Continue to Analytics <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-6 mb-32">
            {[
              { label: 'Rows', value: result.summary.rows.toLocaleString(), icon: List },
              { label: 'Columns', value: result.summary.columns, icon: Columns },
              { label: 'Numeric', value: result.summary.numeric_columns, icon: Hash },
              { label: 'Categorical', value: result.summary.categorical_columns, icon: Tags },
              { label: 'Date Columns', value: result.summary.date_columns, icon: Calendar },
              { label: 'Missing %', value: `${result.summary.missing_percentage}%`, icon: AlertCircle },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="stat-card">
                  <div style={{ color: 'var(--accent2)' }}><Icon size={24} /></div>
                  <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              );
            })}
          </div>

          <div className="grid-2 mb-32">
            {/* Dataset Preview */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="flex-between mb-12">
                <h3 className="section-title">🔍 Dataset Preview (First 20 rows)</h3>
                <input
                  className="input"
                  style={{ width: 220 }}
                  placeholder="Search in preview…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {result.preview.columns.map(c => (
                        <th key={c} onClick={() => handleSort(c)}>
                          {c} {sortCol === c ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} title={cell}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid-2 mb-32">
            {/* Quality Report */}
            <div className="card">
              <h3 className="section-title mb-16">🔬 Data Quality Report</h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Type</th>
                      <th>Missing</th>
                      <th>Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.quality_report.map(r => (
                      <tr key={r.column}>
                        <td style={{ color: 'var(--accent2)' }}>{r.column}</td>
                        <td><span className="badge badge-purple">{r.data_type}</span></td>
                        <td style={{ color: r.missing_values > 0 ? 'var(--orange)' : 'var(--green)' }}>
                          {r.missing_values} ({r.missing_pct}%)
                        </td>
                        <td>{r.unique_values}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dataset Structure */}
            <div className="card">
              <h3 className="section-title mb-16">🏗️ Dataset Structure</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(result.summary.column_types).map(([type, cols]) => cols.length > 0 && (
                  <div key={type}>
                    <div className="flex gap-8 mb-8">
                      <span className={`badge badge-${type === 'numeric' ? 'blue' : type === 'categorical' ? 'green' : type === 'datetime' ? 'orange' : 'purple'}`}>
                        {type}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{cols.length} columns</span>
                    </div>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                      {cols.map(c => <span key={c} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: 'var(--text2)' }}>{c}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider" />
              <div>
                <div className="stat-label mb-8">Missing Value Summary</div>
                <div className="flex gap-16">
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--orange)' }}>{result.summary.missing_values.toLocaleString()}</div>
                    <div className="stat-label">Total Missing</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--orange)' }}>{result.summary.missing_percentage}%</div>
                    <div className="stat-label">Missing %</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{result.summary.duplicate_rows}</div>
                    <div className="stat-label">Duplicates</div>
                  </div>
                </div>
              </div>

              {missingChart && (
                <div className="mt-16">
                  <div className="stat-label mb-8">Missing Values by Column</div>
                  <SimpleBarChart data={missingChart} color="#f59e0b" height={160} />
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <h3 style={{ marginBottom: 8 }}>Ready to Analyze</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Your dataset has been processed. Continue to the AI Analytics Dashboard.</p>
            <button className="btn btn-primary btn-lg" onClick={() => onDatasetLoaded(result)}>
              Continue to Data Analytics →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
