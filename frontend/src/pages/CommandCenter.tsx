import React from 'react';
import { WorkflowState } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface CommandCenterProps {
  workflows: WorkflowState[];
  onSelectUnit: (unitId: string) => void;
  onRunWorkflow: (unitId: string) => void;
  onOpenNewUnitModal: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  workflows,
  onSelectUnit,
  onRunWorkflow,
  onOpenNewUnitModal,
}) => {
  const totalUnits = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'PENDING').length;
  const exceptionsCount = workflows.filter((w) => w.status === 'HALTED' || w.status === 'DEGRADED').length;
  const recoveryClaims = workflows.filter((w) => w.final_outcome?.status === 'CLAIM_RECOMMENDED' || w.stage_results.some((s) => s.stage === 'recovery' && s.verdict === 'FAIL'));
  const amountAtRisk = 60.0;
  const amountRecovered = recoveryClaims.reduce((acc, curr) => acc + (curr.final_outcome?.claim_amount_usd || 15.0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Commerce Operations Command Center</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Unified evidence-driven AI operating layer for the physical commerce lifecycle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => onRunWorkflow('UNIT-0014')}>
            ▶ Run Demo Workflow (UNIT-0014)
          </button>
          <button className="btn btn-primary" onClick={onOpenNewUnitModal}>
            ➕ New Test Workflow
          </button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Units Processed</span>
            <span>📦</span>
          </div>
          <div className="metric-value">{totalUnits}</div>
          <div className="metric-sub">Active in pipeline</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Workflows</span>
            <span>⚡</span>
          </div>
          <div className="metric-value">{activeWorkflows}</div>
          <div className="metric-sub">Auto-advancing</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Exceptions / Reviews</span>
            <span>⚠️</span>
          </div>
          <div className="metric-value" style={{ color: exceptionsCount > 0 ? 'var(--color-fail)' : 'var(--color-pass)' }}>
            {exceptionsCount}
          </div>
          <div className="metric-sub">Require human review</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Amount Billed at Risk</span>
            <span>💵</span>
          </div>
          <div className="metric-value">${amountAtRisk.toFixed(2)}</div>
          <div className="metric-sub">Platform/carrier fees</div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--color-pass-border)', background: 'var(--color-pass-bg)' }}>
          <div className="metric-header">
            <span className="metric-label" style={{ color: 'var(--color-pass)' }}>Financial Recovered</span>
            <span>💰</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--color-pass)' }}>
            ${amountRecovered.toFixed(2)}
          </div>
          <div className="metric-sub">Disputed claim value</div>
        </div>
      </div>

      {/* Lifecycle Pipeline Flow Header */}
      <div className="glass-panel">
        <div className="panel-title">
          <span>Physical Commerce Lifecycle Pipeline</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Orchestrated Stage Execution</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-secondary)' }}>1. RECEIVING</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PO & Quantity Check</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-secondary)' }}>2. PREP</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Polybag & Suffocation</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-secondary)' }}>3. PACK</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>2D Box Verification</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-secondary)' }}>4. RETURNS</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Condition Grading</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-pass)' }}>5. RECOVERY</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Financial Audit Claim</div>
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="glass-panel">
        <div className="panel-title">Active Unit Passports</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Unit ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Workflow ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Current Stage</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Workflow Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Final Outcome</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf) => {
              const isDemo = wf.subject_id.startsWith('UNIT-00');

              return (
                <tr key={wf.subject_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: 'var(--accent-secondary)' }}>{wf.subject_id}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDemo ? 'rgba(255,255,255,0.08)' : 'var(--accent-glow)', color: isDemo ? 'var(--text-muted)' : 'var(--accent-primary)' }}>
                      {isDemo ? 'DEMO DATA' : 'LIVE TEST'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{wf.workflow_id}</td>
                  <td style={{ padding: '12px', textTransform: 'uppercase', fontWeight: 700 }}>{wf.current_stage || 'START'}</td>
                  <td style={{ padding: '12px' }}><StatusBadge verdict={wf.status} /></td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {wf.final_outcome ? (typeof wf.final_outcome === 'string' ? wf.final_outcome : JSON.stringify(wf.final_outcome)) : wf.status_reason}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => onSelectUnit(wf.subject_id)}>
                      View Passport 🪪
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
