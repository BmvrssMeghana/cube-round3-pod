import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, CartesianGrid,
} from 'recharts';
import type { StageName } from '../types';
import { STAGE_SPECS } from '../data/agentSpecs';
import { fetchAgentDashboard } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { LayoutList, Columns3, RefreshCw, X, ChevronRight } from 'lucide-react';

type ViewMode = 'table' | 'kanban';

interface AgentDashboardProps {
  stage: StageName;
  orgId: string;
  refreshKey: number;
  agentHealth?: { status: string };
  onOpenUnit: (unitId: string) => void;
  onRunInspection: () => void;
  runDisabled?: boolean;
  runDisabledReason?: string;
  headerExtra?: React.ReactNode;
}

const VERDICT_OPTS = ['ALL', 'PASS', 'FAIL', 'UNCERTAIN'] as const;

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  stage,
  orgId,
  refreshKey,
  agentHealth,
  onOpenUnit,
  onRunInspection,
  runDisabled = false,
  runDisabledReason,
  headerExtra,
}) => {
  const spec = STAGE_SPECS[stage];
  const [view, setView] = useState<ViewMode>('table');
  const [range, setRange] = useState('all');
  const [verdict, setVerdict] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('updated_desc');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await fetchAgentDashboard(stage, orgId, {
        range,
        page,
        page_size: 25,
        sort,
        ...(verdict !== 'ALL' ? { verdict } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setData(payload);
      if (!payload) setError('No dashboard data — ensure the orchestrator API is running.');
    } catch (error) {
      setData(null);
      setError(error instanceof Error ? error.message : 'Agent dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [stage, orgId, range, verdict, search, page, sort]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const chartVolume = useMemo(() => {
    if (!data?.rows) return [];
    const buckets: Record<string, number> = {};
    for (const row of data.rows) {
      const day = (row.finished_at || row.updated_at || '').slice(0, 10);
      if (day) buckets[day] = (buckets[day] || 0) + 1;
    }
    return Object.entries(buckets).map(([period, count]) => ({ period, count })).sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  const verdictChart = useMemo(() => {
    const k = data?.kpis;
    if (!k) return [];
    return [
      { name: 'PASS', value: k.pass || 0 },
      { name: 'FAIL', value: k.fail || 0 },
      { name: 'UNCERTAIN', value: k.uncertain || 0 },
    ];
  }, [data]);

  const healthLabel = agentHealth?.status === 'ok' ? 'Healthy' : agentHealth?.status === 'down' ? 'Unavailable' : (agentHealth?.status || 'Unknown');

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="font-poppins font-semibold text-blue-600 uppercase tracking-widest" style={{ fontSize: 10 }}>
            {stage} agent dashboard
          </p>
          <h2 className="font-heading font-bold text-[var(--text-primary)]" style={{ fontSize: 18 }}>
            {stage.charAt(0).toUpperCase() + stage.slice(1)} Operations
          </h2>
          <p className="font-poppins text-[var(--text-muted)]" style={{ fontSize: 12 }}>{spec.purpose}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge ${healthLabel === 'Healthy' ? 'badge-pass' : 'badge-fail'}`}>{healthLabel}</span>
            {data?.kpis?.executions_completed != null && (
              <span className="badge badge-blue">{data.kpis.executions_completed} executions in range</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRunInspection}
            disabled={runDisabled}
            title={runDisabled ? runDisabledReason : undefined}
            style={runDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            Run {stage}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Completed', value: data?.kpis?.executions_completed ?? '—' },
          { label: 'PASS rate', value: data?.kpis?.pass_rate != null ? `${data.kpis.pass_rate}%` : '—' },
          { label: 'FAIL', value: data?.kpis?.fail ?? '—' },
          { label: 'UNCERTAIN', value: data?.kpis?.uncertain ?? '—' },
          { label: 'Awaiting review', value: data?.kpis?.awaiting_review ?? '—' },
          { label: 'Blocked', value: data?.kpis?.blocked ?? '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card py-3">
            <div className="font-poppins text-[var(--text-muted)]" style={{ fontSize: 11 }}>{kpi.label}</div>
            <div className="font-heading font-black text-[var(--text-primary)]" style={{ fontSize: 22 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input-field" style={{ width: 140 }} value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          {VERDICT_OPTS.map((v) => (
            <button
              key={v}
              type="button"
              className="px-2.5 py-1 rounded-lg font-poppins font-medium"
              style={{
                fontSize: 11,
                background: verdict === v ? 'var(--bg-raised)' : 'transparent',
                color: verdict === v ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${verdict === v ? 'var(--border-active)' : 'var(--border)'}`,
              }}
              onClick={() => { setVerdict(v); setPage(1); }}
            >
              {v}
            </button>
          ))}
          <input
            className="input-field flex-1 min-w-[160px]"
            placeholder="Search unit, SKU, order…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
          />
          <button type="button" className="btn btn-ghost" onClick={() => { setVerdict('ALL'); setSearch(''); setPage(1); }}>
            <X size={14} /> Clear
          </button>
          <div className="ml-auto flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button type="button" className="px-3 py-1.5 flex items-center gap-1" style={{ background: view === 'table' ? 'var(--accent)' : 'transparent', color: view === 'table' ? '#fff' : 'var(--text-muted)', fontSize: 12 }} onClick={() => setView('table')}>
              <LayoutList size={14} /> Table
            </button>
            <button type="button" className="px-3 py-1.5 flex items-center gap-1" style={{ background: view === 'kanban' ? 'var(--accent)' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--text-muted)', fontSize: 12 }} onClick={() => setView('kanban')}>
              <Columns3 size={14} /> Kanban
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 font-poppins">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 chart-area" style={{ minHeight: 220 }}>
          <p className="font-poppins font-semibold text-[var(--text-primary)] mb-2" style={{ fontSize: 13 }}>Execution volume</p>
          {chartVolume.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs font-poppins">No executions in the selected range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartVolume}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-4 chart-area" style={{ minHeight: 220 }}>
          <p className="font-poppins font-semibold text-[var(--text-primary)] mb-2" style={{ fontSize: 13 }}>Verdict distribution (period)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={verdictChart}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {view === 'table' ? (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th><button type="button" onClick={() => setSort(sort === 'unit_asc' ? 'unit_desc' : 'unit_asc')}>Unit</button></th>
                  <th>SKU</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Verdict</th>
                  <th>Duration</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!data?.rows?.length ? (
                  <tr><td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">No records match filters.</td></tr>
                ) : data.rows.map((row: any) => (
                  <tr key={row.record_id || row.unit_id} className="cursor-pointer" onClick={() => onOpenUnit(row.unit_id)}>
                    <td className="font-heading font-bold text-blue-600">{row.unit_id}</td>
                    <td>{row.sku || '—'}</td>
                    <td>{(row.route || '—').toString().toUpperCase()}</td>
                    <td>{row.execution_status}</td>
                    <td><StatusBadge verdict={row.verdict || row.execution_status} /></td>
                    <td>{row.duration_ms != null ? `${row.duration_ms}ms` : '—'}</td>
                    <td style={{ fontSize: 11 }}>{row.updated_at ? String(row.updated_at).slice(0, 19) : '—'}</td>
                    <td><ChevronRight size={14} className="text-[var(--text-muted)]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.pagination && data.pagination.total > data.pagination.page_size && (
            <div className="p-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-xs text-[var(--text-muted)]">Page {data.pagination.page} · {data.pagination.total} total</span>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <button type="button" className="btn btn-ghost" disabled={page * data.pagination.page_size >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Object.entries(data?.kanban || {}).map(([col, cards]) => (
            <div key={col} className="card p-3 space-y-2 min-h-[120px]">
              <div className="flex justify-between items-center">
                <span className="font-poppins font-semibold text-xs text-[var(--text-primary)]">{col}</span>
                <span className="badge badge-blue">{(cards as any[]).length}</span>
              </div>
              {(cards as any[]).slice(0, 8).map((row, index) => (
                <button
                  key={row.record_id || `${row.unit_id}-${index}`}
                  type="button"
                  className="w-full text-left rounded-lg p-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  onClick={() => onOpenUnit(row.unit_id)}
                >
                  <div className="font-semibold text-xs text-[var(--text-primary)]">{row.unit_id}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{row.sku || '—'} · {row.verdict || row.execution_status}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 space-y-3">
        <p className="font-poppins font-semibold text-[var(--text-primary)]" style={{ fontSize: 14 }}>
          Subagents ({spec.subAgents.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {spec.subAgents.map((agent) => (
            <div key={agent.id} className="rounded-lg p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between gap-2 mb-1">
                <strong className="text-xs font-poppins text-[var(--text-primary)]">{agent.id} · {agent.name}</strong>
                <span className="badge badge-blue">{agent.type}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{agent.output}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
