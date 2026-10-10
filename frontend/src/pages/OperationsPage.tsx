import React, { useState } from 'react';
import { Package, CheckCircle, Box, RotateCcw, DollarSign, Info } from 'lucide-react';
import type { WorkflowState, EvidenceRecord, StageName } from '../types';
import { ReceivingModal } from '../components/ReceivingModal';
import { PrepModal } from '../components/PrepModal';
import { PackModal } from '../components/PackModal';
import { ReturnsModal } from '../components/ReturnsModal';
import { RecoveryModal } from '../components/RecoveryModal';
import { AgentDashboard } from '../components/AgentDashboard';
import { STAGE_SPECS } from '../data/agentSpecs';
import { UnitSearchSelector } from '../components/UnitSearchSelector';

interface OperationsPageProps {
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  refreshToken: number;
  initialStage: StageName;
  initialUnitId: string;
  orgId: string;
  agentHealth?: Record<string, { status: string }>;
  onSelectStage: (stage: StageName) => void;
  onSelectUnit: (unitId: string) => void;
  onOpenPassport: (unitId: string) => void;
  onRunInspection: (unitId: string, stage: StageName, payload: any) => Promise<any>;
}

const STAGE_META = [
  { id: 'receiving' as StageName, num: '01', label: 'Receiving', icon: Package, color: '#22C55E' },
  { id: 'prep' as StageName, num: '02', label: 'Prep', icon: CheckCircle, color: '#3B82F6' },
  { id: 'pack' as StageName, num: '03', label: 'Pack', icon: Box, color: '#60A5FA' },
  { id: 'returns' as StageName, num: '04', label: 'Returns', icon: RotateCcw, color: '#F59E0B' },
  { id: 'recovery' as StageName, num: '05', label: 'Recovery', icon: DollarSign, color: '#A855F7' },
];

export const OperationsPage: React.FC<OperationsPageProps> = ({
  workflows,
  initialStage,
  initialUnitId,
  orgId,
  refreshToken,
  agentHealth,
  onSelectStage,
  onSelectUnit,
  onOpenPassport,
  onRunInspection,
}) => {
  const [activeModal, setActiveModal] = useState<StageName | null>(null);

  const activeStage = initialStage;
  const selectedUnit = workflows.some((w) => w.subject_id === initialUnitId)
    ? initialUnitId
    : workflows[0]?.subject_id || '';

  const currentWf = workflows.find((w) => w.subject_id === selectedUnit) || workflows[0];
  const stageRes = currentWf?.stage_results.find((s) => s.stage === activeStage);
  const stageSkipped = stageRes?.state === 'skipped';
  const spec = STAGE_SPECS[activeStage];
  const route = String(currentWf?.context?.route || '').toLowerCase();
  const routePrerequisite = route === 'fba' ? 'prep' : route === 'mfn' ? 'pack' : null;

  const requiredStages: StageName[] = activeStage === 'prep' || activeStage === 'pack'
    ? activeStage === 'pack' && route === 'fba' ? ['receiving', 'prep'] : ['receiving']
    : activeStage === 'returns'
      ? ['receiving', ...(route === 'fba' ? ['prep' as StageName] : []), 'pack']
      : [];

  const missingPrerequisites = requiredStages.filter((required) => {
    const result = currentWf?.stage_results.find((item) => item.stage === required);
    return result?.state !== 'completed' || result.evidence_status !== 'completed';
  });

  const unitSelector = (
    <UnitSearchSelector
      workflows={workflows}
      selectedUnitId={selectedUnit}
      onSelectUnit={onSelectUnit}
      width={220}
    />
  );

  return (
    <div className="space-y-5 fade-in">
      <div className="card p-1.5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
          {STAGE_META.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-poppins font-semibold transition-all"
                style={{
                  fontSize: 12,
                  background: isActive ? 'var(--bg-raised)' : 'transparent',
                  color: isActive ? stage.color : 'var(--text-muted)',
                  border: isActive ? `1px solid ${stage.color}40` : '1px solid transparent',
                }}
              >
                <Icon size={13} />
                <span>{stage.num} · {stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(stageSkipped || missingPrerequisites.length > 0) && (
        <div className="space-y-2">
          {stageSkipped && (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="font-poppins text-blue-700 dark:text-blue-300" style={{ fontSize: 12 }}>
                {activeStage} is not enabled for this unit&apos;s route
                {stageRes?.skipped_reason ? ` (${stageRes.skipped_reason})` : ''}.
              </p>
            </div>
          )}
          {missingPrerequisites.length > 0 && (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="font-poppins text-amber-800 dark:text-amber-300" style={{ fontSize: 12 }}>
                Complete upstream evidence first: <strong>{missingPrerequisites.join(', ')}</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      <AgentDashboard
        stage={activeStage}
        orgId={orgId}
        agentHealth={agentHealth?.[activeStage]}
        onOpenUnit={onOpenPassport}
        onRunInspection={() => setActiveModal(activeStage)}
        refreshKey={refreshToken}
        runDisabled={stageSkipped || missingPrerequisites.length > 0}
        runDisabledReason={stageSkipped ? stageRes?.skipped_reason || 'This stage is not applicable to this unit.' : `Complete upstream stages first: ${missingPrerequisites.join(', ')}.`}
        headerExtra={unitSelector}
      />

      <div className="card p-4">
        <p className="font-poppins text-[var(--text-muted)] text-xs mb-2">{spec.workflow}</p>
        <p className="font-poppins text-[var(--text-muted)] text-xs">{spec.acceptance}</p>
      </div>

      {activeModal === 'receiving' && (
        <ReceivingModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={async (unitId, payload) => {
            const result = await onRunInspection(unitId, 'receiving', payload);
            if (result.evidence?.decision?.verdict === 'PASS') {
              const nextStage: StageName = route === 'mfn' ? 'pack' : 'prep';
              onSelectStage(nextStage);
              setActiveModal(nextStage);
            }
            return result;
          }}
        />
      )}
      {activeModal === 'prep' && (
        <PrepModal
          unitId={selectedUnit}
          onClose={() => setActiveModal(null)}
          onRunInspection={async (unitId, payload) => {
            const result = await onRunInspection(unitId, 'prep', payload);
            if (result.evidence?.decision?.verdict === 'PASS') {
              onSelectStage('pack');
              setActiveModal('pack');
            }
            return result;
          }}
        />
      )}
      {activeModal === 'pack' && (
        <PackModal unitId={selectedUnit} onClose={() => setActiveModal(null)} onRunInspection={(unitId, payload) => onRunInspection(unitId, 'pack', payload)} />
      )}
      {activeModal === 'returns' && (
        <ReturnsModal unitId={selectedUnit} onClose={() => setActiveModal(null)} onRunInspection={(unitId, payload) => onRunInspection(unitId, 'returns', payload)} />
      )}
      {activeModal === 'recovery' && (
        <RecoveryModal unitId={selectedUnit} onClose={() => setActiveModal(null)} onRunInspection={(unitId, payload) => onRunInspection(unitId, 'recovery', payload)} />
      )}
    </div>
  );
};
