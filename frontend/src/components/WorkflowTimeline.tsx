import React from 'react';
import { StageResult } from '../types';
import { StatusBadge } from './StatusBadge';

interface WorkflowTimelineProps {
  stageResults: StageResult[];
  currentStage?: string | null;
  onSelectStage?: (stage: string) => void;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ stageResults, currentStage, onSelectStage }) => {
  const allStages = ['receiving', 'prep', 'pack', 'returns', 'recovery'];

  return (
    <div className="pipeline-stepper">
      {allStages.map((stageName) => {
        const sr = stageResults.find((s) => s.stage === stageName);
        const state = sr ? sr.state : 'pending';
        const verdict = sr ? sr.verdict : null;

        let statusClass = '';
        if (state === 'completed') {
          statusClass = verdict === 'PASS' ? 'completed' : (verdict === 'FAIL' ? 'failed' : 'uncertain');
        } else if (state === 'skipped') {
          statusClass = 'skipped';
        }

        if (currentStage === stageName) {
          statusClass += ' active';
        }

        return (
          <div
            key={stageName}
            className={`stage-node ${statusClass}`}
            onClick={() => onSelectStage && onSelectStage(stageName)}
            style={{ cursor: onSelectStage ? 'pointer' : 'default' }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {state === 'skipped' ? 'SKIPPED' : (state === 'pending' ? 'PENDING' : 'STAGE')}
            </div>
            <div className="stage-name">{stageName}</div>
            <div style={{ marginTop: '8px' }}>
              <StatusBadge verdict={verdict || (state === 'skipped' ? 'SKIPPED' : 'PENDING')} />
            </div>
            {sr?.duration_ms && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {sr.duration_ms}ms
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
