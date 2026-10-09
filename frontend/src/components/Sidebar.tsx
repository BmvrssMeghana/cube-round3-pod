import {
  LayoutGrid, Package, CheckCircle, Box, RotateCcw, DollarSign,
  FileText, AlertTriangle, BarChart3, Settings, Activity, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  agentHealth?: Record<string, { status: string }>;
  mobileOpen: boolean;
  onClose: () => void;
}

const AGENTS = ['receiving', 'prep', 'pack', 'returns', 'recovery'] as const;

const NAV = [
  {
    section: 'Overview',
    items: [
      { id: 'command-center', label: 'Command Center', icon: LayoutGrid },
      { id: 'passport',       label: 'Unit Passports',  icon: FileText },
      { id: 'exceptions',     label: 'Review Queue',     icon: AlertTriangle },
    ],
  },
  {
    section: 'Operational Agents',
    items: [
      { id: 'receiving', label: 'Receiving',   icon: Package,    num: '01' },
      { id: 'prep',      label: 'Prep',        icon: CheckCircle, num: '02' },
      { id: 'pack',      label: 'Pack',        icon: Box,        num: '03' },
      { id: 'returns',   label: 'Returns',     icon: RotateCcw,  num: '04' },
      { id: 'recovery',  label: 'Recovery',    icon: DollarSign, num: '05' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { id: 'analytics', label: 'Claims & Analytics', icon: BarChart3 },
      { id: 'settings',  label: 'System Health',      icon: Settings },
    ],
  },
];

const STAGE_STATUS: Record<string, { color: string; dot: string }> = {
  receiving: { color: 'text-green-400',  dot: 'bg-green-400'  },
  prep:      { color: 'text-blue-400',   dot: 'bg-blue-400'   },
  pack:      { color: 'text-blue-300',   dot: 'bg-blue-300'   },
  returns:   { color: 'text-amber-400',  dot: 'bg-amber-400'  },
  recovery:  { color: 'text-purple-400', dot: 'bg-purple-400' },
};

export default function Sidebar({
  currentPage,
  onNavigate,
  agentHealth = {},
  mobileOpen,
  onClose,
}: SidebarProps) {
  const knownHealth = AGENTS.some((agent) => agentHealth[agent] !== undefined);
  const onlineCount = AGENTS.filter((agent) => agentHealth[agent]?.status === 'ok').length;
  const healthColor = !knownHealth ? '#64748B' : onlineCount >= 3 ? '#22C55E' : onlineCount >= 1 ? '#F59E0B' : '#EF4444';
  const healthTextClass = !knownHealth ? 'text-slate-500' : onlineCount >= 3 ? 'text-green-400' : onlineCount >= 1 ? 'text-amber-400' : 'text-red-400';

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 w-60 flex-col md:flex ${mobileOpen ? 'flex' : 'hidden'}`}
        style={{ background: '#0D1117', borderRight: '1px solid #1E2D45' }}
      >
      {/* Brand */}
      <div
        className="h-14 px-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #1E2D45' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-heading font-black text-sm text-white"
            style={{ background: '#2563EB', boxShadow: '0 0 0 1px rgba(96,165,250,0.3)' }}
          >
            C
          </div>
          <div>
            <div className="font-heading font-black text-white text-base tracking-tight leading-none">CUBE</div>
            <div style={{ fontSize: 9 }} className="text-blue-500 font-poppins font-semibold uppercase tracking-widest">
              Operations Engine
            </div>
          </div>
        </div>
        <span
          className="text-blue-400 font-poppins font-bold"
          style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', padding: '2px 6px', borderRadius: 4 }}
        >
          v2.4
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.section}>
            <div className="section-label">{section.section}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const stageStyle = (item as any).num ? STAGE_STATUS[item.id] : null;

                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {(item as any).num ? (
                      <span
                        className={`font-mono font-bold text-xs min-w-[20px] ${isActive ? 'text-blue-400' : (stageStyle?.color || 'text-slate-500')}`}
                      >
                        {(item as any).num}
                      </span>
                    ) : (
                      <Icon
                        size={15}
                        className={isActive ? 'text-blue-400' : 'text-slate-500'}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight size={12} className="text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Health Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #1E2D45' }}>
        <div
          className="rounded-lg p-3 space-y-2"
          style={{ background: '#131822', border: '1px solid #1E2D45' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-blue-400" />
              <span className="font-poppins font-semibold text-blue-300" style={{ fontSize: 11 }}>
                Agent Mesh
              </span>
            </div>
            <div className="flex items-center gap-1" title={knownHealth ? `${onlineCount} of ${AGENTS.length} agents online` : 'Agent health unavailable'}>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full pulse-dot"
                style={{ background: healthColor, animation: knownHealth ? undefined : 'none' }}
              />
              <span
                className={`font-mono font-bold ${healthTextClass}`}
                style={{ fontSize: 11 }}
              >
                {knownHealth ? `${onlineCount}/${AGENTS.length}` : `—/${AGENTS.length}`}
              </span>
            </div>
          </div>

          {/* Mini health bars */}
          <div className="space-y-1">
            {AGENTS.map((agent, i) => {
              const info = agentHealth[agent];
              return (
                <div key={agent} className="flex items-center gap-2">
                  <span className="font-mono text-slate-600" style={{ fontSize: 9, minWidth: 14 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-slate-500 flex-1 capitalize" style={{ fontSize: 10 }}>{agent}</span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: !info ? '#64748B' : info.status === 'ok' ? '#22C55E' : '#EF4444' }}
                    title={!info ? `${agent}: health unavailable` : `${agent}: ${info.status === 'ok' ? 'online' : 'offline'}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
