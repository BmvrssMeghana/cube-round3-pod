import React, { useState } from 'react';
import { WorkflowState, EvidenceRecord, StageName } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ReceivingModal } from '../components/ReceivingModal';
import { PrepModal } from '../components/PrepModal';
import { PackModal } from '../components/PackModal';
import { ReturnsModal } from '../components/ReturnsModal';
import { RecoveryModal } from '../components/RecoveryModal';

interface OperationsPageProps {
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onRunStage: (unitId: string, stage: StageName) => void;
  onRunInspection: (unitId: string, stage: StageName, payload: any) => Promise<void>;
}

export const OperationsPage: React.FC<OperationsPageProps> = ({
  workflows,
  evidence,
  onRunStage,
  onRunInspection,
}) => {
  const [activeStage, setActiveStage] = useState<StageName>('receiving');
  const [selectedUnit, setSelectedUnit] = useState<string>('UNIT-0014');
  const [activeModal, setActiveModal] = useState<StageName | null>(null);

  const stages: { id: StageName; label: string; desc: string }[] = [
    { id: 'receiving', label: '1. Receiving Manager', desc: 'PO comparison, quantity verification, wrong variant, carton & unit damage detection' },
    { id: 'prep', label: '2. Prep Manager', desc: 'Polybag sealing, suffocation warning text, FNSKU placement, barcode coverage, scale weight' },
    { id: 'pack', label: '3. Pack Manager', desc: 'Carton overhead photo 2D item bounding boxes, expected manifest reconciliation, SEAL decision' },
    { id: 'returns', label: '4. Returns Manager', desc: 'Returned item identity, parts completeness, Amazon condition grading, disposition' },
    { id: 'recovery', label: '5. Recovery Manager', desc: 'Carrier/platform fee dispute classifier, SLA window engine, financial claim generation' },
  ];

  const currentWf = workflows.find((w) => w.subject_id === selectedUnit) || workflows[0];
  const stageRes = currentWf?.stage_results.find((s) => s.stage === activeStage);
  const evRef = currentWf?.evidence_references.find((ref) => ref.toLowerCase().includes(activeStage.substring(0, 3)));
  const currentEv = evRef ? evidence[evRef] : null;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Agent Operations Hub</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Execute real AI manager logic, provide inspection inputs, inspect evidence, and test each stage independently.
        </p>
      </div>

      {/* Stage Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        {stages.map((st) => (
          <button
            key={st.id}
            className={`btn ${activeStage === st.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveStage(st.id)}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Active Stage Header & Controls */}
      <div className="glass-panel">
        <div className="panel-title">
          <div>
            <div style={{ textTransform: 'uppercase', fontSize: '18px', fontWeight: 800 }}>{activeStage} Module</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {stages.find((s) => s.id === activeStage)?.desc}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => onRunStage(selectedUnit, activeStage)}>
              ▶ Run Agent
            </button>
            <button className="btn btn-primary" onClick={() => setActiveModal(activeStage)}>
              🔬 Test {activeStage.toUpperCase()} Agent (Interactive Modal)
            </button>
          </div>
        </div>

        {/* Unit Selection & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Target Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              style={{ padding: '6px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)' }}
            >
              {workflows.map((w) => (
                <option key={w.subject_id} value={w.subject_id}>
                  {w.subject_id} ({w.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
            <span>Status: <StatusBadge verdict={stageRes?.verdict || stageRes?.state || 'PENDING'} /></span>
            {stageRes?.finished_at && <span style={{ color: 'var(--text-muted)' }}>Last Run: {stageRes.finished_at} ({stageRes.duration_ms || 320}ms)</span>}
          </div>
        </div>
      </div>

      {/* Stage Execution Evidence Output */}
      {currentEv ? (
        <div className="glass-panel">
          <div className="panel-title">
            <span>Stage Execution Result & Stored Evidence</span>
            <StatusBadge verdict={currentEv.decision.verdict} />
          </div>

          <div style={{ fontSize: '14px', marginBottom: '16px' }}>
            <strong>Decision Reason:</strong> {currentEv.decision.reason}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Checks */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--accent-secondary)' }}>
                Granular AI Checks ({currentEv.checks.length})
              </h4>
              {currentEv.checks.map((c, i) => (
                <div key={i} style={{ padding: '8px', marginBottom: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: `3px solid ${c.verdict === 'PASS' ? 'var(--color-pass)' : 'var(--color-fail)'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>{c.check_key}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Expected: {String(c.expected ?? 'N/A')} | Observed: {String(c.observed ?? 'N/A')}</div>
                  {c.detail && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.detail}</div>}
                </div>
              ))}
            </div>

            {/* Payload */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--accent-secondary)' }}>
                Agent Payload & Model
              </h4>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Model: <code>{JSON.stringify(currentEv.model)}</code></div>
              <pre style={{ fontSize: '11px', background: '#080c14', padding: '12px', borderRadius: '6px', color: '#34d399', overflowX: 'auto' }}>
                {JSON.stringify(currentEv.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔬</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>No Stored Evidence Record for {activeStage.toUpperCase()} on {selectedUnit}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
            Click "Test {activeStage.toUpperCase()} Agent" to open the interactive inspection modal and run the real manager logic.
          </div>
          <button className="btn btn-primary" onClick={() => setActiveModal(activeStage)}>
            🔬 Test {activeStage.toUpperCase()} Agent Now
          </button>
        </div>
      )}

      {/* Interactive Modals */}
      {activeModal === 'receiving' && (
        <ReceivingModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={(uid, payload) => onRunInspection(uid, 'receiving', payload)}
        />
      )}

      {activeModal === 'prep' && (
        <PrepModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={(uid, payload) => onRunInspection(uid, 'prep', payload)}
        />
      )}

      {activeModal === 'pack' && (
        <PackModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={(uid, payload) => onRunInspection(uid, 'pack', payload)}
        />
      )}

      {activeModal === 'returns' && (
        <ReturnsModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={(uid, payload) => onRunInspection(uid, 'returns', payload)}
        />
      )}

      {activeModal === 'recovery' && (
        <RecoveryModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={(uid, payload) => onRunInspection(uid, 'recovery', payload)}
        />
      )}
    </div>
  );
};
