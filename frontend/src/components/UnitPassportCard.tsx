import React from 'react';
import type { WorkflowState, EvidenceRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import { WorkflowTimeline } from './WorkflowTimeline';

interface UnitPassportCardProps {
  workflow: WorkflowState;
  evidence: Record<string, EvidenceRecord>;
  onOpenOverride?: (recordId: string) => void;
}

export const UnitPassportCard: React.FC<UnitPassportCardProps> = ({ workflow, evidence, onOpenOverride }) => {
  return (
    <div className="p-6 rounded-2xl bg-brand-card border border-brand-border space-y-6">
      {/* Passport Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-yellow/15 text-brand-yellow flex items-center justify-center font-mono text-xl font-bold">
            🪪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-syne font-extrabold text-xl text-white uppercase tracking-tight">
                Unit Passport: {workflow.subject_id}
              </span>
              <span className="px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 font-mono text-[10px] text-brand-yellow font-bold uppercase">
                {workflow.org_id}
              </span>
            </div>
            <div className="font-poppins text-xs text-brand-muted mt-1">
              Workflow ID: <code className="text-slate-300">{workflow.workflow_id}</code>
            </div>
          </div>
        </div>
        <StatusBadge verdict={workflow.status} />
      </div>

      {/* Workflow Stepper Timeline */}
      <WorkflowTimeline stageResults={workflow.stage_results} currentStage={workflow.current_stage} />

      {/* Continuous Evidence Trail */}
      <div className="space-y-4 pt-2">
        <h4 className="font-syne font-extrabold text-sm text-[var(--accent-strong)] uppercase tracking-wider">
          Continuous Evidence Trail ({workflow.evidence_references.length} Stored Records)
        </h4>

        {workflow.evidence_references.map((ref) => {
          const ev = evidence[ref];
          if (!ev) return null;
          const checks = ev.checks || [];
          const upstreamRefs = ev.upstream_refs || [];

          return (
            <div key={ref} className="p-5 rounded-xl bg-brand-surface border border-brand-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-poppins text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-brand-yellow text-black font-bold uppercase text-[10px]">
                    {ev.stage}
                  </span>
                  <span className="text-brand-muted">Record: <code className="text-slate-200">{ev.record_id}</code></span>
                  <span className="text-neutral-500">Captured: {ev.captured_at || ev.produced_at || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge verdict={ev.decision.verdict} />
                  {onOpenOverride && (
                    <button
                      className="pill-btn px-3 py-1 rounded-full bg-brand-cardHigh border border-brand-border text-xs text-white hover:border-brand-yellow font-poppins"
                      onClick={() => onOpenOverride(ev.record_id)}
                    >
                      Override
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed">
                <strong className="text-brand-muted uppercase font-poppins text-[11px] mr-2">Verdict Reason:</strong>
                {ev.decision.reason}
              </div>

              {/* Granular Checks */}
              {checks.length > 0 && (
                <div className="p-3 rounded-lg bg-black/40 border border-brand-border/60 space-y-2">
                  <div className="font-poppins text-[10px] uppercase font-bold text-brand-muted tracking-wider">
                    AI Inspection Checks ({checks.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {checks.map((c, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded border-l-4 bg-brand-card/60 text-xs font-poppins ${
                          c.verdict === 'PASS' ? 'border-brand-secondary' : (c.verdict === 'FAIL' ? 'border-brand-crimson' : 'border-brand-orange')
                        }`}
                      >
                        <div className="font-bold text-white mb-0.5">{c.check_key}</div>
                        <div className="text-[11px] text-brand-muted truncate">
                          Observed: {typeof c.observed === 'object' ? JSON.stringify(c.observed) : String(c.observed ?? 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upstream Evidence References */}
              {upstreamRefs.length > 0 && (
                <div className="font-poppins text-[10px] text-brand-muted pt-1">
                  🔗 Upstream Evidence References: {upstreamRefs.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit & Overrides Trail */}
      {workflow.overrides.length > 0 && (
        <div className="p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30 space-y-2">
          <h5 className="font-poppins text-xs font-bold text-brand-orange uppercase">
            ⚠️ Human Audit &amp; Verdict Overrides ({workflow.overrides.length})
          </h5>
          {workflow.overrides.map((o) => (
            <div key={o.override_id} className="font-poppins text-xs text-slate-200">
              <strong className="text-white">{o.actor}</strong> overridden record <code className="text-brand-yellow">{o.supersedes.record_id}</code> from {o.previous_verdict} → <strong className="text-brand-secondary">{o.new_verdict}</strong>: "{o.reason}" ({o.at})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
