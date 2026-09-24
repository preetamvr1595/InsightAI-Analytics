import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line, CartesianGrid } from 'recharts';

/* New Palette: Dark Purple, Pale Purple, Pastel Blue, Pastel Pink, Pastel Green, Pale Violet, Lavender */
const COLORS = ['#4B0082', '#A2D2FF', '#FDE2E4', '#B9FBC0', '#D8BFD8', '#E6E6FA', '#D1D1F7'];

const tooltipStyle = {
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(209, 209, 247, 0.4)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#2d1a47',
  boxShadow: '0 4px 12px rgba(31, 38, 135, 0.07)'
};

const tickStyle = { fill: '#5d5a88', fontSize: 10, fontWeight: 500 };

export function SimpleBarChart({ data, color = '#4B0082', height = 200 }) {
  if (!data || !data.labels) return null;
  const chartData = data.labels.map((l, i) => ({ name: String(l).slice(0, 15), value: data.values[i] }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
        <XAxis dataKey="name" tick={tickStyle} angle={-30} textAnchor="end" interval={0} stroke="#d1d1f7" />
        <YAxis tick={tickStyle} stroke="#d1d1f7" />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(209, 209, 247, 0.2)' }} />
        <Bar dataKey="value" fill={color} radius={[6,6,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MultiBarChart({ datasets, height = 240 }) {
  if (!datasets || !datasets.length) return null;
  const labels = datasets[0].labels;
  const chartData = labels.map((l, i) => {
    const row = { name: String(l).slice(0, 12) };
    datasets.forEach(ds => { row[ds.key] = ds.values[i]; });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
        <XAxis dataKey="name" tick={tickStyle} stroke="#d1d1f7" />
        <YAxis tick={tickStyle} stroke="#d1d1f7" />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(209, 209, 247, 0.2)' }} />
        {datasets.map((ds, i) => <Bar key={ds.key} dataKey={ds.key} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleScatter({ xData, yData, xLabel = 'X', yLabel = 'Y', height = 240 }) {
  const points = (xData || []).slice(0, 500).map((x, i) => ({ x, y: yData[i] }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
        <CartesianGrid stroke="rgba(209, 209, 247, 0.3)" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name={xLabel} tick={tickStyle} stroke="#d1d1f7" label={{ value: xLabel, position: 'insideBottom', offset: -5, fill: '#5d5a88', fontSize: 11, fontWeight: 600 }} />
        <YAxis type="number" dataKey="y" name={yLabel} tick={tickStyle} stroke="#d1d1f7" />
        <Tooltip contentStyle={tooltipStyle} />
        <Scatter data={points} fill="#4B0082" opacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function HeatmapChart({ matrix, columns, height = 400 }) {
  if (!matrix || !columns) return null;
  const size = columns.length;
  const cellSize = Math.min(60, Math.floor(500 / size));
  const getColor = (v) => {
    const abs = Math.abs(v);
    if (v > 0.7) return `rgba(75, 0, 130, ${abs})`; /* Dark Purple */
    if (v < -0.7) return `rgba(211, 47, 47, ${abs})`; /* Red */
    if (abs > 0.4) return `rgba(162, 210, 255, ${abs})`; /* Pastel Blue */
    return `rgba(230, 230, 250, ${abs * 0.5 + 0.3})`; /* Lavender */
  };
  const grid = {};
  matrix.forEach(m => { grid[`${m.y}|${m.x}`] = m.value; });
  return (
    <div style={{ overflowX: 'auto', padding: '10px 0' }}>
      <div style={{ display: 'inline-block' }}>
        <div style={{ display: 'flex', gap: 0, flexDirection: 'column' }}>
          {columns.map(row => (
            <div key={row} style={{ display: 'flex', gap: 0 }}>
              <div style={{ width: 100, fontSize: 10, color: '#5d5a88', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, flexShrink: 0 }}>
                {row.slice(0, 15)}
              </div>
              {columns.map(col => {
                const v = grid[`${row}|${col}`] ?? 0;
                return (
                  <div key={col} title={`${row} × ${col}: ${v}`} style={{ width: cellSize, height: cellSize, background: getColor(v), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: Math.abs(v) > 0.6 ? '#fff' : '#4b0082', border: '1px solid #fff' }}>
                    {Math.abs(v) > 0.3 ? v.toFixed(2) : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MiniLineChart({ values, color = '#4B0082', height = 80 }) {
  const data = (values || []).map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip contentStyle={tooltipStyle} />
      </LineChart>
    </ResponsiveContainer>
  );
}
