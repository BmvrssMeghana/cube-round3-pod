import { useState } from 'react';
import { store } from '../data/store';
import { CHECK_KEY_LABELS } from '../data/rules';
import VerdictBadge from '../components/VerdictBadge';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryProps {
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function InspectionHistory({ org, onNavigate }: HistoryProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');

  const all = store.getAll(org);

  const operators = Array.from(new Set(all.map(i => i.operator_id)));

  const filtered = all.filter(insp => {
    const matchSearch = !search || [insp.unit_id, insp.sku, insp.asin, insp.shipment_id, insp.record_id]
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || insp.overall_status === filterStatus;
    const matchOp = filterOperator === 'all' || insp.operator_id === filterOperator;
    return matchSearch && matchStatus && matchOp;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2>Inspection History</h2>
        <p>All prep compliance inspections for this organization.</p>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <Search size={13} className="filter-search-icon" />
          <input
            type="text"
            placeholder="Search unit, SKU, ASIN, shipment, inspection ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="pill-filter">
          {['all', 'PASS', 'FAIL', 'REVIEW', 'PENDING'].map(s => (
            <button
              key={s}
              className={`pill ${s.toLowerCase()} ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        <select
          className="form-input form-select"
          style={{ width: 'auto', fontSize: '12px' }}
          value={filterOperator}
          onChange={e => setFilterOperator(e.target.value)}
        >
          <option value="all">All operators</option>
          {operators.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Search size={32} color="var(--border2)" />
            <h3>No inspection records match your filters.</h3>
            <p>Try adjusting the search or filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Unit</th>
                <th>SKU</th>
                <th>Shipment</th>
                <th>Date</th>
                <th>Result</th>
                <th>Risk</th>
                <th>Failed Check</th>
                <th>Evidence</th>
                <th>Operator</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(insp => {
                const failedChecks = insp.checks.filter(c => c.verdict === 'fail');
                const evidenceIssues = insp.images.filter(i => i.quality_status !== 'ok').length;
                return (
                  <tr key={insp.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('inspection-detail', { id: insp.id })}>
                    <td className="td-mono" style={{ color: 'var(--accent)' }}>{insp.record_id}</td>
                    <td className="td-mono">{insp.unit_id}</td>
                    <td style={{ fontSize: '12px' }}>{insp.sku}</td>
                    <td className="td-mono">{insp.shipment_id}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {format(new Date(insp.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td><VerdictBadge verdict={insp.overall_status} size="sm" /></td>
                    <td>
                      <span className={`risk-badge risk-${insp.prep_risk.toLowerCase()}`}>{insp.prep_risk}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--red)' }}>
                      {failedChecks.length > 0 ? CHECK_KEY_LABELS[failedChecks[0].check_key] || failedChecks[0].check_key : '—'}
                    </td>
                    <td>
                      {evidenceIssues > 0 ? (
                        <span style={{ fontSize: '11px', color: 'var(--amber)' }}>{evidenceIssues} issue(s)</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--green)' }}>OK</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>{insp.operator_id}</td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={e => { e.stopPropagation(); onNavigate('inspection-detail', { id: insp.id }); }}>
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

      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text3)' }}>
        Showing {filtered.length} of {all.length} inspection(s)
      </div>
    </div>
  );
}
