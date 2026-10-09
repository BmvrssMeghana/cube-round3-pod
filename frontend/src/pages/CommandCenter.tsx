import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorkflowState } from '../types';
import {
  Package, CheckCircle, Box, RotateCcw, DollarSign,
  AlertTriangle, TrendingUp, TrendingDown, Activity,
  Filter, RefreshCw, Eye, Play, BarChart2, MapPin,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend,
} from 'recharts';
import {
  fetchDashboardActivity,
  fetchDashboardLocations,
  fetchDashboardSummary,
  fetchDashboardTimeseries,
  type DashboardSummary,
} from '../services/api';

interface CommandCenterProps {
  orgId: string;
  workflows: WorkflowState[];
  liveBackend: boolean;
  lastRefresh: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectUnit: (unitId: string) => void;
  onNavigateAgent: (stage: string) => void;
  onRunWorkflow: (unitId: string) => void;
  onOpenNewUnitModal: () => void;
}

type DateRange = 'today' | '7d' | '30d' | '90d';

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 Days' },
  { value: '30d',   label: 'Last 30 Days' },
  { value: '90d',   label: 'Last 90 Days' },
];

const AGENTS = [
  { id: 'receiving', label: 'Receiving', num: '01', icon: Package,    color: '#22C55E' },
  { id: 'prep',      label: 'Prep',      num: '02', icon: CheckCircle, color: '#3B82F6' },
  { id: 'pack',      label: 'Pack',      num: '03', icon: Box,         color: '#60A5FA' },
  { id: 'returns',   label: 'Returns',   num: '04', icon: RotateCcw,   color: '#F59E0B' },
  { id: 'recovery',  label: 'Recovery',  num: '05', icon: DollarSign,  color: '#A855F7' },
];

function VerdictBar({ pass, fail, uncertain, total }: { pass: number; fail: number; uncertain: number; total: number }) {
  if (total === 0) return <div className="h-1.5 rounded-full" style={{ background: '#1E2D45' }} />;
  const pPct = (pass / total) * 100;
  const fPct = (fail / total) * 100;
  const uPct = (uncertain / total) * 100;
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1E2D45' }}>
      <div style={{ width: `${pPct}%`, background: '#22C55E' }} />
      <div style={{ width: `${fPct}%`, background: '#EF4444' }} />
      <div style={{ width: `${uPct}%`, background: '#F59E0B' }} />
    </div>
  );
}

function DonutChart({ pass, fail, uncertain }: { pass: number; fail: number; uncertain: number }) {
  const total = pass + fail + uncertain;
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <span style={{ fontSize: 11, color: '#475569' }}>No data</span>
    </div>
  );

  const r = 40;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: pass,      color: '#22C55E', label: 'PASS' },
    { value: fail,      color: '#EF4444', label: 'FAIL' },
    { value: uncertain, color: '#F59E0B', label: 'UNCERTAIN' },
  ];

  let offset = 0;
  const paths = segments.map((seg) => {
    const pct = seg.value / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = (offset / total) * 360 - 90;
    offset += seg.value;
    return { ...seg, dashArray, rotation };
  });

  const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E2D45" strokeWidth="14" />
          {paths.map((p) => (
            <circle
              key={p.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="14"
              strokeDasharray={p.dashArray}
              strokeDashoffset={0}
              transform={`rotate(${p.rotation} ${cx} ${cy})`}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading font-black text-white" style={{ fontSize: 20 }}>{passRate}%</span>
          <span style={{ fontSize: 9, color: '#475569', fontFamily: 'Poppins' }}>PASS RATE</span>
        </div>
      </div>
      <div className="flex gap-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Poppins' }}>{s.label} <strong style={{ color: '#CBD5E1' }}>{s.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemiGauge({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const clampedVal = Math.max(0, Math.min(100, value));
  const angle = (clampedVal / 100) * 180;
  const r = 50;
  const cx = 65;
  const cy = 65;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toXY = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg - 180)),
    y: cy + r * Math.sin(toRad(deg - 180)),
  });
  const startPt = toXY(0);
  const endPt = toXY(180);
  const activePt = toXY(angle);
  const largeArc = angle > 90 ? 1 : 0;
  const color = clampedVal >= 90 ? '#22C55E' : clampedVal >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="80" viewBox="0 0 130 80">
        {/* Background arc */}
        <path
          d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${endPt.x} ${endPt.y}`}
          fill="none" stroke="#1E2D45" strokeWidth="12" strokeLinecap="round"
        />
        {/* Active arc */}
        {clampedVal > 0 && (
          <path
            d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${activePt.x} ${activePt.y}`}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text x={cx} y={58} textAnchor="middle" fill="white" fontSize="16" fontFamily="Manrope" fontWeight="800">
          {clampedVal}%
        </text>
      </svg>
      <div className="text-center">
        <div className="font-poppins font-semibold text-white" style={{ fontSize: 12 }}>{label}</div>
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Poppins' }}>{sublabel}</div>
      </div>
    </div>
  );
}

