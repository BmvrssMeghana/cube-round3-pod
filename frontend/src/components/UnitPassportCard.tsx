import React from 'react';
import { WorkflowState, EvidenceRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import { WorkflowTimeline } from './WorkflowTimeline';

interface UnitPassportCardProps {
  workflow: WorkflowState;
  evidence: Record<string, EvidenceRecord>;
  onOpenOverride?: (recordId: string) => void;
}

export const UnitPassportCard: React.FC<UnitPassportCardProps> = ({ workflow, evidence, onOpenOverride }) => {
  return (
    <div className="glass-panel">
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🪪</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>Unit Passport: {workflow.subject_id}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Workflow ID: {workflow.workflow_id} | Org: {workflow.org_id}
            </div>
          </div>
        </div>
        <StatusBadge verdict={workflow.status} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <WorkflowTimeline stageResults={workflow.stage_results} currentStage={workflow.current_stage} />
      </div>

      {/* Stage Evidence Deep Dive */}
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>
          Continuous Evidence Trail ({workflow.evidence_references.length} Stored Records)
        </h4>

        {workflow.evidence_references.map((ref) => {
          const ev = evidence[ref];
          if (!ev) return null;

          return (
            <div key={ref} style={{ background: 'rgba(19, 27, 46, 0.6)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '13px', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '6px', color: '#fff' }}>
                    {ev.stage}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Record ID: <code>{ev.record_id}</code></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Captured: {ev.captured_at}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge verdict={ev.decision.verdict} />
                  {onOpenOverride && (
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => onOpenOverride(ev.record_id)}>
                      Override
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                <strong>Agent Verdict Reason:</strong> {ev.decision.reason}
              </div>

              {/* Granular Checks */}
              {ev.checks.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    AI Inspection Checks ({ev.checks.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {ev.checks.map((c, idx) => (
                      <div key={idx} style={{ fontSize: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: `3px solid ${c.verdict === 'PASS' ? 'var(--color-pass)' : (c.verdict === 'FAIL' ? 'var(--color-fail)' : 'var(--color-uncertain)')}` }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.check_key}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Observed: {typeof c.observed === 'object' ? JSON.stringify(c.observed) : String(c.observed ?? 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upstream Evidence References */}
              {ev.upstream_refs.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  🔗 Upstream Evidence References: {ev.upstream_refs.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit & Overrides Trail */}
      {workflow.overrides.length > 0 && (
        <div style={{ marginTop: '24px', background: 'var(--color-uncertain-bg)', border: '1px solid var(--color-uncertain-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <h5 style={{ color: 'var(--color-uncertain)', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
            ⚠️ Human Audit & Verdict Overrides ({workflow.overrides.length})
          </h5>
          {workflow.overrides.map((o) => (
            <div key={o.override_id} style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '6px' }}>
              <strong>{o.actor}</strong> overridden record <code>{o.supersedes.record_id}</code> from {o.previous_verdict} → <strong>{o.new_verdict}</strong>: "{o.reason}" ({o.at})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
