import { useState } from 'react';
import Page1Upload from './pages/Page1Upload';
import Page2Analytics from './pages/Page2Analytics';
import Page3Research from './pages/Page3Research';
import Page4Chat from './pages/Page4Chat';
import Page5Explorer from './pages/Page5Explorer';
import Page6History from './pages/Page6History';
import Navbar from './components/Navbar';

export default function App() {
  const [page, setPage] = useState(1);
  const [dataset, setDataset] = useState(null); // { file_id, filename, summary, ... }

  const handleDatasetLoaded = (data) => {
    setDataset(data);
    setPage(2);
  };

  const nav = (p) => setPage(p);

  return (
    <div className="app-root">
      <Navbar currentPage={page} onNav={nav} dataset={dataset} />
      <main className="main-content">
        {page === 1 && <Page1Upload onDatasetLoaded={handleDatasetLoaded} onNav={nav} />}
        {page === 2 && <Page2Analytics dataset={dataset} onNav={nav} />}
        {page === 3 && <Page3Research dataset={dataset} onNav={nav} />}
        {page === 4 && <Page4Chat dataset={dataset} onNav={nav} />}
        {page === 5 && <Page5Explorer dataset={dataset} onNav={nav} />}
        {page === 6 && <Page6History dataset={dataset} onDatasetLoaded={handleDatasetLoaded} onNav={nav} />}
      </main>
    </div>
  );
}
