import React, { useState } from 'react';
import { WorkflowState, EvidenceRecord } from '../types';
import { UnitPassportCard } from '../components/UnitPassportCard';
import { HumanReviewModal } from '../components/HumanReviewModal';

interface UnitPassportPageProps {
  selectedUnitId: string;
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onSelectUnit: (unitId: string) => void;
  onSubmitOverride: (recordId: string, newVerdict: any, actor: string, reason: string) => void;
}

export const UnitPassportPage: React.FC<UnitPassportPageProps> = ({
  selectedUnitId,
  workflows,
  evidence,
  onSelectUnit,
  onSubmitOverride,
}) => {
  const [overrideRecordId, setOverrideRecordId] = useState<string | null>(null);
  const currentWorkflow = workflows.find((w) => w.subject_id === selectedUnitId) || workflows[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Unit Passport Inspector</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Inspect continuous digital lifecycle identity and evidence chain for physical units.
          </p>
        </div>

        {/* Unit Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Unit:</label>
          <select
            value={currentWorkflow.subject_id}
            onChange={(e) => onSelectUnit(e.target.value)}
            style={{ padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
          >
            {workflows.map((w) => (
              <option key={w.subject_id} value={w.subject_id}>
                {w.subject_id} ({w.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <UnitPassportCard
        workflow={currentWorkflow}
        evidence={evidence}
        onOpenOverride={(recordId) => setOverrideRecordId(recordId)}
      />

      {overrideRecordId && (
        <HumanReviewModal
          unitId={currentWorkflow.subject_id}
          recordId={overrideRecordId}
          onClose={() => setOverrideRecordId(null)}
          onSubmitOverride={onSubmitOverride}
        />
      )}
    </div>
  );
};
