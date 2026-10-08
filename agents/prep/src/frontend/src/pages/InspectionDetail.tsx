import { useState } from 'react';
import { store } from '../data/store';
import type { CheckRecord } from '../data/store';
import { CHECK_KEY_LABELS } from '../data/rules';
import {
  CheckCircle, XCircle, AlertCircle, ChevronLeft, RefreshCw, Info,
  Image as ImageIcon, Shield, Clock, Hash, Eye
} from 'lucide-react';
import VerdictBadge from '../components/VerdictBadge';
import { format } from 'date-fns';

interface InspectionDetailProps {
  inspectionId: string;
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function CheckCard({ check }: { check: CheckRecord }) {
  const [expanded, setExpanded] = useState(false);
  const cardCls = check.verdict === 'pass' ? 'check-card pass' : check.verdict === 'fail' ? 'check-card fail' : check.verdict === 'not_applicable' ? 'check-card na' : 'check-card uncertain';

  return (
    <div className={cardCls}>
      <div className="check-header">
        <div>
          <div className="check-title">{CHECK_KEY_LABELS[check.check_key] || check.check_key}</div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'monospace' }}>{check.rule_id}</div>
        </div>
        <VerdictBadge verdict={check.verdict} />
      </div>

      <div className="check-observation">{check.observation}</div>

      <div className="check-meta">
        {check.confidence !== null && (
          <div className="check-meta-item">
            <Shield size={11} />
            <strong>Confidence:</strong> {Math.round((check.confidence || 0) * 100)}%
          </div>
        )}
        <div className="check-meta-item">
          <Info size={11} />
          <strong>Rule:</strong> {check.rule_name}
        </div>
        <div className="check-meta-item">
          <Clock size={11} />
          <strong>Latency:</strong> {check.latency_ms}ms
        </div>
        {check.evidence_images.length > 0 && (
          <div className="check-meta-item">
            <ImageIcon size={11} />
            <strong>Evidence:</strong> {check.evidence_images.map(e => e.image_key).join(', ')}
          </div>
        )}
      </div>

      {check.confidence !== null && (
        <div className="confidence-bar" style={{ marginTop: '10px' }}>
          <div
            className={`confidence-fill ${check.verdict}`}
            style={{ width: `${Math.round((check.confidence || 0) * 100)}%` }}
          />
        </div>
      )}

      {(check.recommended_action || check.failure_reason) && (
        <div
          className={`check-action ${check.verdict === 'fail' ? 'fail' : ''}`}
          style={{ marginTop: '12px' }}
        >
          {check.failure_reason && (
            <div style={{ marginBottom: '4px' }}><strong>Failure reason:</strong> {check.failure_reason}</div>
          )}
          {check.recommended_action && (
            <div><strong>Recommended action:</strong> {check.recommended_action}</div>
          )}
        </div>
      )}

