import { store } from '../data/store';
import { CHECK_KEY_LABELS } from '../data/rules';

interface EvaluationProps {
  org: string;
}

// Failure Mode Registry
const FAILURE_MODES = [
  { id: 'FM-001', name: 'Glare on warning label', observed: 'Vision model interprets glare as missing/obscured text, leading to false UNCERTAIN.', impact: 'False UNCERTAIN → operator rescan burden', mitigation: 'Evidence quality gate requests angled image. UNCERTAIN threshold applied.' },
  { id: 'FM-002', name: 'Curved surface misclassified as flat', observed: 'Subtle curves on soft product packaging are assessed as flat, missing borderline seam placements.', impact: 'Potential false PASS on FNSKU placement', mitigation: 'Evidence Verifier applies conservative threshold for spatial reasoning.' },
  { id: 'FM-003', name: 'Small FNSKU text unreadable', observed: 'Low resolution or distance causes FNSKU barcode bars to be undetectable, not just unreadable.', impact: 'Placement verdict UNCERTAIN — not FAIL', mitigation: 'Evidence quality gate flags resolution issues. Rescan guidance provided.' },
  { id: 'FM-004', name: 'Multiple units in one image', observed: 'Frame contains two units. System flags but cannot isolate individual unit compliance.', impact: 'All affected checks return UNCERTAIN', mitigation: 'Evidence quality gate detects and warns. Operator instructed to photograph units separately.' },
  { id: 'FM-005', name: 'Barcode detected but not decoded', observed: 'Original barcode is detectable but OCR/barcode decoder cannot read it. Coverage cannot be confirmed.', impact: 'original_barcode_covered returns UNCERTAIN', mitigation: 'Explicit distinction between "detected" and "decodable" in observation text.' },
  { id: 'FM-006', name: 'Bag fold hides warning', observed: 'Suffocation warning text is present but partially obscured by a fold in the polybag.', impact: 'False UNCERTAIN → rescan request', mitigation: 'Operator instructed to smooth bag before capturing. Warning flag in evidence quality.' },
];

export default function Evaluation({ org }: EvaluationProps) {
  const inspections = store.getAll(org);

  const metrics = store.getMetrics(org);

  // Per-check metrics from fixtures
  const checkStats: Record<string, { pass: number; fail: number; uncertain: number; total: number }> = {};
  inspections.forEach(insp => {
    insp.checks.forEach(c => {
      if (!checkStats[c.check_key]) checkStats[c.check_key] = { pass: 0, fail: 0, uncertain: 0, total: 0 };
      if (c.verdict === 'pass') checkStats[c.check_key].pass++;
      else if (c.verdict === 'fail') checkStats[c.check_key].fail++;
      else if (c.verdict === 'uncertain') checkStats[c.check_key].uncertain++;
      checkStats[c.check_key].total++;
    });
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2>Evaluation Center</h2>
        <p>Model quality metrics, per-check performance, and failure mode documentation.</p>
      </div>

      <div className="info-box" style={{ marginBottom: '20px' }}>
        The held-out evaluation methodology uses 50 unseen units, each independently labelled by two humans. The official eval set has not yet been run against this build. Metrics shown below are derived from demo fixture data only.
      </div>

      {/* Held-out eval status */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Held-out Evaluation Set</span>
          <span className="badge badge-na">Not yet run</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'Eval Units', value: 'Not evaluated' },
              { label: 'Human Labels', value: 'Not evaluated' },
              { label: 'Overall Accuracy', value: 'Not evaluated' },
              { label: 'Human Agreement', value: 'Not evaluated' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{m.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text3)' }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div className="warn-box" style={{ marginTop: '16px' }}>
            "It works well" is not a result. Official evaluation requires a number per check, with false positives and false negatives separately documented, and the methodology written down. This section will populate once the held-out eval set is run.
          </div>
        </div>
      </div>

      {/* Live demo metrics */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Demo Data Metrics</span>
          <span className="badge badge-review">{inspections.length} inspections</span>
        </div>
        <div className="card-body">
          <div className="section-grid-3">
            {[
              { label: 'Pass Rate', value: metrics.passRate + '%', color: 'var(--green)' },
              { label: 'Fail Rate', value: metrics.failRate + '%', color: 'var(--red)' },
              { label: 'Uncertain Rate', value: metrics.uncertainRate + '%', color: 'var(--amber)' },
              { label: 'Avg Latency', value: metrics.avgLatency > 0 ? (metrics.avgLatency / 1000).toFixed(2) + 's' : '—', color: 'var(--text)' },
              { label: 'Est. Cost/Check', value: '$' + metrics.avgCost, color: 'var(--text)' },
              { label: 'Evidence Issues', value: metrics.evidenceIssues, color: 'var(--blue)' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-check breakdown */}
      {Object.keys(checkStats).length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Per-Check Breakdown (Demo Data)</span>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Total</th>
                  <th>PASS</th>
                  <th>FAIL</th>
                  <th>UNCERTAIN</th>
                  <th>Fail Rate</th>
                  <th>Uncertain Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(checkStats).map(([key, stats]) => (
                  <tr key={key}>
                    <td style={{ fontWeight: 600, fontSize: '12px' }}>{CHECK_KEY_LABELS[key] || key}</td>
                    <td>{stats.total}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{stats.pass}</td>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>{stats.fail}</td>
                    <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{stats.uncertain}</td>
                    <td style={{ color: stats.total ? (stats.fail / stats.total > 0.2 ? 'var(--red)' : 'var(--text3)') : 'var(--text3)' }}>
                      {stats.total ? Math.round((stats.fail / stats.total) * 100) + '%' : '—'}
                    </td>
                    <td style={{ color: 'var(--amber)' }}>
                      {stats.total ? Math.round((stats.uncertain / stats.total) * 100) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failure Mode Registry */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Failure Mode Registry</span>
          <span className="badge badge-na">{FAILURE_MODES.length} modes documented</span>
        </div>
        <div className="card-body">
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
            Documented failure modes are used to improve the evidence quality gate, rescan guidance, and model prompting. Contradictions are raised as findings.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAILURE_MODES.map(fm => (
              <div key={fm.id} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '3px solid var(--red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>{fm.id}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{fm.name}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}><strong>Observed:</strong> {fm.observed}</div>
                <div style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '4px' }}><strong>Impact:</strong> {fm.impact}</div>
                <div style={{ fontSize: '12px', color: 'var(--green)' }}><strong>Mitigation:</strong> {fm.mitigation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
