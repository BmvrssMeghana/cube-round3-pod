import React, { useState } from 'react';
import type { WorkflowState } from '../types';
import { HumanReviewModal } from '../components/HumanReviewModal';
import { AlertTriangle, Clock, CheckCircle, Eye, ChevronRight, Filter } from 'lucide-react';

interface ExceptionsPageProps {
  workflows: WorkflowState[];
  onApplyOverride: (unitId: string, recordId: string, verdict: string, actor: string, reason: string) => Promise<void>;
}

export const ExceptionsPage: React.FC<ExceptionsPageProps> = ({ workflows, onApplyOverride }) => {
  const [activeReviewRecord, setActiveReviewRecord] = useState<{ unitId: string; recordId: string } | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  const exceptionWorkflows = workflows.filter((w) =>
    w.status === 'HALTED' ||
    w.status === 'DEGRADED' ||
    w.stage_results.some((s) => s.verdict === 'UNCERTAIN' || s.verdict === 'FAIL' || s.needs_human)
  );

  const filtered = stageFilter === 'ALL'
    ? exceptionWorkflows
    : exceptionWorkflows.filter((w) =>
        w.stage_results.some((s) => s.stage === stageFilter && (s.verdict === 'UNCERTAIN' || s.verdict === 'FAIL' || s.needs_human))
      );

  const stages = ['ALL', 'receiving', 'prep', 'pack', 'returns', 'recovery'];

  return (
    <div className="space-y-6 fade-in">

      {/* Header */}
      <div>
        <p className="font-poppins font-semibold text-blue-500 uppercase tracking-widest" style={{ fontSize: 10 }}>
          Supervisor Review System
        </p>
        <h1 className="font-heading font-black text-white" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Exceptions & Review Queue
        </h1>
        <p className="font-poppins text-slate-400 mt-0.5" style={{ fontSize: 13 }}>
          Human-in-the-loop review for UNCERTAIN verdicts, low-confidence AI outputs, and cross-stage conflicts.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Reviews', value: exceptionWorkflows.length, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: Clock },
          { label: 'Halted Workflows', value: workflows.filter((w) => w.status === 'HALTED').length, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: AlertTriangle },
          { label: 'Degraded', value: workflows.filter((w) => w.status === 'DEGRADED').length, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: AlertTriangle },
          { label: 'UNCERTAIN Verdicts', value: workflows.reduce((acc, w) => acc + w.stage_results.filter((s) => s.verdict === 'UNCERTAIN').length, 0), color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: Filter },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="kpi-card">
              <div className="flex items-start justify-between mb-2">
                <span className="font-poppins text-slate-400" style={{ fontSize: 12 }}>{s.label}</span>
                <div className="p-1.5 rounded-lg" style={{ background: s.bg }}>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
              </div>
              <div className="font-heading font-black text-white" style={{ fontSize: 28 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Stage filter tabs */}
      <div
        className="flex max-w-full flex-wrap rounded-lg overflow-hidden"
        style={{ border: '1px solid #1E2D45', background: '#0D1117', display: 'inline-flex' }}
      >
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className="px-3 py-1.5 font-poppins font-medium capitalize transition-all"
            style={{
              fontSize: 12,
              background: stageFilter === s ? '#1A2235' : 'transparent',
              color: stageFilter === s ? '#60A5FA' : '#475569',
              borderRight: s !== 'recovery' ? '1px solid #1E2D45' : 'none',
            }}
          >
            {s === 'ALL' ? 'All Stages' : s}
          </button>
        ))}
      </div>

      {/* Exception cards */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2D45' }}>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: filtered.length > 0 ? '#EF4444' : '#22C55E' }}
            />
            <span className="font-poppins font-semibold text-white" style={{ fontSize: 14 }}>
              Active Exception Queue ({filtered.length})
            </span>
          </div>
          <span className="font-poppins text-slate-500" style={{ fontSize: 11 }}>
            Overrides create immutable cryptographic audit records
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div className="font-heading font-bold text-green-400" style={{ fontSize: 16 }}>
              Zero Pending Exceptions
            </div>
            <div className="font-poppins text-slate-500" style={{ fontSize: 13 }}>
              All operational workflows are clear and verified.
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1E2D45' }}>
            {filtered.map((w) => {
              const haltedStage = w.halted?.stage || w.current_stage || 'prep';
              const refId = w.evidence_references.find((r) => r.toLowerCase().includes(haltedStage.substring(0, 3))) || w.evidence_references[0] || 'REC-DEMO';
              const uncertainStages = w.stage_results.filter((s) => s.verdict === 'UNCERTAIN' || s.needs_human);
              const failStages = w.stage_results.filter((s) => s.verdict === 'FAIL');

              return (
                <div key={w.subject_id} className="px-5 py-4 hover:bg-cb-raised transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-blue-300" style={{ fontSize: 15 }}>
                          {w.subject_id}
                        </span>
                        <span
                          className={`badge ${w.status === 'HALTED' ? 'badge-fail' : 'badge-uncertain'}`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <p className="font-poppins text-slate-400" style={{ fontSize: 12 }}>
                        <strong className="text-amber-400">⚠ Exception:</strong>{' '}
                        {w.halted?.reason || w.status_reason || 'Low confidence AI verdict requires human signoff.'}
                      </p>

                      {/* Flagged stages */}
                      <div className="flex flex-wrap gap-2">
                        {failStages.map((s) => (
                          <span key={s.stage} className="badge badge-fail capitalize">{s.stage}: FAIL</span>
                        ))}
                        {uncertainStages.map((s) => (
                          <span key={s.stage} className="badge badge-uncertain capitalize">{s.stage}: UNCERTAIN</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="btn btn-ghost px-3 py-1.5"
                        style={{ fontSize: 12 }}
                        onClick={() => setActiveReviewRecord({ unitId: w.subject_id, recordId: refId })}
                      >
                        <Eye size={13} />
                        Review
                      </button>
                      <button
                        className="btn btn-primary px-3 py-1.5"
                        style={{ fontSize: 12 }}
                        onClick={() => setActiveReviewRecord({ unitId: w.subject_id, recordId: refId })}
                      >
                        Override
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeReviewRecord && (
        <HumanReviewModal
          unitId={activeReviewRecord.unitId}
          recordId={activeReviewRecord.recordId}
          onClose={() => setActiveReviewRecord(null)}
          onSubmitOverride={async (recordId, verdict, actor, reason) => {
            await onApplyOverride(activeReviewRecord.unitId, recordId, verdict, actor, reason);
            setActiveReviewRecord(null);
          }}
        />
      )}
    </div>
  );
};
