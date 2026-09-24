import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { SimpleBarChart } from '../components/Charts';
import { Search, Download, FileText, LayoutList, Columns, BookOpen, Map, ArrowLeft, ArrowRight, History } from 'lucide-react';

export default function Page5Explorer({ dataset, onNav }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [schema, setSchema] = useState(null);
  const [colInfo, setColInfo] = useState(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 50;
  const fid = dataset?.file_id;

  const loadData = useCallback(() => {
    if (!fid) return;
    setLoading(true);
    api.getExplorerData(fid, page, PAGE_SIZE, search, sortCol, sortDir).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [fid, page, search, sortCol, sortDir]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (fid) api.getSchema(fid).then(d => setSchema(d.schema));
  }, [fid]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const loadColInfo = (col) => {
    setSelectedCol(col);
    api.getColumnInfo(fid, col).then(setColInfo);
  };

  if (!dataset) return <div className="card"><p style={{ color: 'var(--text2)' }}>Please upload a dataset first.</p></div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex gap-12"><Search className="sidebar-icon" size={32} /> Dataset Explorer</h1>
          <p className="page-sub">Explore and interact with your uploaded dataset.</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary flex gap-8" onClick={() => api.downloadDataset(fid, 'csv')}><Download size={16} /> CSV</button>
          <button className="btn btn-secondary flex gap-8" onClick={() => api.downloadDataset(fid, 'xlsx')}><Download size={16} /> Excel</button>
          <button className="btn btn-primary flex gap-8" onClick={() => onNav(6)}>History <ArrowRight size={18} /></button>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid-4 mb-32">
          {[
            { l: 'Total Rows', v: data.total.toLocaleString(), i: LayoutList },
            { l: 'Columns', v: data.columns?.length, i: Columns },
            { l: 'Pages', v: data.total_pages, i: BookOpen },
            { l: 'Current Page', v: `${data.page}/${data.total_pages}`, i: Map },
          ].map(s => {
            const Icon = s.i;
            return (
              <div key={s.l} className="stat-card">
                <div style={{ color: 'var(--accent2)' }}><Icon size={24} /></div>
                <div className="stat-value">{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        <div>
          {/* Search & filter bar */}
          <div className="card mb-16 flex gap-12">
            <input className="input" style={{ flex: 1 }} placeholder="Search in dataset…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
            {search && <button className="btn btn-secondary" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>}
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading && <div className="loading-spinner" style={{ margin: 20 }} />}
            {data && !loading && (
              <div className="data-table-wrap" style={{ maxHeight: 520 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      {data.columns.map(c => (
                        <th key={c} onClick={() => handleSort(c)} style={{ cursor: 'pointer' }}>
                          <span className="flex gap-4" style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ color: selectedCol === c ? 'var(--accent2)' : 'inherit' }} onClick={(e) => { e.stopPropagation(); loadColInfo(c); }}>
                              {c}
                            </span>
                            {sortCol === c ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text3)', fontSize: 11 }}>{(page-1)*PAGE_SIZE + i + 1}</td>
                        {row.map((cell, j) => <td key={j} title={cell}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && (
              <div className="flex-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, data.total)} of {data.total.toLocaleString()} rows
                  {search && ` (filtered)`}
                </span>
                <div className="flex gap-8">
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(1)} disabled={page === 1}>«</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
                  <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text2)' }}>Page {page} / {data.total_pages}</span>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(p => p+1)} disabled={page === data.total_pages}>›</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setPage(data.total_pages)} disabled={page === data.total_pages}>»</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: column info + schema */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 88 }}>
          {colInfo ? (
            <div className="card">
              <h3 className="section-title mb-12">Column: {colInfo.name}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {[
                  ['Type', colInfo.dtype],
                  ['Total', colInfo.total],
                  ['Missing', colInfo.missing],
                  ['Unique', colInfo.unique],
                  ...(colInfo.min !== undefined ? [['Min', colInfo.min?.toFixed?.(2) ?? colInfo.min], ['Max', colInfo.max?.toFixed?.(2) ?? colInfo.max], ['Mean', colInfo.mean?.toFixed?.(2) ?? colInfo.mean]] : [])
                ].map(([k, v]) => (
                  <div key={k} className="flex-between" style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
              {colInfo.histogram && <SimpleBarChart data={{ labels: colInfo.histogram.edges.slice(0,-1).map(e => e.toFixed(1)), values: colInfo.histogram.values }} height={140} />}
              {colInfo.top_values && <SimpleBarChart data={{ labels: colInfo.top_values.labels, values: colInfo.top_values.values }} height={140} color="var(--green)" />}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Click a column header to inspect it</p>
            </div>
          )}

          {schema && (
            <div className="card" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <h3 className="section-title mb-12">Dataset Schema</h3>
              {schema.map(s => (
                <div key={s.column} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--accent2)', cursor: 'pointer' }} onClick={() => loadColInfo(s.column)}>{s.column}</span>
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>{s.dtype}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
