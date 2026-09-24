import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SimpleBarChart, SimpleScatter } from '../components/Charts';
import { Activity, GraduationCap, Layers, ShieldAlert, UserCircle, ArrowRight } from 'lucide-react';

const CATEGORY_COLORS = {
  'Fast Learner': 'var(--green)',
  'Moderate Learner': 'var(--accent2)',
  'Slow Learner': 'var(--orange)',
  'Struggling Learner': 'var(--red)',
};

export default function Page3Research({ dataset, onNav }) {
  const [check, setCheck] = useState(null);
  const [classify, setClassify] = useState(null);
  const [cluster, setCluster] = useState(null);
  const [risk, setRisk] = useState(null);
  const [rec, setRec] = useState(null);
  const [recIdx, setRecIdx] = useState(0);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const fid = dataset?.file_id;

  useEffect(() => {
    if (!fid) return;
    api.checkResearch(fid).then(setCheck);
  }, [fid]);

  const runClassify = () => {
    setLoading(true);
    api.classifyLearners(fid).then(d => { setClassify(d); setLoading(false); });
  };

  const runCluster = () => {
    setLoading(true);
    api.clusterStudents(fid).then(d => { setCluster(d); setLoading(false); });
  };

  const runRisk = () => {
    setLoading(true);
    api.predictRisk(fid).then(d => { setRisk(d); setLoading(false); });
  };

  const loadRec = (idx) => {
    setRecIdx(idx);
    api.getRecommendations(fid, idx).then(setRec);
  };

  if (!dataset) return <div className="card"><p style={{ color: 'var(--text2)' }}>Please upload a dataset first.</p></div>;

  const catData = classify ? (() => {
    const cats = ['Fast Learner', 'Moderate Learner', 'Slow Learner', 'Struggling Learner'];
    return {
      labels: cats,
      values: cats.map(c => classify.summary[c] || 0)
    };
  })() : null;

  const lsiHistData = classify ? (() => {
    const vals = classify.lsi_distribution.values;
    const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)}-${((i+1) * 0.1).toFixed(1)}`, count: 0 }));
    vals.forEach(v => { const idx = Math.min(Math.floor(v * 10), 9); bins[idx].count++; });
    return { labels: bins.map(b => b.label), values: bins.map(b => b.count) };
  })() : null;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex gap-12"><Activity className="sidebar-icon" size={32} /> AI Research Engine</h1>
          <p className="page-sub">Learning Analytics & Student Performance Intelligence System</p>
        </div>
        <button className="btn btn-primary flex gap-8" onClick={() => onNav(4)}>AI Chat <ArrowRight size={18} /></button>
      </div>

      {check && (
        <div className={`alert ${check.is_educational ? 'alert-success' : 'alert-info'} mb-32`}>
          {check.is_educational
            ? `✓ Educational dataset detected. Score columns: ${check.detected_columns.join(', ')}`
            : '⚠ No educational columns detected. Generic performance clustering will be used.'}
        </div>
      )}

      <div className="flex gap-16 mb-32">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'classify', label: 'Classification', icon: GraduationCap },
          { id: 'cluster', label: 'Clustering', icon: Layers },
          { id: 'risk', label: 'Risk Detection', icon: ShieldAlert },
          { id: 'profiles', label: 'Student Profiles', icon: UserCircle },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'} flex gap-8`} onClick={() => setTab(t.id)}>
              <Icon size={18} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="grid-2 mb-16">
            <div className="card">
              <h3 className="section-title mb-16">🎓 Learning Speed Index</h3>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>
                The Learning Speed Index (LSI) is computed using performance metrics: average score (50%), improvement rate (30%), and consistency (20%). Students are classified into 4 categories based on their LSI score.
              </p>
              <div className="divider" />
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex gap-4" style={{ alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="section-title mb-12">🚀 Run Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary" onClick={runClassify}>🎓 Classify Learners</button>
                <button className="btn btn-secondary" onClick={runCluster}>🔵 Cluster Students</button>
                <button className="btn btn-secondary" onClick={runRisk}>⚠️ Predict Risk</button>
              </div>
            </div>
          </div>
          {loading && <div><div className="loading-spinner" /><p className="loading-text">Running AI analysis…</p></div>}
          {classify && (
            <div className="grid-4 mb-16">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                <div key={cat} className="stat-card" style={{ borderColor: color }}>
                  <div className="stat-value" style={{ color }}>{classify.summary[cat] || 0}</div>
                  <div className="stat-label">{cat}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'classify' && (
        <div>
          {!classify && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
              <h3 style={{ marginBottom: 12 }}>Learner Classification</h3>
              <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Run ML analysis to classify students by learning speed.</p>
              <button className="btn btn-primary btn-lg" onClick={runClassify}>Run Classification</button>
            </div>
          )}
          {loading && <div><div className="loading-spinner" /><p className="loading-text">Classifying learners…</p></div>}
          {classify && (
            <div>
              <div className="grid-4 mb-20">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="stat-value" style={{ color }}>{classify.summary[cat] || 0}</div>
                    <div className="stat-label">{cat}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {classify.students.length > 0 ? ((classify.summary[cat] || 0) / classify.students.length * 100).toFixed(1) + '%' : ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid-2 mb-20">
                <div className="card">
                  <h3 className="section-title mb-12">Category Distribution</h3>
                  {catData && <SimpleBarChart data={catData} height={240} />}
                </div>
                <div className="card">
                  <h3 className="section-title mb-12">LSI Distribution</h3>
                  {lsiHistData && <SimpleBarChart data={lsiHistData} color="var(--purple)" height={240} />}
                </div>
              </div>
              <div className="card">
                <h3 className="section-title mb-12">Student Results (Sample)</h3>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>LSI Score</th>
                        <th>Category</th>
                        {classify.score_columns.slice(0, 4).map(c => <th key={c}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {classify.students.slice(0, 20).map(s => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--accent2)' }}>{s.id}</td>
                          <td>
                            <div className="flex gap-8">
                              <div className="progress-bar-wrap" style={{ flex: 1, height: 4 }}>
                                <div className="progress-bar" style={{ width: `${s.lsi * 100}%`, background: CATEGORY_COLORS[s.category] }} />
                              </div>
                              <span style={{ fontSize: 11, width: 35 }}>{s.lsi}</span>
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: `${CATEGORY_COLORS[s.category]}20`, color: CATEGORY_COLORS[s.category], border: `1px solid ${CATEGORY_COLORS[s.category]}50`, fontSize: 10 }}>{s.category}</span></td>
                          {classify.score_columns.slice(0, 4).map(c => <td key={c}>{s.scores[c] ?? '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'cluster' && (
        <div>
          {!cluster && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔵</div>
              <button className="btn btn-primary btn-lg" onClick={runCluster}>Run Clustering (K-Means)</button>
            </div>
          )}
          {loading && <div><div className="loading-spinner" /></div>}
          {cluster && (
            <div className="card">
              <h3 className="section-title mb-12">Student Clusters (PCA 2D Projection)</h3>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
                Explained variance: {(cluster.explained_variance * 100).toFixed(1)}% | {cluster.n_clusters} clusters detected
              </p>
              <SimpleScatter
                xData={cluster.x}
                yData={cluster.y}
                xLabel="Principal Component 1"
                yLabel="Principal Component 2"
                height={400}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'risk' && (
        <div>
          {!risk && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <button className="btn btn-primary btn-lg" onClick={runRisk}>Run Risk Prediction</button>
            </div>
          )}
          {loading && <div><div className="loading-spinner" /></div>}
          {risk && (
            <div>
              <div className="grid-2 mb-16">
                <div className="stat-card" style={{ borderLeft: '4px solid var(--red)' }}>
                  <div className="stat-value" style={{ color: 'var(--red)' }}>{risk.total_high_risk}</div>
                  <div className="stat-label">High Risk Students</div>
                </div>
                <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center' }}>
                  ⚠️ {risk.total_high_risk} students identified as high risk (LSI below 0.30)
                </div>
              </div>
              <div className="card">
                <h3 className="section-title mb-12">High Risk Students</h3>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Student ID</th><th>Risk Level</th><th>LSI Score</th></tr></thead>
                    <tbody>
                      {risk.high_risk_students.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--accent2)' }}>{s.id}</td>
                          <td>
                            <div className="progress-bar-wrap" style={{ height: 6 }}>
                              <div className="progress-bar" style={{ width: `${s.risk * 100}%`, background: 'var(--red)' }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--red)' }}>{(s.risk * 100).toFixed(0)}%</span>
                          </td>
                          <td>{s.lsi}</td>
                        </tr>
                      ))}
                      {risk.high_risk_students.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--green)' }}>✓ No high risk students detected</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'profiles' && (
        <div>
          {!classify && (
            <div className="alert alert-info mb-16">Run learner classification first to view student profiles.</div>
          )}
          {classify && (
            <div className="grid-2">
              <div className="card">
                <h3 className="section-title mb-12">Select Student</h3>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {classify.students.map((s, i) => (
                    <div key={s.id} className={`sidebar-item${recIdx === i ? ' active' : ''}`} onClick={() => loadRec(i)}>
                      <div className="flex-between" style={{ width: '100%' }}>
                        <span>{s.id}</span>
                        <span className="badge" style={{ fontSize: 10, background: `${CATEGORY_COLORS[s.category]}20`, color: CATEGORY_COLORS[s.category] }}>
                          {s.category.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                {rec ? (
                  <div className="card">
                    <h3 className="section-title mb-16">Student Profile: {rec.student_id}</h3>
                    <div className="stat-card mb-16" style={{ borderLeft: `4px solid ${CATEGORY_COLORS[rec.category]}` }}>
                      <div className="stat-label mb-4">Learning Category</div>
                      <div className="stat-value" style={{ color: CATEGORY_COLORS[rec.category], fontSize: 22 }}>{rec.category}</div>
                      <div className="mt-8">
                        <div className="stat-label mb-4">Learning Speed Index</div>
                        <div className="progress-bar-wrap">
                          <div className="progress-bar" style={{ width: `${rec.lsi * 100}%`, background: CATEGORY_COLORS[rec.category] }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{rec.lsi}</span>
                      </div>
                    </div>
                    <div>
                      <div className="section-title mb-12">💡 AI Recommendations</div>
                      {rec.recommendations.map((r, i) => (
                        <div key={i} className="flex gap-12 mb-10" style={{ padding: '10px 14px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--accent2)', fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>
                          <span style={{ fontSize: 14, color: 'var(--text)' }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text2)' }}>Select a student to view their profile</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
