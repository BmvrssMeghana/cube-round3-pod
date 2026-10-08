import type { FC } from 'react';
import type { Verdict, OverallDecision } from '../data/rules';
import { CheckCircle, XCircle, AlertCircle, MinusCircle } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: Verdict | OverallDecision | string;
  size?: 'sm' | 'md' | 'lg';
}

const verdictMap: Record<string, { label: string; cls: string; Icon: FC<{ size?: number }> }> = {
  pass: { label: 'PASS', cls: 'badge-pass', Icon: CheckCircle },
  PASS: { label: 'PASS', cls: 'badge-pass', Icon: CheckCircle },
  fail: { label: 'FAIL', cls: 'badge-fail', Icon: XCircle },
  FAIL: { label: 'FAIL', cls: 'badge-fail', Icon: XCircle },
  uncertain: { label: 'UNCERTAIN', cls: 'badge-uncertain', Icon: AlertCircle },
  REVIEW: { label: 'REVIEW', cls: 'badge-uncertain', Icon: AlertCircle },
  not_applicable: { label: 'N/A', cls: 'badge-na', Icon: MinusCircle },
  not_verifiable: { label: 'NOT VERIFIABLE', cls: 'badge-na', Icon: MinusCircle },
  PENDING: { label: 'PENDING', cls: 'badge-pending', Icon: MinusCircle },
};

export default function VerdictBadge({ verdict, size = 'md' }: VerdictBadgeProps) {
  const config = verdictMap[verdict] || { label: verdict, cls: 'badge-na', Icon: MinusCircle };
  const { label, cls, Icon } = config;
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <span className={`badge ${cls}`} style={size === 'lg' ? { fontSize: '13px', padding: '4px 10px' } : size === 'sm' ? { fontSize: '10px' } : {}}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
