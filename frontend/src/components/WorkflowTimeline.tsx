import React from 'react';
import type { StageResult } from '../types';
import { StatusBadge } from './StatusBadge';

interface WorkflowTimelineProps {
  stageResults: StageResult[];
  currentStage?: string | null;
  onSelectStage?: (stage: string) => void;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ stageResults, currentStage, onSelectStage }) => {
  const allStages = ['receiving', 'prep', 'pack', 'returns', 'recovery'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-brand-surface border border-brand-border">
      {allStages.map((stageName, idx) => {
        const sr = stageResults.find((s) => s.stage === stageName);
        const state = sr ? sr.state : 'pending';
        const verdict = sr ? sr.verdict : null;
        const isActive = currentStage === stageName;

        let borderColor = 'border-brand-border';
        let bgStyle = 'bg-brand-card';

        if (state === 'completed') {
          borderColor = verdict === 'PASS' ? 'border-brand-secondary/40' : (verdict === 'FAIL' ? 'border-brand-crimson/40' : 'border-brand-orange/40');
        } else if (state === 'skipped') {
          borderColor = 'border-brand-border/40';
          bgStyle = 'bg-brand-card/40 opacity-60';
        }

        if (isActive) {
          borderColor = 'border-brand-yellow';
          bgStyle = 'bg-brand-cardHigh shadow-[0_0_15px_rgba(255,229,0,0.15)]';
        }

        return (
          <div
            key={stageName}
            className={`p-3.5 rounded-xl border ${borderColor} ${bgStyle} transition-all flex flex-col justify-between ${onSelectStage ? 'cursor-pointer hover:border-brand-yellow' : ''}`}
            onClick={() => onSelectStage && onSelectStage(stageName)}
          >
            <div>
              <div className="flex items-center justify-between mb-2 font-mono text-[10px] text-brand-muted font-bold uppercase">
                <span>0{idx + 1}</span>
                <span className={state === 'skipped' ? 'text-neutral-500' : (state === 'completed' ? 'text-brand-secondary' : 'text-brand-yellow')}>
                  {state === 'skipped' ? 'SKIPPED' : (state === 'pending' ? 'PENDING' : 'STAGE')}
                </span>
              </div>
              <div className="font-syne font-bold text-sm text-white uppercase tracking-tight">
                {stageName}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-brand-border/40 flex items-center justify-between">
              <StatusBadge verdict={verdict || (state === 'skipped' ? 'SKIPPED' : 'PENDING')} />
              {sr?.duration_ms && (
                <span className="font-mono text-[10px] text-brand-muted">{sr.duration_ms}ms</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