      {check.evidence_images.length > 0 && check.evidence_images[0].region && (
        <div style={{ marginTop: '10px' }}>
          <button
            className="btn btn-sm btn-ghost"
            style={{ fontSize: '11px' }}
            onClick={() => setExpanded(e => !e)}
          >
            <Eye size={12} /> {expanded ? 'Hide' : 'Show'} evidence region
          </button>
          {expanded && (
            <div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text3)' }}>
              {check.evidence_images.map(e => (
                <div key={e.image_key}>
                  <strong>{e.image_key}</strong>
                  {e.region && ` — Region: x=${e.region.x} y=${e.region.y} w=${e.region.width} h=${e.region.height}`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InspectionDetail({ inspectionId, org, onNavigate }: InspectionDetailProps) {
  const [activeTab, setActiveTab] = useState<'checks' | 'trace' | 'activity' | 'record'>('checks');
  const insp = store.get(inspectionId);

  if (!insp || insp.organization_id !== org) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Inspection not found.</h3>
          <p>This inspection may belong to a different organization or does not exist.</p>
          <button className="btn btn-secondary" onClick={() => onNavigate('history')}>Back to History</button>
        </div>
      </div>
    );
  }

  const failedChecks = insp.checks.filter(c => c.verdict === 'fail');
  const uncertainChecks = insp.checks.filter(c => c.verdict === 'uncertain');
  const passedChecks = insp.checks.filter(c => c.verdict === 'pass');

  const resultCls = insp.overall_status === 'PASS' ? 'pass' : insp.overall_status === 'FAIL' ? 'fail' : 'review';
  const ResultIcon = insp.overall_status === 'PASS' ? CheckCircle : insp.overall_status === 'FAIL' ? XCircle : AlertCircle;

  const traceSummary: string[] = [
    `Unit ${insp.unit_id} identified`,
    `Rule set loaded for "${insp.sku}" — category: ${insp.product_id}`,
    `${insp.checks.length} applicable check(s) determined`,
    `${insp.images.length} image(s) validated by Evidence Quality Agent`,
    `${insp.checks.length} check(s) evaluated by Visual Compliance Agent (single model call)`,
    `Evidence Verifier confirmed ${failedChecks.length} FAIL, ${uncertainChecks.length} UNCERTAIN, ${passedChecks.length} PASS`,
    `Integrity layer generated content hash`,
    `Overall decision: ${insp.overall_status}`,
  ];

  return (
    <div className="page">
      {/* Back */}
      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('history')}>
          <ChevronLeft size={14} /> Back to History
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
            {insp.record_id} &nbsp;
            <span style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 400 }}>{insp.unit_id}</span>
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
            {insp.sku} &nbsp;·&nbsp; {insp.asin} &nbsp;·&nbsp; {format(new Date(insp.created_at), 'MMM d, yyyy HH:mm')} UTC &nbsp;·&nbsp; {insp.operator_id}
          </div>
          {insp.is_fixture && (
            <div style={{ marginTop: '6px' }}>
              <span className="badge badge-na">{insp.fixture_label}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`risk-badge risk-${insp.prep_risk.toLowerCase()}`}>
            {insp.prep_risk} RISK
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('new-inspection')}>
            <RefreshCw size={13} /> Reinspect
          </button>
        </div>
      </div>

      {/* Cost/latency */}
      <div className="cost-info" style={{ marginBottom: '20px' }}>
        <div><strong>Latency:</strong> {(insp.latency_ms / 1000).toFixed(2)}s</div>
        <div><strong>Est. cost:</strong> ${insp.cost_estimate.toFixed(4)}</div>
        <div><strong>Images:</strong> {insp.images.length}</div>
        <div><strong>Checks:</strong> {insp.checks.length}</div>
        <div><strong>Model calls:</strong> 1</div>
        <div><strong>Shipment:</strong> {insp.shipment_id}</div>
      </div>

      {/* Result Banner */}
      <div className={`result-banner ${resultCls}`}>
        <div className="result-banner-icon">
          <ResultIcon size={28} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>PREP STATUS</div>
          <div className="result-status">{insp.overall_status === 'REVIEW' ? 'REVIEW' : insp.overall_status}</div>
          <div className="result-summary">
            {insp.overall_status === 'PASS' && 'All applicable visual requirements satisfied.'}
            {insp.overall_status === 'FAIL' && `${failedChecks.length} issue(s) require correction.`}
            {insp.overall_status === 'REVIEW' && `${uncertainChecks.length} check(s) require additional evidence.`}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'inherit', opacity: 0.7 }}>
            {passedChecks.length} passed &nbsp;/&nbsp; {failedChecks.length} failed &nbsp;/&nbsp; {uncertainChecks.length} uncertain
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'checks' ? 'active' : ''}`} onClick={() => setActiveTab('checks')}>
          Check Results ({insp.checks.length})
        </div>
        <div className={`tab ${activeTab === 'trace' ? 'active' : ''}`} onClick={() => setActiveTab('trace')}>
          Decision Trace
        </div>
        <div className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          Agent Activity
        </div>
        <div className={`tab ${activeTab === 'record' ? 'active' : ''}`} onClick={() => setActiveTab('record')}>
          Evidence Record
        </div>
      </div>

      {/* Checks */}
      {activeTab === 'checks' && (
        <div>
          {/* Fail checks first */}
          {failedChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
          {uncertainChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
          {passedChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
          {insp.checks.filter(c => c.verdict === 'not_applicable').map(c => <CheckCard key={c.check_key} check={c} />)}
        </div>
      )}

      {/* Decision Trace */}
      {activeTab === 'trace' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Decision Trace</span></div>
          <div className="card-body">
            <div className="agent-progress">
              {traceSummary.map((t, i) => (
                <div key={i} className="trace-step" style={{ marginBottom: '10px' }}>
                  <div className="trace-number">{i + 1}</div>
                  <div className="trace-text">{t}</div>
                </div>
              ))}
            </div>

            {failedChecks.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Failed Checks</div>
                {failedChecks.map(c => (
                  <div key={c.check_key} style={{ padding: '12px 14px', border: '1px solid var(--red-border)', borderRadius: '8px', background: 'var(--red-bg)', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '13px', marginBottom: '4px' }}>{CHECK_KEY_LABELS[c.check_key]}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}><strong>Rule:</strong> {c.rule_name} ({c.rule_id})</div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}><strong>Observed:</strong> {c.observation}</div>
                    {c.evidence_images.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text3)' }}><strong>Evidence:</strong> {c.evidence_images.map(e => e.image_key).join(', ')}</div>}
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}>Final: FAIL</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Activity */}
      {activeTab === 'activity' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Agent Activity — {insp.record_id}</span></div>
          <div className="card-body">
            {insp.agent_events.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}><p>No activity recorded.</p></div>
            ) : (
              insp.agent_events.map((ev) => (
                <div key={ev.id} className="activity-item">
                  <div className="activity-time">{format(new Date(ev.timestamp), 'HH:mm:ss')}</div>
                  <div className="activity-agent">{ev.agent}</div>
                  <div className="activity-event">{ev.event}</div>
                  <div className="activity-latency">{ev.latency_ms}ms</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Evidence Record */}
      {activeTab === 'record' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Evidence Record (CUBE schema v{insp.schema_version})</span>
            <Hash size={14} color="var(--text3)" />
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '12px' }}>
              <div className="form-label" style={{ marginBottom: '4px' }}>Content Hash (SHA-256 equivalent)</div>
              <div className="hash-display">{insp.content_hash}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '12px' }}>
              {[
                ['Record ID', insp.record_id],
                ['Schema', insp.schema_version],
                ['Agent', insp.agent],
                ['Organization', insp.organization_id],
                ['Unit ID', insp.unit_id],
                ['SKU', insp.sku],
                ['ASIN', insp.asin],
                ['FNSKU', insp.fnsku],
                ['Shipment', insp.shipment_id],
                ['Work Order', insp.work_order_id],
                ['Operator', insp.operator_id],
                ['Status', insp.status],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text2)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Images ({insp.images.length})</div>
            <div style={{ borderRadius: '6px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
              {insp.images.map((img, i) => (
                <div key={img.key} style={{ display: 'flex', gap: '12px', padding: '8px 12px', borderBottom: i < insp.images.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '12px' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text3)', width: '64px' }}>{img.key}</span>
                  <span style={{ color: 'var(--text2)' }}>Angle: {img.angle}</span>
                  <span style={{ color: 'var(--text3)' }}>{(img.bytes / 1024).toFixed(0)} KB</span>
                  <span className={img.quality_status === 'ok' ? 'text-sm' : 'text-sm'} style={{ color: img.quality_status === 'ok' ? 'var(--green)' : 'var(--amber)' }}>
                    {img.quality_status.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text3)', fontSize: '10px' }}>{img.sha256}</span>
                </div>
              ))}
            </div>
            <div className="warn-box">
              This record is append-only. The content hash is computed over the full inspection record. Any subsequent human override is stored separately in the overrides array and does not alter this record.
            </div>
          </div>
        </div>
      )}

      {/* Unit Passport */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><span className="card-title">Unit Passport — {insp.unit_id}</span></div>
        <div className="card-body">
          <div className="passport-timeline">
            {[
              { label: 'Receiving', status: 'connected', desc: 'Condition on arrival' },
              { label: 'Prep', status: insp.overall_status === 'PASS' ? 'pass' : insp.overall_status === 'FAIL' ? 'fail' : 'active', desc: insp.overall_status === 'PASS' ? 'All checks satisfied' : insp.overall_status === 'FAIL' ? `FAIL — ${failedChecks.map(c => CHECK_KEY_LABELS[c.check_key]).join(', ')}` : 'Review required' },
              { label: 'Pack', status: 'pending', desc: 'Pending' },
              { label: 'Returns', status: 'pending', desc: 'Pending' },
              { label: 'Recovery', status: 'pending', desc: 'Pending' },
            ].map(s => (
              <div key={s.label} className="passport-step">
                <div className={`passport-step-dot ${s.status}`} />
                <div className="passport-step-title">{s.label}</div>
                <div className="passport-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
