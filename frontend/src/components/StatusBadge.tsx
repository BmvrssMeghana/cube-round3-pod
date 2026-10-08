import React from 'react';
import { VerdictType } from '../types';

interface StatusBadgeProps {
  verdict: VerdictType | string | null | undefined;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ verdict }) => {
  if (!verdict) return <span className="badge">N/A</span>;

  const v = verdict.toUpperCase();

  if (v === 'PASS' || v === 'SEAL' || v === 'COMPLIANT' || v === 'ACCEPT' || v === 'SUPPORTED') {
    return <span className="badge badge-pass">✓ {verdict}</span>;
  }

  if (v === 'FAIL' || v === 'STOP_AND_FIX' || v === 'NON_COMPLIANT' || v === 'CONTRADICTED') {
    return <span className="badge badge-fail">✕ {verdict}</span>;
  }

  if (v === 'UNCERTAIN' || v === 'MANUAL_REVIEW' || v === 'PENDING_REVIEW' || v === 'SILENT') {
    return <span className="badge badge-uncertain">⚠ {verdict}</span>;
  }

  if (v === 'CLAIM_RECOMMENDED' || v === 'CLAIM') {
    return <span className="badge badge-claim">₹ {verdict}</span>;
  }

  return <span className="badge">{verdict}</span>;
};
