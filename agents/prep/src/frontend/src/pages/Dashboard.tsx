import { store } from '../data/store';
import { PlusCircle, AlertTriangle, ShieldCheck, BarChart2 } from 'lucide-react';
import VerdictBadge from '../components/VerdictBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { CHECK_KEY_LABELS } from '../data/rules';

interface DashboardProps {
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function Dashboard({ org, onNavigate }: DashboardProps) {
  const metrics = store.getMetrics(org);
  const inspections = store.getAll(org);
  const failures = store.getFailurePatterns(org);
  const recent = inspections.slice(0, 8);
  const reviewQueue = inspections.filter(i => i.overall_status === 'REVIEW').slice(0, 4);

  const chartData = [
    { name: 'PASS', value: metrics.pass, color: '#0d9488' },
    { name: 'FAIL', value: metrics.fail, color: '#e11d48' },
    { name: 'REVIEW', value: metrics.review, color: '#d97706' },
  ];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2>Prep Manager</h2>
          <p>Inbound Preparation Intelligence — verify every unit before it enters the inbound shipment.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new-inspection')}>
          <PlusCircle size={15} /> New Inspection
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Inspections</div>
          <div className="metric-value">{metrics.total}</div>
          <div className="metric-sub">All time</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">PASS</div>
          <div className="metric-value green">{metrics.pass}</div>
          <div className="metric-sub">{metrics.passRate}% pass rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">FAIL</div>
          <div className="metric-value red">{metrics.fail}</div>
          <div className="metric-sub">{metrics.failRate}% fail rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">REVIEW</div>
          <div className="metric-value amber">{metrics.review}</div>
          <div className="metric-sub">{metrics.uncertainRate}% uncertain</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Evidence Issues</div>
          <div className="metric-value blue">{metrics.evidenceIssues}</div>
          <div className="metric-sub">Images flagged</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Latency</div>
          <div className="metric-value">{metrics.avgLatency > 0 ? (metrics.avgLatency / 1000).toFixed(1) + 's' : '—'}</div>
          <div className="metric-sub">Per inspection</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Est. Cost/Check</div>
          <div className="metric-value" style={{ fontSize: '22px' }}>
            ${metrics.avgCost}
          </div>
          <div className="metric-sub">USD per unit</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="section-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inspection Overview</span>
            <BarChart2 size={14} color="var(--text3)" />
          </div>
          <div className="card-body">
            {metrics.total === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p>No inspections yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={40}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--bg3)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Failure Patterns</span>
            <AlertTriangle size={14} color="var(--text3)" />
          </div>
          <div className="card-body">
            {failures.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>No failure patterns recorded.</p>
              </div>
            ) : (
              <div>
                {failures.slice(0, 6).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{f.key}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--red)' }}>{f.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High Priority Review */}
      {reviewQueue.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">High Priority Review</span>
            <span className="badge badge-uncertain">{reviewQueue.length} pending</span>
          </div>
          <div style={{ padding: '0 4px' }}>
            {reviewQueue.map(insp => (
              <div key={insp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="td-mono">{insp.unit_id}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{insp.sku}</span>
                  <span style={{ fontSize: '12px', color: 'var(--amber)' }}>
                    {insp.checks.filter(c => c.verdict === 'uncertain').length} uncertain check(s)
                  </span>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('inspection-detail', { id: insp.id })}>
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Inspections */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Inspections</span>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('history')}>View all</button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldCheck size={36} /></div>
            <h3>No inspections yet.</h3>
            <p>Run your first prep inspection to start building the compliance history.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('new-inspection')}>
              <PlusCircle size={14} /> New Inspection
            </button>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>SKU</th>
                  <th>Shipment</th>
                  <th>Result</th>
                  <th>Risk</th>
                  <th>Failed Check</th>
                  <th>Operator</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(insp => {
                  const failedChecks = insp.checks.filter(c => c.verdict === 'fail');
                  return (
                    <tr key={insp.id}>
                      <td className="td-mono">{insp.unit_id}</td>
                      <td style={{ fontSize: '12px' }}>{insp.sku}</td>
                      <td className="td-mono">{insp.shipment_id}</td>
                      <td><VerdictBadge verdict={insp.overall_status} size="sm" /></td>
                      <td>
                        <span className={`risk-badge risk-${insp.prep_risk.toLowerCase()}`}>{insp.prep_risk}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--red)' }}>
                        {failedChecks.length > 0 ? CHECK_KEY_LABELS[failedChecks[0].check_key] || failedChecks[0].check_key : '—'}
                      </td>
                      <td style={{ fontSize: '12px' }}>{insp.operator_id}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {format(new Date(insp.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('inspection-detail', { id: insp.id })}>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
