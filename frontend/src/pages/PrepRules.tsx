import { useState } from 'react';
import { RULE_REGISTRY } from '../data/rules';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

export default function PrepRules() {
  const [filterVerifiable, setFilterVerifiable] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = Array.from(new Set(RULE_REGISTRY.flatMap(r => Array.isArray(r.category) ? r.category : [r.category])));

  const filtered = RULE_REGISTRY.filter(rule => {
    const matchVerifiable = filterVerifiable === 'all'
      || (filterVerifiable === 'yes' && rule.visually_verifiable)
      || (filterVerifiable === 'no' && !rule.visually_verifiable);
    const matchCat = filterCategory === 'all'
      || (Array.isArray(rule.category) ? rule.category.includes(filterCategory) : rule.category === filterCategory);
    return matchVerifiable && matchCat;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2>Preparation Rules</h2>
        <p>Authoritative rule registry — sourced from official FBA preparation guidance. Last verified: 2026-10-05.</p>
      </div>

      <div className="info-box" style={{ marginBottom: '20px' }}>
        These rules are derived from official FBA packaging and preparation requirements. The system uses these rules — not heuristics or model memory — to determine what each inspection must evaluate. Non-visually-verifiable rules return UNCERTAIN automatically and cannot be evaluated from photographs.
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <select className="form-input form-select" style={{ width: 'auto', fontSize: '12px' }} value={filterVerifiable} onChange={e => setFilterVerifiable(e.target.value)}>
          <option value="all">All verifiability</option>
          <option value="yes">Visually verifiable</option>
          <option value="no">Not visually verifiable</option>
        </select>
        <select className="form-input form-select" style={{ width: 'auto', fontSize: '12px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{filtered.length} rule(s)</span>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Rule Registry</span>
          <span className="badge badge-na">{RULE_REGISTRY.length} total</span>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Rule Name</th>
                <th>Check Key</th>
                <th>Category</th>
                <th>Vis. Verifiable</th>
                <th>Evaluation Method</th>
                <th>Source</th>
                <th>Version</th>
                <th>Last Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rule => (
                <tr key={rule.rule_id}>
                  <td className="td-mono" style={{ color: 'var(--accent)' }}>{rule.rule_id}</td>
                  <td style={{ fontSize: '13px', fontWeight: 600 }}>{rule.rule_name}</td>
                  <td className="td-mono">{rule.check_key}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text3)' }}>
                    {Array.isArray(rule.category) ? rule.category.join(', ') : rule.category}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {rule.visually_verifiable
                        ? <><CheckCircle size={13} color="var(--green)" /><span style={{ fontSize: '11px', color: 'var(--green)' }}>Yes</span></>
                        : <><AlertCircle size={13} color="var(--amber)" /><span style={{ fontSize: '11px', color: 'var(--amber)' }}>No</span></>
                      }
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '200px' }}>
                    {rule.evaluation_method}
                    {!rule.visually_verifiable && rule.not_visually_verifiable_reason && (
                      <div style={{ color: 'var(--amber)', fontSize: '11px', marginTop: '2px' }}>
                        {rule.not_visually_verifiable_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    <a href={rule.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      {rule.source_name.split('—')[0].trim()} <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="td-mono">{rule.source_version}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text3)' }}>{rule.last_verified_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
