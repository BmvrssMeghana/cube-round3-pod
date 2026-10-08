
import { PRODUCTS, getRulesForCategory } from '../data/rules';
import { store } from '../data/store';
import { Package, PlusCircle } from 'lucide-react';

interface ProductsProps {
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function Products({ org }: ProductsProps) {
  const products = PRODUCTS.filter(p => p.organization_id === org || org === 'org_demo_alpha');
  const inspections = store.getAll(org);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Products &amp; Rules</h2>
          <p>Product registry and applicable preparation rule mapping.</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Product add is coming in the next sprint.')}>
          <PlusCircle size={14} /> Add Product
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ASIN</th>
              <th>FNSKU</th>
              <th>Description</th>
              <th>Category</th>
              <th>Rule Set</th>
              <th>Applicable Rules</th>
              <th>Expiry-Dated</th>
              <th>Inspections</th>
              <th>Last Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const rules = getRulesForCategory(product.prep_category);
              const productInspections = inspections.filter(i => i.sku === product.sku);
              const lastInsp = productInspections[0];
              return (
                <tr key={product.id}>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{product.sku}</td>
                  <td className="td-mono">{product.asin}</td>
                  <td className="td-mono">{product.fnsku}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{product.description}</td>
                  <td style={{ fontSize: '12px' }}>{product.category}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text3)' }}>{product.prep_category}</td>
                  <td>
                    <span className="badge badge-na">{rules.length} rules</span>
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--green)' }}>
                      {rules.filter(r => r.visually_verifiable).length} visual
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {product.expiry_dated
                      ? <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Yes</span>
                      : <span style={{ color: 'var(--text3)' }}>No</span>}
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 700 }}>{productInspections.length}</td>
                  <td>
                    {lastInsp ? (
                      <span className={`badge ${lastInsp.overall_status === 'PASS' ? 'badge-pass' : lastInsp.overall_status === 'FAIL' ? 'badge-fail' : 'badge-uncertain'}`} style={{ fontSize: '10px' }}>
                        {lastInsp.overall_status}
                      </span>
                    ) : <span style={{ fontSize: '11px', color: 'var(--text3)' }}>No inspections</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={36} /></div>
            <h3>No products configured.</h3>
            <p>Add a product to start tracking prep compliance by SKU.</p>
            <button className="btn btn-primary" onClick={() => alert('Product add is coming in the next sprint.')}>
              <PlusCircle size={14} /> Add Product
            </button>
          </div>
        </div>
      )}

      {/* SKU Failure Intelligence */}
      {inspections.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span className="card-title">SKU Failure Intelligence</span>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
              Aggregate pass/fail metrics per SKU. Use to identify training or process issues — not to alter compliance rules.
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Inspections</th>
                    <th>Pass</th>
                    <th>Fail</th>
                    <th>Review</th>
                    <th>Fail Rate</th>
                    <th>Most Common Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const pi = inspections.filter(i => i.sku === product.sku);
                    if (pi.length === 0) return null;
                    const pass = pi.filter(i => i.overall_status === 'PASS').length;
                    const fail = pi.filter(i => i.overall_status === 'FAIL').length;
                    const review = pi.filter(i => i.overall_status === 'REVIEW').length;
                    const failRate = pi.length ? Math.round((fail / pi.length) * 100) : 0;

                    const failCounts: Record<string, number> = {};
                    pi.forEach(i => i.checks.filter(c => c.verdict === 'fail').forEach(c => {
                      failCounts[c.check_key] = (failCounts[c.check_key] || 0) + 1;
                    }));
                    const topFail = Object.entries(failCounts).sort((a, b) => b[1] - a[1])[0];

                    return (
                      <tr key={product.sku}>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{product.sku}</td>
                        <td>{pi.length}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 600 }}>{pass}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 600 }}>{fail}</td>
                        <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{review}</td>
                        <td>
                          <span style={{ color: failRate > 20 ? 'var(--red)' : failRate > 10 ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
                            {failRate}%
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text3)' }}>
                          {topFail ? `${topFail[0]} (${topFail[1]}×)` : '—'}
                        </td>
                      </tr>
                    );
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
