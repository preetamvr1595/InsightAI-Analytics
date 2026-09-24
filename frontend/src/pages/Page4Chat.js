import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { MessageSquare, ArrowRight, Upload, Download, X, FileText, ChevronDown } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

const CHART_COLORS = [
  '#4b0082', '#7b1fa2', '#e53935', '#1565c0', '#2e7d32',
  '#e65100', '#00838f', '#f9a825', '#ad1457', '#37474f',
  '#0277bd', '#558b2f', '#6a1b9a', '#c62828', '#00695c'
];

const SUGGESTIONS = [
  'What is the average value of numeric columns?',
  'Show correlation matrix',
  'Show top 10 rows',
  'How many missing values are there?',
  'Plot distribution of the first column',
  'Describe the dataset statistics',
];
const SUGGESTIONS_FILE = [
  'Summarize this document',
  'Give me key insights in bullet points',
  'Show me data in a bar chart',
  'Show me data in a pie chart',
  'List all statistics in a table',
  'Find patterns or trends',
];

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg);padding:2px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ── Custom bar label ────────────────────────────────────────
const CustomBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 5} fill="#4b0082" textAnchor="middle" fontSize={11} fontWeight={600}>
      {value}
    </text>
  );
};

// ── Chart renderer ──────────────────────────────────────────
function ChartBlock({ chart, inline }) {
  if (!chart || chart.type === 'none' || !chart.labels?.length || !chart.values?.length) return null;

  const data = chart.labels.map((label, i) => ({
    name: String(label).slice(0, 20),
    value: Number(chart.values[i]) || 0,
  }));

  const containerStyle = inline ? {
    marginTop: 12, background: 'var(--bg)', borderRadius: 10,
    padding: '12px 8px', border: '1px solid var(--border)'
  } : {
    marginTop: 10, background: 'white', borderRadius: 12,
    padding: '16px 12px', border: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(75,0,130,0.06)'
  };

  return (
    <div style={containerStyle}>
      {chart.title && (
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textAlign: 'center' }}>
          📊 {chart.title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={240}>
        {chart.type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={90} innerRadius={30}
              paddingAngle={2}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={true}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [v, 'Value']} />
            <Legend />
          </PieChart>
        ) : chart.type === 'line' ? (
          <LineChart data={data} margin={{ top: 15, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efff" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4b0082" strokeWidth={2} dot={{ r: 4, fill: '#4b0082' }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efff" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} label={<CustomBarLabel />}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ── Table renderer ──────────────────────────────────────────
function TableBlock({ table }) {
  if (!table?.columns?.length || !table?.rows?.length) return null;
  return (
    <div style={{ marginTop: 12, overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} style={{
                background: '#4b0082', color: 'white', padding: '8px 12px',
                textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap'
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, 50).map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#fafafa' : 'white' }}>
              {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                <td key={ci} style={{ padding: '7px 12px', borderBottom: '1px solid #f0efff' }}>
                  {String(cell ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > 50 && (
        <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>
          Showing 50 of {table.rows.length} rows
        </div>
      )}
    </div>
  );
}

// ── Export button per message ───────────────────────────────
function ExportBtn({ allMessages }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

  const download = async (fmt) => {
    setBusy(fmt);
    try {
      const res = await fetch(`${BASE}/chat/download-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, format: fmt }),
      });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `InsightAI_Report.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
    setBusy(null); setOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: 10 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: '#4b0082', color: 'white', border: 'none',
        borderRadius: 8, padding: '5px 12px', fontSize: 11,
        fontWeight: 700, cursor: 'pointer',
      }}>
        <Download size={12} /> EXPORT REPORT <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 36, left: 0, zIndex: 300,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(75,0,130,0.15)',
          overflow: 'hidden', minWidth: 165,
        }}>
          {[
            { fmt: 'pdf', label: '📄 Full PDF Report' },
            { fmt: 'docx', label: '📝 Word Document' },
            { fmt: 'xlsx', label: '📊 Excel Spreadsheet' },
            { fmt: 'csv', label: '🗃 Processed CSV' },
          ].map(({ fmt, label }) => (
            <button key={fmt} onClick={() => download(fmt)} disabled={busy === fmt} style={{
              display: 'block', width: '100%', padding: '9px 14px',
              background: 'none', border: 'none', textAlign: 'left',
              cursor: 'pointer', fontSize: 12, color: '#2d1a47', fontWeight: 500,
              borderBottom: '1px solid #f0efff',
            }}>
              {busy === fmt ? '⏳ Downloading…' : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
const BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

export default function Page4Chat({ dataset, onNav }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState(null);
  const [ollamaOk, setOllamaOk] = useState(null);
  const [chatFile, setChatFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDL, setShowDL] = useState(false);
  const [dlBusy, setDlBusy] = useState(null);

  const chatRef = useRef();
  const fileRef = useRef();
  const fid = dataset?.file_id;

  useEffect(() => {
    if (!fid) {
      setMessages([{ role: 'assistant', content: "Hello! I'm your AI Dataset Assistant powered by GPT-OSS.\n\nUpload a file or go to Upload page to load a dataset.\n\nAsk me anything!", chart: null, table: null, followup: '' }]);
      return;
    }
    api.getChatColumns(fid).then(d => {
      setColumns(d);
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your AI Dataset Assistant.\n\n**Dataset:** ${dataset.filename}\n**Columns:** ${d.columns.slice(0, 8).join(', ')}${d.columns.length > 8 ? '…' : ''}\n\nAsk me anything!`,
        chart: null, table: null, followup: ''
      }]);
    });
  }, [fid]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    fetch(`${BASE}/chat/health`)
      .then(r => r.json())
      .then(d => setOllamaOk(d.ollama_running && d.llama3_ready))
      .catch(() => setOllamaOk(false));
  }, []);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query, chart: null, table: null, followup: '' };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          query,
          file_id: fid || null,
          file_context: chatFile?.context || null,
          file_name: chatFile?.name || null,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Chat failed');
      }

      const result = await res.json();
      setMessages([...history, {
        role: 'assistant',
        content: result.text || '',
        chart: result.chart || null,
        table: result.table || null,
        followup: result.followup || '',
      }]);
    } catch (e) {
      setMessages([...history, {
        role: 'assistant',
        content: `**Error:** ${e.message}\n\nMake sure Ollama is running: \`ollama serve\``,
        chart: null, table: null, followup: ''
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleChatFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${BASE}/chat/upload-file`, { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const d = await res.json();
      setChatFile({ name: d.file_name, type: d.file_type, context: d.context, chars: d.chars });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **File loaded:** ${d.file_name}\n**Type:** ${d.file_type} | **Extracted:** ${d.chars.toLocaleString()} characters\n\nAsk me anything about this file!`,
        chart: null, table: null, followup: ''
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Upload failed: ${e.message}`, chart: null, table: null, followup: '' }]);
    }
    setUploading(false);
  };

  const downloadAll = async (fmt) => {
    setDlBusy(fmt);
    try {
      const res = await fetch(`${BASE}/chat/download-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, format: fmt }),
      });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `InsightAI_Report.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
    setDlBusy(null); setShowDL(false);
  };

  const activeSuggestions = chatFile ? SUGGESTIONS_FILE : SUGGESTIONS;
  const messagesForReport = messages.map(m => ({ role: m.role, content: m.content, chart: m.chart, table: m.table, followup: m.followup }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>

      {/* Header */}
      <div className="page-header flex-between" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="page-title flex gap-12">
            <MessageSquare className="sidebar-icon" size={32} /> AI Dataset Assistant
          </h1>
          <p className="page-sub">Ask questions about your dataset and receive intelligent analysis.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: ollamaOk === true ? '#e8f5e9' : ollamaOk === false ? '#ffebee' : '#f5f5f5',
            color: ollamaOk === true ? '#2e7d32' : ollamaOk === false ? '#c62828' : '#757575',
          }}>
            {ollamaOk === true ? '● AI Model Ready' : ollamaOk === false ? '● Ollama Offline' : '● Checking…'}
          </span>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary flex gap-8" onClick={() => setShowDL(v => !v)} disabled={messages.length < 2}>
              <Download size={15} /> Full Report <ChevronDown size={13} />
            </button>
            {showDL && (
              <div style={{
                position: 'absolute', top: 38, right: 0, zIndex: 200,
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(75,0,130,0.12)',
                overflow: 'hidden', minWidth: 165,
              }}>
                {[{ fmt: 'pdf', label: '📄 Full PDF Report' }, { fmt: 'docx', label: '📝 Word Document' },
                { fmt: 'xlsx', label: '📊 Excel Spreadsheet' }, { fmt: 'csv', label: '🗃 Processed CSV' }].map(({ fmt, label }) => (
                  <button key={fmt} onClick={() => downloadAll(fmt)} disabled={dlBusy === fmt} style={{
                    display: 'block', width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', textAlign: 'left',
                    cursor: 'pointer', fontSize: 13, color: '#2d1a47', fontWeight: 500,
                  }}>
                    {dlBusy === fmt ? '⏳ Downloading…' : label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {dataset && (
            <button className="btn btn-primary flex gap-8" onClick={() => onNav(5)}>
              Explorer <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Ollama warning */}
      {ollamaOk === false && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffcc02', borderRadius: 10, padding: '9px 16px', fontSize: 13, color: '#e65100', marginBottom: 10, flexShrink: 0 }}>
          ⚠️ <strong>Ollama not running.</strong> Run: <code>ollama serve</code>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          <div onClick={() => fileRef.current?.click()} style={{
            border: '2px dashed var(--border)', borderRadius: 10, padding: '12px 8px',
            textAlign: 'center', cursor: 'pointer', background: 'var(--bg)', marginBottom: 4,
          }}>
            <Upload size={16} style={{ color: 'var(--accent)', marginBottom: 4 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>Upload File</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>PDF · DOCX · TXT · JSON · CSV · Excel</div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.json,.csv,.xlsx,.xls"
              style={{ display: 'none' }} onChange={e => handleChatFile(e.target.files[0])} />
          </div>

          {uploading && <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--accent)' }}>Parsing file…</div>}

          {chatFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', borderRadius: 8, padding: '6px 8px', border: '1px solid var(--border)', fontSize: 11 }}>
              <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{chatFile.name}</span>
              <button onClick={() => setChatFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}><X size={12} /></button>
            </div>
          )}

          <div className="section-title" style={{ fontSize: 13 }}>Suggested Questions</div>
          {activeSuggestions.map((s, i) => (
            <button key={i} className="btn btn-secondary"
              style={{ fontSize: 12, textAlign: 'left', padding: '8px 12px', lineHeight: 1.4 }}
              onClick={() => sendMessage(s)} disabled={loading}>{s}
            </button>
          ))}

          {columns && (
            <div className="mt-8">
              <div className="section-title" style={{ fontSize: 12 }}>Columns</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {columns.columns.map(c => (
                  <span key={c} className="badge badge-blue" style={{ fontSize: 10, cursor: 'pointer' }}
                    onClick={() => setInput(prev => prev + c + ' ')}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat window */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`chat-row${msg.role === 'user' ? ' user' : ''}`}>
                  <div className={`chat-avatar ${msg.role}`}>{msg.role === 'user' ? '👤' : '🤖'}</div>
                  <div className={`chat-bubble ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`} style={{ maxWidth: '92%' }}>

                    {/* Text */}
                    {msg.content && (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    )}

                    {/* Table — inside bubble */}
                    {msg.role === 'assistant' && msg.table && (
                      <TableBlock table={msg.table} />
                    )}

                    {/* Chart — inline inside bubble */}
                    {msg.role === 'assistant' && msg.chart && (
                      <ChartBlock chart={msg.chart} inline={true} />
                    )}

                    {/* Followup */}
                    {msg.role === 'assistant' && msg.followup && (
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                        💡 <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => sendMessage(msg.followup)}>
                          {msg.followup}
                        </span>
                      </div>
                    )}

                    {/* Export button */}
                    {msg.role === 'assistant' && i > 0 && (
                      <ExportBtn allMessages={messagesForReport} />
                    )}
                  </div>
                </div>

                {/* Chart — also as separate card below bubble */}
                {msg.role === 'assistant' && msg.chart && (
                  <div style={{ marginLeft: 44, marginTop: 4 }}>
                    <ChartBlock chart={msg.chart} inline={false} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="chat-row">
                <div className="chat-avatar ai">🤖</div>
                <div className="chat-bubble chat-ai" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s 0.2s infinite' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s 0.4s infinite' }} />
                  <span style={{ marginLeft: 4, fontSize: 13, color: 'var(--text2)' }}>Analyzing…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="card" style={{ flexShrink: 0, display: 'flex', gap: 12, padding: 12 }}>
            <textarea className="input" style={{ resize: 'none', height: 48, lineHeight: 1.6 }}
              placeholder={fid || chatFile ? 'Ask anything about your data… (Enter to send)' : 'Ask me anything, or upload a file above…'}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} />
            <button className="btn btn-primary" style={{ flexShrink: 0, height: 48 }}
              onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              Send ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}