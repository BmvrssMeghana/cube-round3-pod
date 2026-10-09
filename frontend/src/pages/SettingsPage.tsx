import React, { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';
import { Activity, Server, Shield, Database, Cpu, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof fetchHealth>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    let active = true;
    fetchHealth()
      .then((result) => {
        if (active) setHealth(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setHealthError(error instanceof Error ? error.message : 'Could not load agent health.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const agents = ['receiving', 'prep', 'pack', 'returns', 'recovery'];
  const onlineCount = agents.filter((a) => {
    const info = health?.agents?.[a];
    return info?.status === 'ok';
  }).length;
  const knownAgentCount = agents.filter((agent) => health?.agents?.[agent]?.status).length;
  const isOperational = health?.status === 'ok' && knownAgentCount === agents.length && onlineCount === agents.length;
  const systemStatus = loading ? 'CHECKING' : health ? health.status.toUpperCase() : 'UNAVAILABLE';

  return (
    <div className="space-y-6 fade-in">

      {/* Header */}
      <div>
        <p className="font-poppins font-semibold text-blue-500 uppercase tracking-widest" style={{ fontSize: 10 }}>
          System Infrastructure & Mesh Governance
        </p>
        <h1 className="font-heading font-black text-white" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          System Settings & Agent Mesh Health
        </h1>
        <p className="font-poppins text-slate-400 mt-0.5" style={{ fontSize: 13 }}>
          Inspect agent registry health, flow configurations, database connections, and multi-tenant isolation.
        </p>
      </div>

      {/* System Status Banner */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{
          background: isOperational ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${isOperational ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: isOperational ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)' }}
          >
            <Activity size={18} style={{ color: isOperational ? '#22C55E' : '#F59E0B' }} />
          </div>
          <div>
            <div className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>
              Evidence Engine — {systemStatus}
            </div>
            <div className="font-poppins text-slate-400" style={{ fontSize: 12 }}>
              Flow: <code style={{ color: '#60A5FA' }}>{health?.flow || 'standard-fba-mfn-5stage'}</code>
              {' · '}{onlineCount}/{agents.length} agents online
            </div>
          </div>
        </div>
        <span
          className={`badge ${isOperational ? 'badge-pass' : health || loading ? 'badge-uncertain' : 'badge-pending'}`}
          style={{ fontSize: 12 }}
        >
          {isOperational ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
          {isOperational ? 'OPERATIONAL' : loading ? 'CHECKING' : health ? 'DEGRADED' : 'UNKNOWN'}
        </span>
      </div>
      {healthError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {healthError}
        </p>
      )}

      {/* Agent Health Grid */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E2D45' }}>
          <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Agent Registry Health Monitor</p>
          <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>Active Flow Mesh: 5-stage physical unit pipeline</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
          {agents.map((agentName, idx) => {
            const info = health?.agents?.[agentName];
            const isOk = info?.status === 'ok';
            const isKnown = Boolean(info?.status);
            const Icon = isOk ? CheckCircle : isKnown ? XCircle : AlertTriangle;

            return (
              <div
                key={agentName}
                className="p-5 space-y-3"
                style={{
                  borderRight: idx < 4 ? '1px solid #1E2D45' : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-500" style={{ fontSize: 12 }}>
                    0{idx + 1}
                  </span>
                  <Icon size={14} className={isOk ? 'text-green-600' : isKnown ? 'text-red-500' : 'text-slate-400'} />
                </div>
                <div>
                  <div className="font-heading font-bold text-white capitalize" style={{ fontSize: 14 }}>
                    {agentName}
                  </div>
                  <div className="font-poppins text-slate-500 capitalize" style={{ fontSize: 11 }}>
                    {agentName} Manager
                  </div>
                </div>
                <div className={`badge ${isOk ? 'badge-pass' : isKnown ? 'badge-fail' : 'badge-pending'}`} style={{ width: 'fit-content' }}>
                  <span className="w-1 h-1 rounded-full" style={{ background: isOk ? '#22C55E' : isKnown ? '#EF4444' : '#64748B' }} />
                  {isOk ? 'ONLINE' : isKnown ? 'OFFLINE' : 'UNKNOWN'}
                </div>
                <div className="space-y-0.5">
                  <div className="font-poppins text-slate-600" style={{ fontSize: 10 }}>
                    Mode: <span className="text-slate-400">{info?.mode || '—'}</span>
                  </div>
                  <div className="font-poppins text-slate-600" style={{ fontSize: 10 }}>
                    Contract: <span className="text-slate-400">v1.0</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Infrastructure Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Multi-Tenant Isolation */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid #1E2D45' }}>
            <Shield size={16} className="text-blue-400" />
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>
              Multi-Tenant Isolation & Ledger Security
            </p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Active Tenant ID',    value: 'org_demo_alpha', note: 'Cryptographically isolated partition', icon: Database },
              { label: 'Hash Signatures',     value: 'SHA-256 / ECDSA', note: 'Immutable time-stamped evidence trails', icon: Shield },
              { label: 'Platform Node',       value: 'US-EAST-EVID-01', note: 'Amazon SP-API & Shopify webhook ready', icon: Server },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#0D1117', border: '1px solid #1E2D45' }}>
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <Icon size={13} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="font-poppins text-slate-500" style={{ fontSize: 10 }}>{row.label}</div>
                    <div className="font-heading font-bold text-white" style={{ fontSize: 13 }}>{row.value}</div>
                    <div className="font-poppins text-slate-600" style={{ fontSize: 10 }}>{row.note}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Configuration */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid #1E2D45' }}>
            <Cpu size={16} className="text-blue-400" />
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>
              System Configuration
            </p>
          </div>
          <div className="space-y-2">
            {[
              { key: 'Engine Version',       val: 'v4.19 PROD' },
              { key: 'Flow Mode',            val: health?.flow || 'standard-fba-mfn-5stage' },
              { key: 'Database',             val: 'SQLite (dev) / PostgreSQL (prod)' },
              { key: 'Evidence Protocol',    val: 'SHA-256 Content Hashing' },
              { key: 'Agent Execution',      val: 'In-Process (inproc)' },
              { key: 'API Version',          val: 'v1 REST + async workers' },
              { key: 'Sample Data Mode',     val: process.env.NODE_ENV === 'development' ? 'ENABLED' : 'DISABLED' },
            ].map(({ key, val }) => (
              <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(30,45,69,0.5)' }}>
                <span className="font-poppins text-slate-500" style={{ fontSize: 12 }}>{key}</span>
                <code className="font-mono text-blue-300" style={{ fontSize: 11 }}>{val}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
