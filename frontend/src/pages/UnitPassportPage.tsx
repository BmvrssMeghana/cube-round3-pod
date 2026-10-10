import React, { useState } from 'react';
import { UnitSearchSelector } from '../components/UnitSearchSelector';
import type { WorkflowState, EvidenceRecord } from '../types';
import { UnitPassportCard } from '../components/UnitPassportCard';
import { HumanReviewModal } from '../components/HumanReviewModal';

interface UnitPassportPageProps {
  unitId: string;
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onApplyOverride: (unitId: string, recordId: string, verdict: string, actor: string, reason: string) => Promise<void>;
}

export const UnitPassportPage: React.FC<UnitPassportPageProps> = ({
  unitId,
  workflows,
  evidence,
  onApplyOverride,
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
          <label className="text-slate-400 font-semibold uppercase">Search Unit:</label>
          <UnitSearchSelector
            workflows={workflows}
            selectedUnitId={selectedUnitId || currentWorkflow?.subject_id || ''}
            onSelectUnit={(uid) => setSelectedUnitId(uid)}
            width={240}
          />
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
          mode="override"
          workflow={currentWorkflow}
          evidence={evidence}
          onClose={() => setOverrideRecordId(null)}
          onSubmitOverride={async (recordId, verdict, actor, reason) => {
            await onApplyOverride(currentWorkflow.subject_id, recordId, verdict, actor, reason);
            setOverrideRecordId(null);
          }}
        />
      )}
    </div>
  );
};
