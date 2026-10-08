import React from 'react';

interface LayoutProps {
  currentTab: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectTab: (tab: string) => void;
  onOpenNewUnitModal: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  theme,
  onToggleTheme,
  onSelectTab,
  onOpenNewUnitModal,
  children,
}) => {
  const navItems = [
    { id: 'command-center', label: 'Command Center', icon: '📊' },
    { id: 'unit-passport', label: 'Unit Passport', icon: '🪪' },
    { id: 'operations', label: 'Operations Hub', icon: '⚙️' },
    { id: 'exceptions', label: 'Exceptions & Reviews', icon: '⚠️' },
    { id: 'analytics', label: 'Analytics & Claims', icon: '📈' },
    { id: 'settings', label: 'Settings & Health', icon: '🔧' },
  ];

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>C</span>
          </div>
          <div>
            <div className="sidebar-title">CUBE Round 3</div>
            <div className="sidebar-subtitle">Commerce Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-link ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: '10px' }}>
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '11px', padding: '6px' }} onClick={onToggleTheme}>
              {theme === 'dark' ? '☀️ Switch to Light Theme' : '🌙 Switch to Dark Theme'}
            </button>
          </div>
          <div>System Mode: Integrated Orchestrator</div>
          <div style={{ color: 'var(--color-pass)', marginTop: '4px', fontWeight: 600 }}>● All 5 Agents Active</div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-title">
            {navItems.find((n) => n.id === currentTab)?.label || 'Overview'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={onOpenNewUnitModal}>
              ➕ New Test Unit Workflow
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>Org: <strong>org_demo_alpha</strong></span>
            <span style={{ background: 'var(--color-pass-bg)', color: 'var(--color-pass)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '11px' }}>
              LIVE SYNC
            </span>
          </div>
        </header>

        <main className="content-container">{children}</main>
      </div>
    </div>
  );
};