function MiniTrend({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  orgId,
  workflows,
  liveBackend,
  lastRefresh,
  isRefreshing,
  onRefresh,
  theme,
  onToggleTheme,
  onSelectUnit,
  onNavigateAgent,
  onRunWorkflow,
  onOpenNewUnitModal,
}) => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'UNCERTAIN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeseries, setTimeseries] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [locations, setLocations] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const [s, ts, act, loc] = await Promise.all([
        fetchDashboardSummary(orgId, dateRange),
        fetchDashboardTimeseries(orgId, dateRange),
        fetchDashboardActivity(orgId, 30),
        fetchDashboardLocations(orgId),
      ]);
      setSummary(s);
      setTimeseries(ts);
      setActivity(Array.isArray(act) ? act : []);
      setLocations(loc);
    } finally {
      setDashLoading(false);
    }
  }, [orgId, dateRange]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Compute real metrics from workflows
  const stats = useMemo(() => {
    const total = workflows.length;
    const completed = workflows.filter((w) => w.status === 'COMPLETED').length;
    const inProgress = workflows.filter((w) => w.status === 'IN_PROGRESS').length;
    const halted = workflows.filter((w) => w.status === 'HALTED' || w.status === 'DEGRADED').length;

    // Stage execution counts
    const stageCounts: Record<string, { pass: number; fail: number; uncertain: number; total: number }> = {};
    AGENTS.forEach((a) => { stageCounts[a.id] = { pass: 0, fail: 0, uncertain: 0, total: 0 }; });

    let globalPass = 0, globalFail = 0, globalUncertain = 0;

    workflows.forEach((wf) => {
      wf.stage_results.forEach((s) => {
        if (!stageCounts[s.stage]) return;
        if (s.state === 'completed') {
          stageCounts[s.stage].total++;
          if (s.verdict === 'PASS')      { stageCounts[s.stage].pass++;      globalPass++; }
          else if (s.verdict === 'FAIL') { stageCounts[s.stage].fail++;      globalFail++; }
          else if (s.verdict === 'UNCERTAIN') { stageCounts[s.stage].uncertain++; globalUncertain++; }
        }
      });
    });

    const totalCompleted = globalPass + globalFail + globalUncertain;
    const passRate = totalCompleted > 0 ? Math.round((globalPass / totalCompleted) * 100) : 0;
    const agentSuccessRate = totalCompleted > 0 ? Math.round(((globalPass + globalUncertain) / totalCompleted) * 100) : 0;

    const pendingReviews = workflows.filter((wf) =>
      wf.stage_results.some((s) => s.needs_human || s.verdict === 'UNCERTAIN')
    ).length;

    const recoveryClaims = workflows.filter((w) =>
      w.final_outcome?.status === 'CLAIM_RECOMMENDED' ||
      w.stage_results.some((s) => s.stage === 'recovery' && s.verdict === 'PASS')
    ).length;

    return {
      total, completed, inProgress, halted,
      globalPass, globalFail, globalUncertain,
      totalCompleted, passRate, agentSuccessRate,
      pendingReviews, recoveryClaims, stageCounts,
    };
  }, [workflows]);

  // Filtered workflows for table
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      const matchesSearch = !searchTerm ||
        wf.subject_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVerdict = verdictFilter === 'ALL' ||
        (verdictFilter === 'PASS' && wf.status === 'COMPLETED') ||
        (verdictFilter === 'FAIL' && wf.status === 'HALTED') ||
        (verdictFilter === 'UNCERTAIN' && wf.status === 'DEGRADED');
      return matchesSearch && matchesVerdict;
    });
  }, [workflows, searchTerm, verdictFilter]);

  // Funnel data
  const funnelData = useMemo(() => {
    return AGENTS.map((agent) => {
      const reached = workflows.filter((wf) =>
        wf.stage_results.some((s) => s.stage === agent.id && s.state !== 'pending')
      ).length;
      return { ...agent, count: reached };
    });
  }, [workflows]);

  const kpis = summary?.kpis;
  const recoveryKpi = (kpis?.recovery || {}) as Record<string, number>;
  const passTrend = typeof kpis?.pass_rate_trend_pct === 'number' ? kpis.pass_rate_trend_pct : null;

  const kpiCards = [
    {
      label: 'Total Units',
      value: kpis?.total_units ?? stats.total,
      sub: 'Distinct registered units',
      icon: Package,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.08)',
      trend: null,
      trendUp: true,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'Active Workflows',
      value: kpis?.active_workflows ?? stats.inProgress,
      sub: 'In pipeline now',
      icon: Activity,
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.08)',
      trend: null,
      trendUp: true,
    },
    {
      label: 'Units Processed',
      value: kpis?.units_processed ?? '—',
      sub: `Completed in ${dateRange}`,
      icon: CheckCircle,
      color: '#0EA5E9',
      bg: 'rgba(14,165,233,0.08)',
      trend: null,
      trendUp: true,
    },
    {
      label: 'PASS Rate',
      value: kpis?.pass_rate != null ? `${kpis.pass_rate}%` : stats.totalCompleted ? `${stats.passRate}%` : '—',
      sub: summary?.verdict_distribution?.denominator
        ? `${summary.verdict_distribution.counts.PASS || 0} / ${summary.verdict_distribution.denominator} evidence records`
        : 'No eligible evaluations',
      icon: CheckCircle,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.08)',
      trend: passTrend != null ? `${passTrend > 0 ? '+' : ''}${passTrend}% vs prior period` : null,
      trendUp: passTrend == null ? true : passTrend >= 0,
    },
    {
      label: 'Awaiting Action',
      value: kpis?.awaiting_action ?? stats.pendingReviews,
      sub: 'Units needing next step',
      icon: AlertTriangle,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      trend: null,
      trendUp: false,
    },
    {
      label: 'FAIL Count',
      value: kpis?.fail_count ?? stats.globalFail,
      sub: 'Failed evaluations in range',
      icon: AlertTriangle,
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      trend: null,
      trendUp: false,
    },
    {
      label: 'Potential Recovery',
      value: recoveryKpi.potential_recoverable != null ? `$${recoveryKpi.potential_recoverable.toFixed(2)}` : stats.recoveryClaims,
      sub: 'Eligible claim amount (not confirmed)',
      icon: DollarSign,
      color: '#A855F7',
      bg: 'rgba(168,85,247,0.08)',
      trend: null,
      trendUp: true,
      onClick: () => onNavigateAgent('recovery'),
    },
    {
      label: 'Agent Success Rate',
      value: summary?.operational_health?.percentage != null
        ? `${summary.operational_health.percentage}%`
        : stats.totalCompleted ? `${stats.agentSuccessRate}%` : '—',
      sub: summary?.operational_health
        ? `${summary.operational_health.numerator}/${summary.operational_health.denominator} PASS evidence`
        : 'Completed execution success',
      icon: BarChart2,
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.08)',
      trend: null,
      trendUp: true,
    }
  ];

  return (
    <div className="space-y-6 fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-poppins font-semibold text-blue-600 uppercase tracking-widest" style={{ fontSize: 10 }}>
            Operations Dashboard
          </p>
          <h1 className="font-heading font-black text-[var(--text-primary)]" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
            Command Center
          </h1>
          <p className="font-poppins text-[var(--text-muted)] mt-0.5" style={{ fontSize: 13 }}>
            {kpis?.total_units ?? stats.total} registered units · range {dateRange}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`badge ${liveBackend ? 'badge-pass' : 'badge-fail'}`}>
              {liveBackend ? 'Live API' : 'Offline — start orchestrator on :8100'}
            </span>
            {!liveBackend && import.meta.env.VITE_ALLOW_DEMO_FALLBACK === '1' && (
              <span className="badge badge-uncertain">Demo fallback enabled</span>
            )}
            {lastRefresh && (
              <span className="font-poppins text-[var(--text-muted)]" style={{ fontSize: 11 }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateRange(opt.value)}
                className="px-3 py-1.5 font-poppins font-medium transition-all"
                style={{
                  fontSize: 12,
                  background: dateRange === opt.value ? '#2563EB' : 'transparent',
                  color: dateRange === opt.value ? '#fff' : 'var(--text-muted)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { onRefresh(); void loadDashboard(); }}
            disabled={isRefreshing || dashLoading}
          >
            <RefreshCw size={14} className={isRefreshing || dashLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button type="button" className="btn btn-ghost" onClick={onToggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onOpenNewUnitModal}>
            + New Unit
          </button>
        </div>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="kpi-card"
              role={kpi.onClick ? 'button' : undefined}
              onClick={kpi.onClick}
              style={kpi.onClick ? { cursor: 'pointer' } : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-poppins font-medium text-slate-400" style={{ fontSize: 12 }}>
                  {kpi.label}
                </span>
                <div className="p-1.5 rounded-lg" style={{ background: kpi.bg }}>
                  <Icon size={14} style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="font-heading font-black text-[var(--text-primary)] mb-1" style={{ fontSize: 28, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-poppins text-slate-500" style={{ fontSize: 11 }}>{kpi.sub}</span>
                {kpi.trend && (
                  <span
                    className="flex items-center gap-0.5 font-poppins font-semibold"
                    style={{ fontSize: 11, color: kpi.trendUp ? '#22C55E' : '#EF4444' }}
                  >
                    {kpi.trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {kpi.trend}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Verdict Distribution Donut */}
        <div className="card p-5 space-y-3">
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Verdict Distribution</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
              All completed stage executions — {stats.totalCompleted} total
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <DonutChart
              pass={summary?.verdict_distribution?.counts?.PASS ?? stats.globalPass}
              fail={summary?.verdict_distribution?.counts?.FAIL ?? stats.globalFail}
              uncertain={summary?.verdict_distribution?.counts?.UNCERTAIN ?? stats.globalUncertain}
            />
          </div>
        </div>

        {/* Operational Health Gauge */}
        <div className="card p-5 space-y-3 flex flex-col items-center justify-center">
          <div className="w-full">
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Operational Health</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
              PASS rate over selected period
            </p>
          </div>
          <SemiGauge
            value={summary?.operational_health?.percentage ?? stats.passRate ?? 0}
            label="Execution success"
            sublabel={
              summary?.operational_health
                ? `${summary.operational_health.numerator} PASS / ${summary.operational_health.denominator} evidence`
                : `${stats.globalPass} passed / ${stats.totalCompleted} executed`
            }
          />
          <div className="w-full grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg p-2.5 text-center" style={{ background: '#0D1117', border: '1px solid #1E2D45' }}>
              <div className="font-heading font-bold text-green-400" style={{ fontSize: 16 }}>{stats.globalPass}</div>
              <div className="font-poppins text-slate-500" style={{ fontSize: 10 }}>Passed</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: '#0D1117', border: '1px solid #1E2D45' }}>
              <div className="font-heading font-bold text-red-400" style={{ fontSize: 16 }}>{stats.globalFail}</div>
              <div className="font-poppins text-slate-500" style={{ fontSize: 10 }}>Failed</div>
            </div>
          </div>
        </div>

        {/* Workflow Funnel */}
        <div className="card p-5 space-y-3">
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Stage Funnel</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
              Units that reached each stage
            </p>
          </div>
          <div className="space-y-2 pt-1">
            {funnelData.map((stage) => {
              const funnelCount = summary?.funnel?.[stage.id] ?? stage.count;
              const denom = kpis?.total_units ?? stats.total;
              const pct = denom > 0 ? (funnelCount / Number(denom)) * 100 : 0;
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={12} style={{ color: stage.color }} />
                      <span className="font-poppins font-medium text-slate-300" style={{ fontSize: 12 }}>
                        {stage.num} {stage.label}
                      </span>
                    </div>
                    <span className="font-heading font-bold text-[var(--text-primary)]" style={{ fontSize: 13 }}>
                      {funnelCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2D45' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: stage.color, opacity: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Agent Performance ── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Agent Performance</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
              PASS / FAIL / UNCERTAIN per operational agent
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {AGENTS.map((agent) => {
            const apiPerf = summary?.agent_performance?.[agent.id];
            const counts = apiPerf
              ? { pass: apiPerf.pass, fail: apiPerf.fail, uncertain: apiPerf.uncertain, total: apiPerf.completed_in_period }
              : stats.stageCounts[agent.id];
            const Icon = agent.icon;
            const passRate = counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : 0;
            return (
              <div
                key={agent.id}
                className="rounded-xl p-4 space-y-3 transition-all cursor-pointer"
                style={{ background: '#0D1117', border: '1px solid #1E2D45' }}
                onClick={() => onNavigateAgent(agent.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2A3F60'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1E2D45'; }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color: agent.color }} />
                    <span className="font-poppins font-semibold text-slate-300" style={{ fontSize: 12 }}>
                      {agent.num} · {agent.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <VerdictBar pass={counts.pass} fail={counts.fail} uncertain={counts.uncertain} total={counts.total} />
                  <div className="flex justify-between font-poppins" style={{ fontSize: 10 }}>
                    <span className="text-green-400">{counts.pass}P</span>
                    <span className="text-red-400">{counts.fail}F</span>
                    <span className="text-amber-400">{counts.uncertain}U</span>
                  </div>
                </div>

                <div className="font-heading font-black text-white" style={{ fontSize: 20 }}>
                  {passRate}<span className="text-slate-500 font-poppins font-normal" style={{ fontSize: 11 }}>%</span>
                </div>
                <div className="font-poppins text-slate-600" style={{ fontSize: 10 }}>
                  {counts.total} executions total
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 chart-area" style={{ minHeight: 260 }}>
          <p className="font-poppins font-semibold text-[var(--text-primary)] mb-1" style={{ fontSize: 14 }}>Operations trend</p>
          <p className="font-poppins text-[var(--text-muted)] mb-3" style={{ fontSize: 11 }}>
            Registered units, completed workflows, and evidence executions
          </p>
          {timeseries?.series?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeseries.series}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="registered_units" name="Registered" stroke="#3B82F6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="completed_workflows" name="Completed WF" stroke="#22C55E" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="failed_or_blocked" name="Blocked" stroke="#EF4444" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-[var(--text-muted)] font-poppins">No time-series data for this range.</p>
          )}
        </div>
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500" />
            <p className="font-poppins font-semibold text-[var(--text-primary)]" style={{ fontSize: 14 }}>Route summary</p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">{locations?.note || 'No geographic coordinates stored.'}</p>
          {(locations?.summary || []).map((row: any) => (
            <div key={row.label} className="flex justify-between text-sm font-poppins">
              <span>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <p className="font-poppins font-semibold text-[var(--text-primary)]" style={{ fontSize: 14 }}>Recent activity</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No persisted events yet.</p>
          ) : activity.map((ev, idx) => (
            <button
              key={`${ev.type}-${ev.timestamp}-${idx}`}
              type="button"
              className="w-full text-left rounded-lg p-2.5 flex justify-between gap-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onClick={() => ev.unit_id && onSelectUnit(ev.unit_id)}
            >
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">{ev.type.replace(/_/g, ' ')}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{ev.unit_id} · {ev.stage || '—'} · {ev.context?.slice?.(0, 60)}</div>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] shrink-0">{String(ev.timestamp || '').slice(0, 16)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Unit Table ── */}
      <div className="card overflow-hidden">
        <div
          className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderBottom: '1px solid #1E2D45' }}
        >
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>
              Active Unit Passports & Evidence Ledger
            </p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
              {filteredWorkflows.length} of {workflows.length} units shown
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Filter units…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg text-slate-300 text-xs outline-none"
                style={{ background: '#0D1117', border: '1px solid #1E2D45', width: 160, fontSize: 12 }}
              />
            </div>

            {/* Verdict filter */}
            {(['ALL', 'PASS', 'FAIL', 'UNCERTAIN'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVerdictFilter(v)}
                className="px-2.5 py-1 rounded-lg font-poppins font-medium transition-all"
                style={{
                  fontSize: 11,
                  background: verdictFilter === v ? '#1A2235' : 'transparent',
                  color: verdictFilter === v ? '#60A5FA' : '#475569',
                  border: `1px solid ${verdictFilter === v ? '#2A3F60' : 'transparent'}`,
                }}
              >
                {v}
              </button>
            ))}

            <button className="btn btn-primary text-xs px-3 py-1.5" onClick={onOpenNewUnitModal}>
              + New Unit
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit ID</th>
                <th>Route</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Stages</th>
                <th>SHA-256</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                    No units match the current filters.
                  </td>
                </tr>
              ) : (
                filteredWorkflows.map((wf) => {
                  const isHalted = wf.status === 'HALTED' || wf.status === 'DEGRADED';
                  const isCompleted = wf.status === 'COMPLETED';
                  const route = wf.stage_results.find((s) => s.stage === 'prep')?.state !== 'skipped' ? 'FBA' : 'MFN';
                  const completedStages = wf.stage_results.filter((s) => s.state === 'completed').length;

                  return (
                    <tr key={wf.subject_id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-blue-300">{wf.subject_id}</span>
                          {isHalted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: route === 'FBA' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                            color: route === 'FBA' ? '#93C5FD' : '#C4B5FD',
                            border: `1px solid ${route === 'FBA' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)'}`,
                          }}
                        >
                          {route}
                        </span>
                      </td>
                      <td className="text-slate-300" style={{ fontSize: 12 }}>
                        {wf.current_stage || '01 · Receiving'}
                      </td>
                      <td>
                        <span className={`badge ${isHalted ? 'badge-fail' : isCompleted ? 'badge-pass' : 'badge-blue'}`}>
                          {isHalted && <span className="w-1 h-1 rounded-full bg-red-400" />}
                          {isCompleted && <span className="w-1 h-1 rounded-full bg-green-400" />}
                          {!isHalted && !isCompleted && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                          {wf.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          {wf.stage_results.map((s) => {
                            const col = s.state === 'completed' && s.verdict === 'PASS' ? '#22C55E'
                              : s.state === 'completed' && s.verdict === 'FAIL' ? '#EF4444'
                              : s.state === 'completed' ? '#F59E0B'
                              : s.state === 'skipped' ? '#1E2D45'
                              : '#334155';
                            return (
                              <span
                                key={s.stage}
                                title={`${s.stage}: ${s.verdict || s.state}`}
                                className="inline-block w-5 h-2 rounded-sm"
                                style={{ background: col }}
                              />
                            );
                          })}
                          <span className="ml-1.5 font-poppins text-slate-500" style={{ fontSize: 11 }}>
                            {completedStages}/5
                          </span>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                          {wf.genesis_hash ? `${wf.genesis_hash.slice(0, 14)}…` : '—'}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="btn btn-ghost px-2.5 py-1"
                            style={{ fontSize: 11 }}
                            onClick={() => onSelectUnit(wf.subject_id)}
                          >
                            <Eye size={12} />
                            Passport
                          </button>
                          <button
                            className="px-2.5 py-1 rounded-lg font-poppins font-semibold text-slate-400 hover:text-blue-300 transition-colors"
                            style={{ fontSize: 11, background: '#0D1117', border: '1px solid #1E2D45' }}
                            onClick={() => onRunWorkflow(wf.subject_id)}
                          >
                            <Play size={11} className="inline mr-1" />
                            Run
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
