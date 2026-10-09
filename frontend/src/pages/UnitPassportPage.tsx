import React, { useState } from 'react';
import type { WorkflowState, EvidenceRecord } from '../types';
import { UnitPassportCard } from '../components/UnitPassportCard';
import { HumanReviewModal } from '../components/HumanReviewModal';

interface UnitPassportPageProps {
  unitId: string;
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
}

export const UnitPassportPage: React.FC<UnitPassportPageProps> = ({
  unitId,
  workflows,
  evidence,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId);
  const [overrideRecordId, setOverrideRecordId] = useState<string | null>(null);

  const currentWorkflow = workflows.find((w) => w.subject_id === (selectedUnitId || unitId)) || workflows[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div>
          <span className="font-poppins text-[10px] text-brand-yellow uppercase tracking-widest font-semibold block mb-1">
            DIGITAL PROVENANCE LEDGER
          </span>
          <h2 className="font-syne font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
            Unit Passport Inspector
          </h2>
          <p className="font-poppins text-xs text-brand-muted mt-1">
            Inspect continuous digital lifecycle identity and cryptographic evidence chain for physical units.
          </p>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center gap-2 font-poppins text-xs">
          <label className="text-brand-muted uppercase font-bold">Select Unit:</label>
          <select
            value={currentWorkflow?.subject_id || ''}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="bg-brand-surface border border-brand-border text-white rounded-full px-4 py-1.5 font-poppins text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
          >
            {workflows.map((w) => (
              <option key={w.subject_id} value={w.subject_id} className="bg-brand-surface">
                {w.subject_id} ({w.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Passport Card */}
      {currentWorkflow ? (
        <UnitPassportCard
          workflow={currentWorkflow}
          evidence={evidence}
          onOpenOverride={(recordId) => setOverrideRecordId(recordId)}
        />
      ) : (
        <div className="p-12 text-center bg-brand-card border border-brand-border rounded-2xl text-brand-muted font-poppins text-sm">
          No workflow records found. Create a unit workflow first.
        </div>
      )}

      {overrideRecordId && currentWorkflow && (
        <HumanReviewModal
          unitId={currentWorkflow.subject_id}
          recordId={overrideRecordId}
          onClose={() => setOverrideRecordId(null)}
          onSubmitOverride={() => setOverrideRecordId(null)}
        />
      )}
    </div>
  );
};
