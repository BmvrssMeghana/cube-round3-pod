import React from 'react';

interface StatusBadgeProps {
  verdict: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ verdict }) => {
  const v = (verdict || '').toUpperCase();

  const config: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    PASS:        { bg: 'rgba(34,197,94,0.1)',   color: '#4ADE80', border: 'rgba(34,197,94,0.25)',    dot: '#22C55E' },
    FAIL:        { bg: 'rgba(239,68,68,0.1)',   color: '#F87171', border: 'rgba(239,68,68,0.25)',    dot: '#EF4444' },
    UNCERTAIN:   { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D', border: 'rgba(245,158,11,0.25)',   dot: '#F59E0B' },
    HALTED:      { bg: 'rgba(239,68,68,0.1)',   color: '#F87171', border: 'rgba(239,68,68,0.25)',    dot: '#EF4444' },
    DEGRADED:    { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D', border: 'rgba(245,158,11,0.25)',   dot: '#F59E0B' },
    COMPLETED:   { bg: 'rgba(34,197,94,0.1)',   color: '#4ADE80', border: 'rgba(34,197,94,0.25)',    dot: '#22C55E' },
    IN_PROGRESS: { bg: 'rgba(59,130,246,0.1)',  color: '#93C5FD', border: 'rgba(59,130,246,0.25)',   dot: '#3B82F6' },
    PENDING:     { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8', border: 'rgba(100,116,139,0.25)', dot: '#64748B' },
    SKIPPED:     { bg: 'rgba(30,45,69,0.5)',    color: '#475569', border: 'rgba(30,45,69,0.8)',      dot: '#334155' },
    COMPLETED_WITH_ISSUES: { bg: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: 'rgba(245,158,11,0.25)', dot: '#F59E0B' },
  };

  const style = config[v] || config['PENDING'];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-poppins font-semibold"
      style={{
        fontSize: 11,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: 20,
        padding: '2px 8px',
      }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      {v}
    </span>
  );
};
