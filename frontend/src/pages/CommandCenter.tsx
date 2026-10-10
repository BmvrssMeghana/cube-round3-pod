import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorkflowState } from '../types';
import {
  Package, CheckCircle, Box, RotateCcw, DollarSign,
  AlertTriangle, TrendingUp, TrendingDown, Activity,
  Filter, RefreshCw, Eye, Play, BarChart2,
} from 'lucide-react';
import {
  fetchDashboardActivity,
  fetchDashboardSummary,
  type DashboardSummary,
} from '../services/api';

interface CommandCenterProps {
  orgId: string;
  workflows: WorkflowState[];
  refreshToken: number;
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

type DateRange = 'all' | 'today' | '7d' | '30d' | '90d';

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all',   label: 'All Time' },
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

const ISSUE_CATEGORIES = [
  { label: 'Refund & reimbursement', color: '#8B5CF6' },
  { label: 'Technical', color: '#0EA5E9' },
  { label: 'Damaged goods', color: '#EF4444' },
  { label: 'Quantity mismatch', color: '#F59E0B' },
  { label: 'Identity mismatch', color: '#EC4899' },
  { label: 'Packaging & compliance', color: '#14B8A6' },
  { label: 'Packing & fulfillment', color: '#06B6D4' },
  { label: 'Returns & disposition', color: '#6366F1' },
  { label: 'Fees & recovery', color: '#A855F7' },
  { label: 'Other operational', color: '#64748B' },
] as const;

const LIFECYCLE_OUTCOMES = [
  { key: 'completed', label: 'Completed', color: '#22C55E' },
  { key: 'exception', label: 'Exception', color: '#EF4444' },
  { key: 'human_review', label: 'Human Review', color: '#F59E0B' },
  { key: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { key: 'incomplete', label: 'Incomplete', color: '#94A3B8' },
] as const;

type IssueCategory = typeof ISSUE_CATEGORIES[number]['label'];
type LifecycleOutcome = typeof LIFECYCLE_OUTCOMES[number]['key'];

function lifecycleOutcome(workflow: WorkflowState): LifecycleOutcome {
  const status = String(workflow.status || '').toUpperCase();
  const finalOutcome = String(workflow.final_outcome?.outcome || workflow.final_outcome?.status || '').toUpperCase();
  const stages = workflow.stage_results || [];
  if (
    stages.some((stage) => stage.needs_human) ||
    ['NEEDS_REVIEW', 'HUMAN_REVIEW'].includes(finalOutcome) ||
    status === 'BLOCKED'
  ) return 'human_review';
  if (
    ['EXCEPTION', 'CLAIM_RECOMMENDED'].includes(finalOutcome) ||
    ['HALTED', 'DEGRADED', 'EXCEPTION'].includes(status)
  ) return 'exception';
  if (finalOutcome === 'INCOMPLETE') return 'incomplete';
  if (status === 'COMPLETED' || finalOutcome === 'CLEAN') return 'completed';
  if (['PENDING', 'IN_PROGRESS', 'ACTIVE', 'RUNNING', 'RECOVERY_REQUIRED'].includes(status)) return 'in_progress';
  return 'incomplete';
}

function issueCategory(workflow: WorkflowState, stage: WorkflowState['stage_results'][number]): IssueCategory {
  const context = workflow.context || {};
  const attributes = context.attributes || {};
  const stageRecord = attributes.stage_records?.[stage.stage] || {};
  const sourceRows = attributes.source_records?.[stage.stage] || [];
  const identityMatch = String(stageRecord.identity_match || '').toLowerCase();
  if (['no', 'false', 'mismatch'].includes(identityMatch)) return 'Identity mismatch';
  if (
    stage.stage === 'pack' &&
    stageRecord.order_lines &&
    stageRecord.observed_in_box &&
    stageRecord.order_lines !== stageRecord.observed_in_box
  ) return 'Packing & fulfillment';
  const valuesOnly = (value: unknown): string => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(valuesOnly).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(valuesOnly).join(' ');
    return '';
  };
  const issueText = valuesOnly([
    stage.error,
    workflow.status_reason,
    stageRecord,
    sourceRows,
    workflow.errors,
    stage.stage === 'recovery' ? context.fee_lines || attributes.fee_lines : '',
  ]).toLowerCase();

  if (/\b(refund|reimburse(?:ment)?|chargeback|credit issued)\b/.test(issueText)) return 'Refund & reimbursement';
  if (/\b(technical|system|api|timeout|unavailable|integration|scanner|software|device error|attributeerror|connecterror|connection refused)\b/.test(issueText)) return 'Technical';
  if (/\b(damag(?:e|ed)|crush(?:ed|ing)?|water|tear(?:s|ing)?|puncture|broken|dent(?:ed)?)\b/.test(issueText)) return 'Damaged goods';
  if (/\b(identity|sku mismatch|asin mismatch|variant mismatch|look.?alike|wrong sku)\b/.test(issueText)) return 'Identity mismatch';
  if (/\b(quantity|qty|shortfall|missing (?:items?|parts?|components?)|under.?count)\b/.test(issueText)) return 'Quantity mismatch';
  if (/\b(packag(?:e|ing)|polybag|fnsku|label|barcode|prep_required|prep_completed|seal)\b/.test(issueText)) return 'Packaging & compliance';
  if (/\b(pack|packed|packing|fulfillment|fulfilment|order lines|in box)\b/.test(issueText)) return 'Packing & fulfillment';
  if (/\b(return|disposition|restock|unsellable)\b/.test(issueText)) return 'Returns & disposition';
  if (/\b(fee|charge|recovery|claim|reimbursable)\b/.test(issueText)) return 'Fees & recovery';
  if (stage.stage === 'receiving') return 'Quantity mismatch';
  if (stage.stage === 'prep') return 'Packaging & compliance';
  if (stage.stage === 'pack') return 'Packing & fulfillment';
  if (stage.stage === 'returns') return 'Returns & disposition';
  if (stage.stage === 'recovery') return 'Fees & recovery';
  return 'Other operational';
}

function buildIssueBreakdown(workflows: WorkflowState[]) {
  const totals = new Map<IssueCategory, { total: number; resolved: number }>();
  for (const workflow of workflows) {
    for (const stage of workflow.stage_results || []) {
      const isIssue = stage.state === 'error' || stage.verdict === 'FAIL' ||
        Boolean(stage.needs_human) || stage.verdict === 'UNCERTAIN';
      if (!isIssue) continue;

      const category = issueCategory(workflow, stage);
      const tally = totals.get(category) || { total: 0, resolved: 0 };
      tally.total += 1;
      const explicitlyOverridden = (workflow.overrides || []).some((override) =>
        override.supersedes?.record_id === stage.record_id && override.new_verdict === 'PASS'
      );
      const completedCleanly = workflow.status === 'COMPLETED' &&
        !['EXCEPTION', 'CLAIM_RECOMMENDED', 'NEEDS_REVIEW', 'INCOMPLETE'].includes(
          String(workflow.final_outcome?.outcome || '').toUpperCase()
        ) &&
        !(workflow.stage_results || []).some((item) =>
          item.state === 'error' || item.verdict === 'FAIL' || item.needs_human || item.verdict === 'UNCERTAIN'
        );
      if (explicitlyOverridden || completedCleanly) tally.resolved += 1;
      totals.set(category, tally);
    }
  }
  return ISSUE_CATEGORIES
    .map((category) => ({ ...category, ...(totals.get(category.label) || { total: 0, resolved: 0 }) }))
    .filter((category) => category.total > 0)
    .map((category) => ({
      ...category,
      resolutionRate: Math.round((category.resolved / category.total) * 100),
      open: category.total - category.resolved,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

type LifecycleCounts = Record<LifecycleOutcome, number>;

function LifecycleDonut({
  counts,
  layout = 'horizontal',
}: {
  counts: LifecycleCounts;
  layout?: 'horizontal' | 'vertical';
}) {
  const items = [
    { label: 'Completed', value: counts.completed, color: '#22C55E' },
    { label: 'Exception', value: counts.exception, color: '#EF4444' },
    { label: 'Human Review', value: counts.human_review, color: '#F59E0B' },
    { label: 'In Progress', value: counts.in_progress, color: '#3B82F6' },
    { label: 'Incomplete', value: counts.incomplete, color: '#94A3B8' },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 66;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

return (
  <div
    className={`flex flex-1 items-center justify-center gap-4 ${
      layout === 'horizontal' ? 'flex-row' : 'flex-col'
    }`}
  >
    {/* Donut on the left */}
    <div className="relative h-[190px] w-[190px] shrink-0">
      <svg
        viewBox="0 0 180 180"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Lifecycle outcomes for ${total} units`}
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--bg-raised)"
          strokeWidth={stroke}
        />

        {total > 0 &&
          items.map((item) => {
            const segment = (item.value / total) * circumference;
            const currentOffset = offset;
            offset += segment;

            if (item.value === 0) return null;

            return (
              <circle
                key={item.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={stroke}
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="butt"
              />
            );
          })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-3xl font-bold text-[var(--text-primary)]">
          {total}
        </strong>
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          Total units
        </span>
      </div>
    </div>

    {/* Legend on the right */}
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-xs text-[var(--text-secondary)]">
              {item.label}
            </span>
          </div>

          <strong className="text-xs text-[var(--text-primary)]">
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  </div>
);
}

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

function DonutChart({ pass, fail, uncertain, size = 120 }: { pass: number; fail: number; uncertain: number; size?: number }) {
  const total = pass + fail + uncertain;
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <span style={{ fontSize: 11, color: '#475569' }}>No data</span>
    </div>
  );

  const radius = Math.max(26, size * 0.34);
  const strokeWidth = Math.max(10, size * 0.12);
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

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
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1E2D45" strokeWidth={strokeWidth} />
          {paths.map((p) => (
            <circle
              key={p.label}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={p.color}
              strokeWidth={strokeWidth}
              strokeDasharray={p.dashArray}
              strokeDashoffset={0}
              transform={`rotate(${p.rotation} ${cx} ${cy})`}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading font-black text-white" style={{ fontSize: Math.max(16, size * 0.17) }}>{passRate}%</span>
          <span style={{ fontSize: Math.max(8, size * 0.07), color: '#475569', fontFamily: 'Poppins' }}>PASS RATE</span>
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

export const CommandCenter: React.FC<CommandCenterProps> = ({
  orgId,
  workflows,
  refreshToken,
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
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'UNCERTAIN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashboardError('');
    try {
      const [s, act] = await Promise.all([
        fetchDashboardSummary(orgId, dateRange),
        fetchDashboardActivity(orgId, 30),
      ]);
      setSummary(s);
      setActivity(Array.isArray(act) ? act : []);
    } catch (error) {
      setSummary(null);
      setActivity([]);
      setDashboardError(error instanceof Error ? error.message : 'Dashboard data could not be loaded.');
    } finally {
      setDashLoading(false);
    }
  }, [orgId, dateRange]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshToken]);

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

  const lifecycleCounts = useMemo(() => {
    const counts: Record<LifecycleOutcome, number> = {
      completed: 0,
      exception: 0,
      human_review: 0,
      in_progress: 0,
      incomplete: 0,
    };
    workflows.forEach((workflow) => {
      counts[lifecycleOutcome(workflow)] += 1;
    });
    return counts;
  }, [workflows]);

  const issueBreakdown = useMemo(() => buildIssueBreakdown(workflows), [workflows]);
  const maxIssueCount = Math.max(1, ...issueBreakdown.map((item) => item.total));

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
            {kpis?.total_units ?? stats.total} registered units · range {dateRange === 'all' ? 'all time' : dateRange}
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

      {dashboardError && (
        <p
          role="alert"
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          Dashboard data unavailable: {dashboardError}
        </p>
      )}

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
        <div className="card p-5 flex flex-col" style={{ minHeight: 350 }}>
          <div>
            <p
              className="font-poppins font-semibold text-[var(--text-primary)]"
              style={{ fontSize: 14 }}
            >
              Verdict Distribution
            </p>
            <p
              className="font-poppins text-[var(--text-muted)]"
              style={{ fontSize: 11 }}
            >
              All completed stage executions — {stats.totalCompleted} total
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center pt-3 pb-2">
            <div
              className="w-full flex items-center justify-center"
              style={{ minHeight: 280 }}
            >
              <DonutChart
                pass={summary?.verdict_distribution?.counts?.PASS ?? stats.globalPass}
                fail={summary?.verdict_distribution?.counts?.FAIL ?? stats.globalFail}
                uncertain={summary?.verdict_distribution?.counts?.UNCERTAIN ?? stats.globalUncertain}
                size={220}
              />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="w-full">
            <p className="font-poppins font-semibold text-[var(--text-primary)]" style={{ fontSize: 14 }}>Operational Health by Agent</p>
            <p className="font-poppins text-[var(--text-muted)]" style={{ fontSize: 11 }}>
              Completed outcomes split by verdict
            </p>
          </div>
          <div className="space-y-3 pt-1">
            {AGENTS.map((agent) => {
              const outcomes = stats.stageCounts[agent.id];
              const total = outcomes.total;
              const passPct = total ? (outcomes.pass / total) * 100 : 0;
              const failPct = total ? (outcomes.fail / total) * 100 : 0;
              const uncertainPct = total ? (outcomes.uncertain / total) * 100 : 0;
              return (
                <div key={agent.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-poppins font-medium text-[var(--text-secondary)]">{agent.label}</span>
                    <span className="font-mono text-[var(--text-muted)]">{total} runs</span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full flex"
                    style={{ background: 'var(--bg-raised)' }}
                    aria-label={`${agent.label}: ${outcomes.pass} pass, ${outcomes.fail} fail, ${outcomes.uncertain} uncertain`}
                    role="img"
                  >
                    <span style={{ width: `${passPct}%`, background: '#22C55E' }} />
                    <span style={{ width: `${failPct}%`, background: '#EF4444' }} />
                    <span style={{ width: `${uncertainPct}%`, background: '#F59E0B' }} />
                  </div>
                  <div className="flex gap-3 text-[10px] font-poppins text-[var(--text-muted)]">
                    <span><span className="text-green-500">●</span> {outcomes.pass} pass</span>
                    <span><span className="text-red-500">●</span> {outcomes.fail} fail</span>
                    <span><span className="text-amber-500">●</span> {outcomes.uncertain} review</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        <div className="card p-5 space-y-3">
          <div>
            <p className="font-poppins font-semibold text-[var(--text-primary)]" style={{ fontSize: 14 }}>Stage Funnel</p>
            <p className="font-poppins text-[var(--text-muted)]" style={{ fontSize: 11 }}>
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
                      <span className="font-poppins font-medium text-[var(--text-secondary)]" style={{ fontSize: 12 }}>
                        {stage.num} {stage.label}
                      </span>
                    </div>
                    <span className="font-heading font-bold text-[var(--text-primary)]" style={{ fontSize: 13 }}>
                      {funnelCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
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
              Saved PASS / FAIL / UNCERTAIN evidence in the selected range
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {AGENTS.map((agent) => {
            const apiPerf = summary?.agent_performance?.[agent.id];
            const counts = apiPerf?.completed_in_period
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


<div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">

  {/* Issue Category Breakdown */}
  <section
    className="card flex flex-col gap-4 p-5"
    aria-labelledby="issue-breakdown-heading"
  >
    <div>
      <p
        id="issue-breakdown-heading"
        className="font-poppins font-semibold text-[var(--text-primary)]"
        style={{ fontSize: 14 }}
      >
        Issue Category Breakdown
      </p>
      <p
        className="font-poppins text-[var(--text-muted)]"
        style={{ fontSize: 11 }}
      >
        Current workflow issues by category, with operator-resolved share
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
      <span><span className="mr-1 text-green-500">●</span>Resolved</span>
      <span><span className="mr-1 text-blue-500">●</span>Open</span>
      <span className="ml-auto">Resolution rate</span>
    </div>

    {issueBreakdown.length === 0 ? (
      <div className="flex min-h-28 items-center justify-center text-center text-xs text-[var(--text-muted)]">
        No active issues in the current unit set.
      </div>
    ) : (
      <div className="space-y-4">
        {issueBreakdown.map((issue) => (
          <div
            key={issue.label}
            className="grid grid-cols-[minmax(100px,1fr)_minmax(60px,1.3fr)_76px] items-center gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: issue.color }}
              />
              <span
                className="truncate text-xs text-[var(--text-secondary)]"
                title={issue.label}
              >
                {issue.label}
              </span>
            </div>

            <div
              className="flex h-3 min-w-0 overflow-hidden rounded-full"
              style={{ background: 'var(--bg-raised)' }}
              role="img"
              aria-label={`${issue.label}: ${issue.resolved} resolved, ${issue.open} open`}
            >
              <span
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(issue.resolved / maxIssueCount) * 100}%`,
                }}
              />
              <span
                className="h-full transition-all"
                style={{
                  width: `${(issue.open / maxIssueCount) * 100}%`,
                  background: issue.color,
                }}
              />
            </div>

            <span className="text-right font-mono text-xs text-[var(--text-primary)]">
              {issue.resolutionRate}%
              <span className="text-[var(--text-muted)]">
                {' '}({issue.resolved}/{issue.total})
              </span>
            </span>
          </div>
        ))}
      </div>
    )}

    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
      Resolved means an issue has an explicit PASS operator override; counts
      reflect the latest saved stage state.
    </p>
  </section>

  {/* Unit Lifecycle Outcome Breakdown */}
  <section
    className="card flex flex-col gap-3 p-5"
    aria-labelledby="lifecycle-breakdown-heading"
  >
    <div>
      <p
        id="lifecycle-breakdown-heading"
        className="font-poppins font-semibold text-[var(--text-primary)]"
        style={{ fontSize: 14 }}
      >
        Unit Lifecycle Outcome Breakdown
      </p>
      <p
        className="font-poppins text-[var(--text-muted)]"
        style={{ fontSize: 11 }}
      >
        Each unit is grouped by its current overall lifecycle outcome
      </p>
    </div>

    <LifecycleDonut counts={lifecycleCounts} layout="horizontal" />
  </section>
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
                  const inferredRoute = wf.stage_results.find((s) => s.stage === 'prep')?.state !== 'skipped' ? 'fba' : 'mfn';
                  const route = String(wf.context?.route || inferredRoute).toUpperCase();
                  const currentStage = AGENTS.find((stage) => stage.id === wf.current_stage);
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
                        {currentStage ? `${currentStage.num} · ${currentStage.label}` : '—'}
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
