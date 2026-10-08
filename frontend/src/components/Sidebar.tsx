import { CheckSquare, LayoutDashboard, PlusCircle, ClipboardList, Package, BookOpen, Activity, BarChart2, Settings } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  {
    section: 'OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'new-inspection', label: 'New Inspection', icon: PlusCircle },
      { id: 'history', label: 'Inspection History', icon: ClipboardList },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { id: 'products', label: 'Products & Rules', icon: Package },
      { id: 'prep-rules', label: 'Preparation Rules', icon: BookOpen },
      { id: 'agent-activity', label: 'Agent Activity', icon: Activity },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { id: 'evaluation', label: 'Evaluation', icon: BarChart2 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const pipeline = [
  { num: '01', label: 'Receiving', status: 'connected' },
  { num: '02', label: 'Prep', status: 'active' },
  { num: '03', label: 'Pack', status: 'connected' },
  { num: '04', label: 'Returns', status: 'connected' },
  { num: '05', label: 'Recovery', status: 'connected' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <CheckSquare size={16} />
        </div>
        <div className="sidebar-brand-name">PREP MANAGER</div>
        <div className="sidebar-brand-sub">Visual Prep Compliance</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="pipeline-status">CUBE PIPELINE</div>
        {pipeline.map(step => (
          <div key={step.num} className="pipeline-item">
            <div className="pipeline-item-label">
              <div className={`pipeline-dot ${step.status}`} />
              <span>{step.num} {step.label}</span>
            </div>
            <span className={`pipeline-status-tag ${step.status}`}>
              {step.status === 'active' ? 'Active' : 'Connected'}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
