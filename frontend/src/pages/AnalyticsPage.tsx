import React from 'react';
import type { WorkflowState } from '../types';
import { BarChart3, DollarSign, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface AnalyticsPageProps {
  workflows: WorkflowState[];
  demoMode: boolean;
  demoWorkflows: WorkflowState[];
}

function HorizontalBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <span className="font-heading font-bold text-white w-8 text-right" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ workflows, demoMode, demoWorkflows }) => {
  const analysisWorkflows = demoMode ? demoWorkflows : workflows;
  const totalUnits = analysisWorkflows.length;
  const passedUnits = analysisWorkflows.filter((w) => w.status === 'COMPLETED').length;
  const haltedUnits = analysisWorkflows.filter((w) => w.status === 'HALTED' || w.status === 'DEGRADED').length;
  const inProgress = analysisWorkflows.filter((w) => w.status === 'IN_PROGRESS').length;

  const recoveryClaims = analysisWorkflows.filter((w) =>
    w.final_outcome?.status === 'CLAIM_RECOMMENDED' ||
    w.stage_results.some((s) => s.stage === 'recovery' && (s.verdict === 'PASS' || s.verdict === 'FAIL'))
  ).length;
  const claimRecommendations = analysisWorkflows.filter((workflow) =>
    workflow.final_outcome?.status === 'CLAIM_RECOMMENDED'
  );
  const recommendedClaimValue = claimRecommendations.reduce((total, workflow) => {
    const amount = Number(workflow.final_outcome?.claim_amount_usd);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const formattedClaimValue = `$${recommendedClaimValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  // Global verdicts
  let globalPass = 0, globalFail = 0, globalUncertain = 0;
  analysisWorkflows.forEach((wf) => {
    wf.stage_results.forEach((s) => {
      if (s.state === 'completed') {
        if (s.verdict === 'PASS') globalPass++;
        else if (s.verdict === 'FAIL') globalFail++;
        else if (s.verdict === 'UNCERTAIN') globalUncertain++;
      }
    });
  });
  const totalExecutions = globalPass + globalFail + globalUncertain;
  const passRate = totalExecutions > 0 ? ((globalPass / totalExecutions) * 100).toFixed(1) : '0.0';

  // Stage breakdown
  const stages = ['receiving', 'prep', 'pack', 'returns', 'recovery'];
  const stageData = stages.map((stage) => {
    let pass = 0, fail = 0, uncertain = 0;
    analysisWorkflows.forEach((wf) => {
      const s = wf.stage_results.find((r) => r.stage === stage);
      if (s?.state === 'completed') {
        if (s.verdict === 'PASS') pass++;
        else if (s.verdict === 'FAIL') fail++;
        else if (s.verdict === 'UNCERTAIN') uncertain++;
      }
    });
    return { stage, pass, fail, uncertain, total: pass + fail + uncertain };
  });

  const maxStageTotal = Math.max(...stageData.map((s) => s.total), 1);

  const kpis = [
    {
      label: 'Claim Value Identified',
      value: formattedClaimValue,
      sub: `${claimRecommendations.length} recommended · unconfirmed`,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.08)',
      icon: DollarSign,
    },
    {
      label: 'Autonomous Pass Rate',
      value: `${passRate}%`,
      sub: `${globalPass} of ${totalExecutions} executions`,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.08)',
      icon: CheckCircle,
    },
    {
      label: 'Total Workflows',
      value: totalUnits,
      sub: 'Workflow records in view',
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.08)',
      icon: BarChart3,
    },
    {
      label: 'Needs Review',
      value: haltedUnits,
      sub: 'Halted or degraded workflows',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      icon: AlertTriangle,
    },
    {
      label: 'FAIL Executions',
      value: globalFail,
      sub: `${totalExecutions > 0 ? ((globalFail / totalExecutions) * 100).toFixed(1) : 0}% of completed`,
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      icon: AlertTriangle,
    },
    {
      label: 'Recovery Workflows',
      value: recoveryClaims,
      sub: 'Recovery stage evaluated',
      color: '#A855F7',
      bg: 'rgba(168,85,247,0.08)',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6 fade-in font-poppins">

      {/* Header */}
      <div>
        <p className="font-poppins font-semibold text-blue-500 uppercase tracking-widest" style={{ fontSize: 10 }}>
          Financial Claims & Performance Governance
        </p>
        <h1 className="font-heading font-black text-white" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Analytics & Financial Claims
        </h1>
        <p className="font-poppins text-slate-400 mt-0.5" style={{ fontSize: 13 }}>
          Agent accuracy metrics, claim dispute recovery performance, and automated audit SLA tracking.
        </p>
      </div>

      {demoMode && (
        <section
          className="card space-y-3 border-[var(--border-active)] p-5"
          style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--border-active)' }}
          aria-labelledby="demo-analysis-title"
        >
          <div>
            <p className="font-poppins text-xs font-semibold uppercase tracking-wider text-[var(--accent-strong)]">
              Sample data · not live financial results
            </p>
            <h2 id="demo-analysis-title" className="font-heading text-lg font-bold text-[var(--text-primary)]">
              Demo analysis
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {totalExecutions} completed stage checks across {totalUnits} sample workflows produced a {passRate}% pass rate
            ({globalPass} passed, {globalFail} failed, {globalUncertain} uncertain).
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {claimRecommendations.length} recovery claim recommendations total {formattedClaimValue}. This is suggested claim
            value only; it is not confirmed as recovered or approved.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Recovery is the main review point in this sample: {stageData.find((stage) => stage.stage === 'recovery')?.fail ?? 0} failed
            and {stageData.find((stage) => stage.stage === 'recovery')?.uncertain ?? 0} uncertain recovery checks need evidence review.
          </p>
        </section>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: kpi.bg }}>
                  <Icon size={13} style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="font-heading font-black text-white mb-0.5" style={{ fontSize: 22, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div className="font-poppins font-medium text-slate-400" style={{ fontSize: 11, marginBottom: 2 }}>{kpi.label}</div>
              <div className="font-poppins text-slate-600" style={{ fontSize: 10 }}>{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Stage Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="card p-5 space-y-4">
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Stage Execution Volume</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>Total completed executions per stage</p>
          </div>
          <div className="space-y-3">
            {stageData.map((s) => (
              <div key={s.stage} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-poppins font-medium text-slate-300 capitalize" style={{ fontSize: 12 }}>{s.stage}</span>
                  <span className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
                    {s.pass}P · {s.fail}F · {s.uncertain}U
                  </span>
                </div>
                <HorizontalBar value={s.total} max={maxStageTotal} color="#2563EB" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Verdict Distribution by Stage</p>
            <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>PASS / FAIL / UNCERTAIN breakdown</p>
          </div>
          <div className="space-y-3">
            {stageData.map((s) => {
              const total = s.total;
              const passW = total > 0 ? (s.pass / total) * 100 : 0;
              const failW = total > 0 ? (s.fail / total) * 100 : 0;
              const uncW  = total > 0 ? (s.uncertain / total) * 100 : 0;
              return (
                <div key={s.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-poppins font-medium text-slate-300 capitalize" style={{ fontSize: 12 }}>{s.stage}</span>
                    <span className="font-heading font-bold text-white" style={{ fontSize: 13 }}>
                      {total > 0 ? Math.round((s.pass / total) * 100) : 0}% pass
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
                    <div style={{ width: `${passW}%`, background: '#22C55E' }} />
                    <div style={{ width: `${failW}%`, background: '#EF4444' }} />
                    <div style={{ width: `${uncW}%`,  background: '#F59E0B' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 pt-2">
            {[['#22C55E', 'PASS'], ['#EF4444', 'FAIL'], ['#F59E0B', 'UNCERTAIN']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-poppins text-slate-500" style={{ fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Status Summary */}
      <div className="card p-5 space-y-4">
        <div>
          <p className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>Workflow Status Summary</p>
          <p className="font-poppins text-slate-500" style={{ fontSize: 11 }}>All {totalUnits} registered workflows</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Completed', value: passedUnits, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
            { label: 'In Progress', value: inProgress, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
            { label: 'Halted/Review', value: haltedUnits, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Recovery', value: recoveryClaims, color: '#A855F7', bg: 'rgba(168,85,247,0.08)' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
              <div className="font-heading font-black" style={{ fontSize: 28, color: s.color }}>{s.value}</div>
              <div className="font-poppins text-slate-300" style={{ fontSize: 12, marginTop: 2 }}>{s.label}</div>
              <div className="font-poppins text-slate-500" style={{ fontSize: 10, marginTop: 1 }}>
                {totalUnits > 0 ? ((s.value / totalUnits) * 100).toFixed(0) : 0}% of total
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
