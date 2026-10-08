import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewInspection from './pages/NewInspection';
import InspectionHistory from './pages/InspectionHistory';
import InspectionDetail from './pages/InspectionDetail';
import PrepRules from './pages/PrepRules';
import Products from './pages/Products';
import AgentActivity from './pages/AgentActivity';
import Evaluation from './pages/Evaluation';
import Settings from './pages/Settings';
import { Building, PlusCircle } from 'lucide-react';

type Page = 'dashboard' | 'new-inspection' | 'history' | 'inspection-detail' | 'products' | 'prep-rules' | 'agent-activity' | 'evaluation' | 'settings';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard', sub: 'Prep Manager Overview' },
  'new-inspection': { title: 'New Inspection', sub: 'Visual Prep Compliance Check' },
  history: { title: 'Inspection History', sub: 'All inspection records' },
  'inspection-detail': { title: 'Inspection Detail', sub: 'Evidence & compliance result' },
  products: { title: 'Products & Rules', sub: 'SKU registry and rule mapping' },
  'prep-rules': { title: 'Preparation Rules', sub: 'Authoritative rule registry' },
  'agent-activity': { title: 'Agent Activity', sub: 'Pipeline operations log' },
  evaluation: { title: 'Evaluation', sub: 'Model accuracy and failure modes' },
  settings: { title: 'Settings', sub: 'Organization and system configuration' },
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [org, setOrg] = useState('org_demo_alpha');

  const navigate = (newPage: string, params?: Record<string, string>) => {
    setPage(newPage as Page);
    setPageParams(params || {});
  };

  const currentTitle = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard org={org} onNavigate={navigate} />;
      case 'new-inspection':
        return <NewInspection org={org} onNavigate={navigate} />;
      case 'history':
        return <InspectionHistory org={org} onNavigate={navigate} />;
      case 'inspection-detail':
        return <InspectionDetail inspectionId={pageParams.id || ''} org={org} onNavigate={navigate} />;
      case 'products':
        return <Products org={org} onNavigate={navigate} />;
      case 'prep-rules':
        return <PrepRules />;
      case 'agent-activity':
        return <AgentActivity org={org} onNavigate={navigate} />;
      case 'evaluation':
        return <Evaluation org={org} />;
      case 'settings':
        return <Settings org={org} onOrgChange={setOrg} />;
      default:
        return <Dashboard org={org} onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar currentPage={page} onNavigate={(p) => navigate(p)} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{currentTitle.title}</h1>
            <p>{currentTitle.sub}</p>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text3)' }}>
              <Building size={13} />
              <span>{org}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
              Agent Online
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('new-inspection')}>
              <PlusCircle size={13} /> New Inspection
            </button>
          </div>
        </header>
        <main>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
