import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { SimpleBarChart, HeatmapChart, SimpleScatter, MiniLineChart } from '../components/Charts';
import { LayoutDashboard, BarChart3, Link as LinkIcon, AreaChart, AlertTriangle, GitBranch, HelpCircle, Target, List, Columns, Database, ArrowRight } from 'lucide-react';

const TOOLS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'correlation', label: 'Correlation', icon: LinkIcon },
  { id: 'distribution', label: 'Distribution', icon: AreaChart },
  { id: 'outliers', label: 'Outliers', icon: AlertTriangle },
  { id: 'relationship', label: 'Relationship', icon: GitBranch },
  { id: 'missing', label: 'Missing Data', icon: HelpCircle },
  { id: 'importance', label: 'Feature Importance', icon: Target },
];

export default function Page2Analytics({ dataset, onNav }) {
  const [tool, setTool] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [corr, setCorr] = useState(null);
  const [histogram, setHistogram] = useState(null);
  const [scatter, setScatter] = useState(null);
  const [outlier, setOutlier] = useState(null);
  const [importance, setImportance] = useState(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [scatterX, setScatterX] = useState('');
  const [scatterY, setScatterY] = useState('');
  const [targetCol, setTargetCol] = useState('');
  const [loading, setLoading] = useState(false);
  const [fillMsg, setFillMsg] = useState('');

  const fid = dataset?.file_id;

  useEffect(() => {
    if (!fid) return;
    api.getAnalyticsSummary(fid).then(data => {
      setSummary(data);
      const nc = data.column_types.numeric;
      if (nc.length) { setSelectedCol(nc[0]); setScatterX(nc[0]); setScatterY(nc[Math.min(1, nc.length-1)]); }
    });
  }, [fid]);

  const loadHistogram = useCallback((col) => {
    if (!col || !fid) return;
    setLoading(true);
    api.getHistogram(fid, col).then(d => { setHistogram(d); setLoading(false); });
  }, [fid]);

  const loadScatter = useCallback(() => {
    if (!scatterX || !scatterY || !fid) return;
    setLoading(true);
    api.getScatter(fid, scatterX, scatterY).then(d => { setScatter(d); setLoading(false); });
  }, [fid, scatterX, scatterY]);

  const loadOutliers = useCallback((col) => {
    if (!col || !fid) return;
    setLoading(true);
    api.getOutliers(fid, col).then(d => { setOutlier(d); setLoading(false); }).catch(() => setLoading(false));
  }, [fid]);

  const loadCorr = useCallback(() => {
    if (!fid) return;
    setLoading(true);
    api.getCorrelation(fid).then(d => { setCorr(d); setLoading(false); });
  }, [fid]);

  const loadImportance = useCallback(() => {
    if (!targetCol || !fid) return;
    setLoading(true);
    api.getFeatureImportance(fid, targetCol).then(d => { setImportance(d); setLoading(false); }).catch(() => setLoading(false));
  }, [fid, targetCol]);

  const handleFillMissing = (method) => {
    api.fillMissing(fid, method).then(d => { setFillMsg(d.message); api.getAnalyticsSummary(fid).then(setSummary); });
  };

  useEffect(() => { if (tool === 'distribution') loadHistogram(selectedCol); }, [tool, selectedCol]);
  useEffect(() => { if (tool === 'correlation') loadCorr(); }, [tool]);
  useEffect(() => { if (tool === 'outliers') loadOutliers(selectedCol); }, [tool, selectedCol]);

  if (!dataset) return <div className="card"><p style={{ color: 'var(--text2)' }}>Please upload a dataset first.</p></div>;
  if (!summary) return <div><div className="loading-spinner" /><p className="loading-text">Loading analytics…</p></div>;

  const nc = summary.column_types.numeric;
  const cc = summary.column_types.categorical;
  const allCols = summary.columns;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex gap-12"><BarChart3 className="sidebar-icon" size={32} /> Analytics Dashboard</h1>
          <p className="page-sub">{dataset.filename} • {summary.summary.rows.toLocaleString()} rows × {summary.summary.columns} columns</p>
        </div>
        <button className="btn btn-primary flex gap-8" onClick={() => onNav(3)}>AI Research <ArrowRight size={18} /></button>
      </div>

      <div className="sidebar-layout">
        <div className="sidebar">
          <div className="card-sm">
            <div className="stat-label mb-8">Dataset Info</div>
            {[
              ['Rows', summary.summary.rows.toLocaleString()],
              ['Columns', summary.summary.columns],
              ['Numeric', summary.summary.numeric_columns],
              ['Categorical', summary.summary.categorical_columns],
              ['Missing %', `${summary.summary.missing_percentage}%`],
              ['Duplicates', summary.summary.duplicate_rows],
            ].map(([k, v]) => (
              <div key={k} className="flex-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>{k}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.id} className={`sidebar-item${tool === t.id ? ' active' : ''}`} onClick={() => setTool(t.id)}>
                <Icon size={18} className="sidebar-icon" />
                <span>{t.label}</span>
              </div>
            );
          })}
        </div>

        <div>
          {tool === 'overview' && (
            <div>
              <div className="grid-4 mb-16">
                {[
                  { l: 'Total Rows', v: summary.summary.rows.toLocaleString(), c: 'var(--accent2)', icon: List },
                  { l: 'Total Columns', v: summary.summary.columns, c: 'var(--green)', icon: Columns },
                  { l: 'Missing %', v: `${summary.summary.missing_percentage}%`, c: 'var(--orange)', icon: AlertTriangle },
                  { l: 'Memory', v: `${summary.summary.memory_usage_mb}MB`, c: 'var(--purple)', icon: Database },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.l} className="stat-card">
                      <div style={{ color: s.c }}><Icon size={24} /></div>
                      <div className="stat-value" style={{ color: s.c }}>{s.v}</div>
                      <div className="stat-label">{s.l}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid-2 mb-32">
                <div className="card">
                  <h3 className="section-title">🔢 Numeric Columns</h3>
                  <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                    {nc.map(c => <span key={c} className="badge badge-blue">{c}</span>)}
                  </div>
                </div>
                <div className="card">
                  <h3 className="section-title">🏷️ Categorical Columns</h3>
                  <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                    {cc.map(c => <span key={c} className="badge badge-green">{c}</span>)}
                    {summary.column_types.datetime.map(c => <span key={c} className="badge badge-orange">{c}</span>)}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="section-title">📋 Column Details</h3>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Column</th><th>Type</th><th>Missing</th><th>Missing %</th></tr></thead>
                    <tbody>
                      {allCols.map(col => {
                        const m = summary.missing_per_column[col] || 0;
                        const pct = summary.summary.rows > 0 ? (m / summary.summary.rows * 100).toFixed(1) : 0;
                        return (
                          <tr key={col}>
                            <td style={{ color: 'var(--accent2)' }}>{col}</td>
                            <td><span className="badge badge-purple" style={{ fontSize: 10 }}>{summary.dtypes[col]}</span></td>
                            <td style={{ color: m > 0 ? 'var(--orange)' : 'var(--green)' }}>{m}</td>
                            <td>
                              <div className="flex gap-8">
                                <div className="progress-bar-wrap" style={{ flex: 1, height: 4 }}>
                                  <div className="progress-bar" style={{ width: `${pct}%`, background: m > 0 ? 'var(--orange)' : 'var(--green)' }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text3)', width: 35 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tool === 'stats' && (
            <div className="card">
              <h3 className="section-title mb-16">📊 Descriptive Statistics</h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Mean</th><th>Median</th><th>Std</th><th>Min</th><th>Max</th><th>25%</th><th>75%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.descriptive_stats).map(([col, s]) => (
                      <tr key={col}>
                        <td style={{ color: 'var(--accent2)', fontWeight: 500 }}>{col}</td>
                        <td>{s.mean ?? '—'}</td>
                        <td>{s.median ?? '—'}</td>
                        <td>{s.std ?? '—'}</td>
                        <td>{s.min ?? '—'}</td>
                        <td>{s.max ?? '—'}</td>
                        <td>{s['25%'] ?? '—'}</td>
                        <td>{s['75%'] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tool === 'correlation' && (
            <div className="card">
              <h3 className="section-title mb-16">🔗 Correlation Heatmap</h3>
              {loading && <div className="loading-spinner" />}
              {corr && <HeatmapChart matrix={corr.matrix} columns={corr.columns} height={400} />}
              {corr && corr.matrix.length === 0 && <p style={{ color: 'var(--text2)' }}>Not enough numeric columns.</p>}
            </div>
          )}

          {tool === 'distribution' && (
            <div>
              <div className="card mb-32">
                <h3 className="section-title mb-12">📈 Distribution</h3>
                <div className="flex gap-16 mb-32">
                  <select className="select" value={selectedCol} onChange={e => setSelectedCol(e.target.value)}>
                    {nc.map(c => <option key={c}>{c}</option>)}
                    {cc.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-secondary" onClick={() => loadHistogram(selectedCol)}>Generate</button>
                </div>
                {loading && <div className="loading-spinner" />}
                {histogram && <SimpleBarChart data={{ labels: histogram.labels, values: histogram.values }} height={280} />}
              </div>
              <div className="grid-3">
                {nc.slice(0, 3).map(col => (
                  <ColDistCard key={col} fid={fid} col={col} />
                ))}
              </div>
            </div>
          )}

          {tool === 'outliers' && (
            <div className="card">
              <h3 className="section-title mb-12">⚠️ Outlier Detection (IQR Method)</h3>
              <div className="flex gap-16 mb-32">
                <select className="select" value={selectedCol} onChange={e => { setSelectedCol(e.target.value); }}>
                  {nc.map(c => <option key={c}>{c}</option>)}
                </select>
                <button className="btn btn-secondary" onClick={() => loadOutliers(selectedCol)}>Analyze</button>
              </div>
              {loading && <div className="loading-spinner" />}
              {outlier && (
                <div>
                  <div className="grid-4 mb-16">
                    {[
                      { l: 'Outliers Found', v: outlier.outlier_count, c: 'var(--red)' },
                      { l: 'Q1', v: outlier.Q1?.toFixed(2), c: 'var(--text)' },
                      { l: 'Q3', v: outlier.Q3?.toFixed(2), c: 'var(--text)' },
                      { l: 'IQR', v: outlier.IQR?.toFixed(2), c: 'var(--accent2)' },
                    ].map(s => (
                      <div key={s.l} className="stat-card">
                        <div className="stat-value" style={{ fontSize: 24, color: s.c }}>{s.v}</div>
                        <div className="stat-label">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="alert alert-info">
                    Lower bound: {outlier.lower_bound?.toFixed(2)} | Upper bound: {outlier.upper_bound?.toFixed(2)}
                  </div>
                  <div className="mt-16">
                    <div className="stat-label mb-8">Value Distribution</div>
                    <MiniLineChart values={outlier.values.slice(0, 200)} color="var(--accent2)" height={120} />
                  </div>
                </div>
              )}
            </div>
          )}

          {tool === 'relationship' && (
            <div className="card">
              <h3 className="section-title mb-12">🔀 Column Relationship</h3>
              <div className="flex gap-16 mb-32" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-label mb-4">Column A (X)</div>
                  <select className="select" value={scatterX} onChange={e => setScatterX(e.target.value)}>
                    {nc.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="stat-label mb-4">Column B (Y)</div>
                  <select className="select" value={scatterY} onChange={e => setScatterY(e.target.value)}>
                    {nc.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={loadScatter}>Generate Chart</button>
                </div>
              </div>
              {loading && <div className="loading-spinner" />}
              {scatter && <SimpleScatter xData={scatter.x} yData={scatter.y} xLabel={scatterX} yLabel={scatterY} height={320} />}
            </div>
          )}

          {tool === 'missing' && (
            <div className="card">
              <h3 className="section-title mb-16">❓ Missing Value Analysis</h3>
              <div className="grid-3 mb-16">
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--orange)' }}>{summary.summary.missing_values}</div>
                  <div className="stat-label">Total Missing</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--orange)' }}>{summary.summary.missing_percentage}%</div>
                  <div className="stat-label">Missing %</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{summary.summary.duplicate_rows}</div>
                  <div className="stat-label">Duplicates</div>
                </div>
              </div>
              {fillMsg && <div className="alert alert-success mb-16">{fillMsg}</div>}
              <div className="section-title mb-12">Handle Missing Values</div>
              <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: 32 }}>
                {['mean', 'median', 'mode', 'drop_rows', 'drop_cols'].map(m => (
                  <button key={m} className="btn btn-secondary" onClick={() => handleFillMissing(m)}>{m.replace('_', ' ')}</button>
                ))}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Column</th><th>Missing</th><th>%</th></tr></thead>
                  <tbody>
                    {Object.entries(summary.missing_per_column).filter(([,v]) => v > 0).map(([col, v]) => (
                      <tr key={col}>
                        <td style={{ color: 'var(--accent2)' }}>{col}</td>
                        <td style={{ color: 'var(--orange)' }}>{v}</td>
                        <td>{(v / summary.summary.rows * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                    {Object.values(summary.missing_per_column).every(v => v === 0) && (
                      <tr><td colSpan={3} style={{ color: 'var(--green)', textAlign: 'center' }}>✓ No missing values</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tool === 'importance' && (
            <div className="card">
              <h3 className="section-title mb-12">🎯 Feature Importance</h3>
              <div className="flex gap-12 mb-16">
                <div>
                  <div className="stat-label mb-4">Target Column</div>
                  <select className="select" value={targetCol} onChange={e => setTargetCol(e.target.value)}>
                    <option value="">Select target…</option>
                    {allCols.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={loadImportance} disabled={!targetCol}>Run Analysis</button>
                </div>
              </div>
              {loading && <div className="loading-spinner" />}
              {importance && (
                <div>
                  <SimpleBarChart data={{ labels: importance.features, values: importance.importances }} color="var(--accent)" height={300} />
                  <div className="data-table-wrap mt-16">
                    <table className="data-table">
                      <thead><tr><th>Feature</th><th>Importance</th></tr></thead>
                      <tbody>
                        {importance.features.map((f, i) => (
                          <tr key={f}>
                            <td style={{ color: 'var(--accent2)' }}>{f}</td>
                            <td>
                              <div className="flex gap-8">
                                <div className="progress-bar-wrap" style={{ flex: 1, height: 6 }}>
                                  <div className="progress-bar" style={{ width: `${importance.importances[i] * 100}%` }} />
                                </div>
                                <span style={{ fontSize: 12, width: 40 }}>{importance.importances[i]}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}

function ColDistCard({ fid, col }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.getHistogram(fid, col).then(setData);
  }, [fid, col]);
  return (
    <div className="card">
      <div className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>{col}</div>
      {data ? <SimpleBarChart data={{ labels: data.labels, values: data.values }} height={160} /> : <div className="loading-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />}
    </div>
  );
}
