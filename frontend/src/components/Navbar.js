import { Upload, BarChart3, Activity, MessageSquare, Search, History } from 'lucide-react';

const PAGES = [
  { id: 1, label: 'Upload', icon: Upload },
  { id: 2, label: 'Analytics', icon: BarChart3 },
  { id: 3, label: 'Research', icon: Activity },
  { id: 4, label: 'AI Chat', icon: MessageSquare },
  { id: 5, label: 'Explorer', icon: Search },
  { id: 6, label: 'History', icon: History },
];

export default function Navbar({ currentPage, onNav, dataset }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="dot" />
        <span className="brand-bold">INSIGHT</span>
        <span className="brand-light">AI</span>
      </div>
      <div className="nav-links">
        {PAGES.map(p => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              className={`nav-btn${currentPage === p.id ? ' active' : ''} flex gap-8`}
              onClick={() => onNav(p.id)}
              disabled={p.id > 1 && !dataset}
            >
              <Icon size={16} />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="nav-right">
        {dataset && (
          <div className="dataset-badge">
            {dataset.filename.toUpperCase()}
          </div>
        )}
        <div className="profile-circle" />
      </div>
    </nav>
  );
}
