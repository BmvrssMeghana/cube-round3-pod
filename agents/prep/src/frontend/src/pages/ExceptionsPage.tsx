import React, { useState } from 'react';
import { WorkflowState, EvidenceRecord, VerdictType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { HumanReviewModal } from '../components/HumanReviewModal';

interface ExceptionsPageProps {
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onSelectUnit: (unitId: string) => void;
  onSubmitOverride: (recordId: string, newVerdict: VerdictType, actor: string, reason: string) => void;
}

export const ExceptionsPage: React.FC<ExceptionsPageProps> = ({
  workflows,
  evidence,
  onSelectUnit,
  onSubmitOverride,
}) => {
  const [activeReviewRecord, setActiveReviewRecord] = useState<{ unitId: string; recordId: string } | null>(null);

  // Filter workflows that have halted, errored, degraded, or UNCERTAIN/FAIL verdicts
  const exceptionWorkflows = workflows.filter((w) =>
    w.status === 'HALTED' ||
    w.status === 'DEGRADED' ||
    w.stage_results.some((s) => s.verdict === 'UNCERTAIN' || s.verdict === 'FAIL' || s.needs_human)
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Exceptions & Human Review Queue</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Human-in-the-loop review for UNCERTAIN verdicts, low confidence AI outputs, and cross-stage conflicts.
        </p>
      </div>

      <div className="glass-panel">
        <div className="panel-title">
          <span>Active Exception Queue ({exceptionWorkflows.length})</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overriding creates immutable audit records</span>
        </div>

        {exceptionWorkflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontWeight: 700 }}>Zero Pending Exceptions! All operational workflows clear.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {exceptionWorkflows.map((w) => {
              const haltedStage = w.halted?.stage || w.current_stage || 'prep';
              const refId = w.evidence_references.find((r) => r.toLowerCase().includes(haltedStage.substring(0, 3))) || w.evidence_references[0];
              const ev = refId ? evidence[refId] : null;

              return (
                <div key={w.subject_id} style={{ background: 'rgba(19, 27, 46, 0.6)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-secondary)' }}>Unit: {w.subject_id}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>Workflow: {w.workflow_id}</span>
                    </div>
                    <StatusBadge verdict={w.status} />
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                    <strong>Halted Reason / Issue:</strong> {w.halted?.reason || w.status_reason || 'Low confidence AI verdict requires human signoff.'}
                  </div>

                  {ev && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Stage: {ev.stage.toUpperCase()} (Record: {ev.record_id})</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ev.decision.reason}</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => onSelectUnit(w.subject_id)}>
                      Inspect Unit Passport 🪪
                    </button>
                    {refId && (
                      <button className="btn btn-primary" onClick={() => setActiveReviewRecord({ unitId: w.subject_id, recordId: refId })}>
                        ✍️ Resolve / Override Verdict
                      </button>
                    )}
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
          onSubmitOverride={onSubmitOverride}
        />
      )}
    </div>
  );
};
