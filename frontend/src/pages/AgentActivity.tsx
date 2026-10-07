import { useState } from 'react';
import { store } from '../data/store';
import { format } from 'date-fns';

interface AgentActivityProps {
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function AgentActivity({ org }: AgentActivityProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const inspections = store.getAll(org);
  const selected = selectedId ? store.get(selectedId) : inspections[0];

  const agentColors: Record<string, string> = {
    'Orchestrator': 'var(--accent)',
    'Evidence Quality Agent': 'var(--blue)',
    'Rule & Policy Agent': 'var(--purple)',
    'Visual Compliance Agent': 'var(--green)',
    'Evidence Verifier': 'var(--amber)',
    'Integrity Layer': 'var(--text3)',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Agent Activity</h2>
        <p>Operational events for each inspection's agentic pipeline.</p>
      </div>

      <div className="section-grid">
        {/* Inspection selector */}
        <div className="card">
          <div className="card-header"><span className="card-title">Select Inspection</span></div>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {inspections.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}><p>No inspections.</p></div>
            ) : (
              inspections.map(insp => (
                <div
                  key={insp.id}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: (selected?.id === insp.id) ? 'var(--accent-light)' : 'transparent',
                    borderLeft: (selected?.id === insp.id) ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onClick={() => setSelectedId(insp.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{insp.record_id}</span>
                    <span className={`badge ${insp.overall_status === 'PASS' ? 'badge-pass' : insp.overall_status === 'FAIL' ? 'badge-fail' : 'badge-uncertain'}`} style={{ fontSize: '10px' }}>
                      {insp.overall_status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                    {insp.unit_id} · {format(new Date(insp.created_at), 'MMM d, HH:mm')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {selected ? `Inspection ${selected.record_id}` : 'Agent Activity'}
            </span>
            {selected && (
              <div className="cost-info" style={{ padding: '3px 8px' }}>
                <span>{(selected.latency_ms / 1000).toFixed(2)}s</span>
                <span>${selected.cost_estimate.toFixed(4)}</span>
              </div>
            )}
          </div>
          <div className="card-body">
            {!selected || selected.agent_events.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}><p>No activity recorded.</p></div>
            ) : (
              selected.agent_events.map((ev) => (
                <div key={ev.id} className="activity-item">
                  <div className="activity-time">{format(new Date(ev.timestamp), 'HH:mm:ss')}</div>
                  <div className="activity-agent" style={{ color: agentColors[ev.agent] || 'var(--text2)' }}>
                    {ev.agent}
                  </div>
                  <div className="activity-event">{ev.event}</div>
                  <div className="activity-latency">{ev.latency_ms}ms</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><span className="card-title">Agent Architecture</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { agent: 'Orchestrator', desc: 'Receives inspection request, validates inputs, coordinates all agents, aggregates results, produces final record.', color: 'var(--accent)' },
              { agent: 'Evidence Quality Agent', desc: 'Validates all images before expensive model calls. Rejects blurry, dark, or insufficient images. Provides rescan guidance.', color: 'var(--blue)' },
              { agent: 'Rule & Policy Agent', desc: 'Loads applicable rules from the registry based on product category. Identifies visually verifiable vs. non-verifiable requirements.', color: 'var(--purple)' },
              { agent: 'Visual Compliance Agent', desc: 'Single multimodal model call per inspection. Evaluates all checks simultaneously. Returns structured observations with evidence regions.', color: 'var(--green)' },
              { agent: 'Evidence Verifier', desc: 'Cross-checks vision observations against rule requirements. Identifies contradictions. Escalates to UNCERTAIN where evidence is insufficient.', color: 'var(--amber)' },
              { agent: 'Integrity Layer', desc: 'Deterministic final stage. Validates record completeness, checks every verdict has evidence, computes content hash. No LLM involved.', color: 'var(--text3)' },
            ].map(a => (
              <div key={a.agent} style={{ padding: '12px', border: `1px solid var(--border)`, borderRadius: '8px', borderLeft: `3px solid ${a.color}` }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: a.color, marginBottom: '6px' }}>{a.agent}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
