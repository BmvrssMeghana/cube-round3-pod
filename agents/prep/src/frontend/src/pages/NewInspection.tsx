import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Info, ChevronRight, Loader } from 'lucide-react';
import { PRODUCTS, CATEGORY_RULES, getRulesForCategory, CHECK_KEY_LABELS } from '../data/rules';
import type { ImageRecord } from '../data/store';
import { createNewInspection } from '../data/store';
import { runInspectionPipeline } from '../engine/vision';
import type { AgentStepUpdate } from '../engine/vision';
import { v4 as uuidv4 } from 'uuid';

interface NewInspectionProps {
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const ANGLE_OPTIONS = ['front', 'rear', 'left', 'right', 'top', 'bottom', 'close-up', 'label', 'custom'];
const OPERATORS = ['op_eli', 'op_dana', 'op_amira', 'op_ben', 'op_chen', 'op_fatima'];

const STEPS = [
  { label: 'Unit Context', num: 1 },
  { label: 'Rule Set', num: 2 },
  { label: 'Photo Capture', num: 3 },
  { label: 'Run Inspection', num: 4 },
];

type StepStatus = 'active' | 'done' | 'pending';

interface AgentStep {
  step: number;
  agent: string;
  event: string;
  status: StepStatus;
}

const AGENT_STEPS_DEF = [
  { step: 0, agent: 'Orchestrator', label: 'Validate inputs & unit context' },
  { step: 1, agent: 'Evidence Quality Agent', label: 'Assess image quality' },
  { step: 2, agent: 'Rule & Policy Agent', label: 'Load applicable rules' },
  { step: 3, agent: 'Visual Compliance Agent', label: 'Multi-modal inspection' },
  { step: 4, agent: 'Evidence Verifier', label: 'Validate observations' },
  { step: 5, agent: 'Integrity Layer', label: 'Generate content hash' },
];

export default function NewInspection({ org, onNavigate }: NewInspectionProps) {
  const [step, setStep] = useState(1);
  const [unitId, setUnitId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [customAsin, setCustomAsin] = useState('');
  const [customFnsku, setCustomFnsku] = useState('');
  const [customCategory, setCustomCategory] = useState('general');
  const [shipmentId, setShipmentId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [operatorId, setOperatorId] = useState('op_eli');
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(
    AGENT_STEPS_DEF.map(s => ({ ...s, status: 'pending' as StepStatus, event: s.label }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgProducts = PRODUCTS.filter(p => p.organization_id === org || org === 'org_demo_alpha');
  const selectedProduct = orgProducts.find(p => p.id === selectedProductId);

  const category = selectedProduct?.prep_category || customCategory;
  const sku = selectedProduct?.sku || customSku;
  const asin = selectedProduct?.asin || customAsin;
  const fnsku = selectedProduct?.fnsku || customFnsku;
  const rules = getRulesForCategory(category);

  const loadProduct = () => {
    if (!selectedProduct) return;
    setCustomSku(selectedProduct.sku);
    setCustomAsin(selectedProduct.asin);
    setCustomFnsku(selectedProduct.fnsku);
    setCustomCategory(selectedProduct.prep_category);
    if (!unitId) setUnitId(`UNIT-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`);
    if (!shipmentId) setShipmentId('FBA-DUMMY-110');
    if (!workOrderId) setWorkOrderId('WO-3020');
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
      if (file.size > 10 * 1024 * 1024) return; // 10MB limit
      const url = URL.createObjectURL(file);
      const img: ImageRecord = {
        key: `IMG-${String(images.length + 1).padStart(3, '0')}`,
        sha256: uuidv4().replace(/-/g, '').slice(0, 16),
        bytes: file.size,
        taken_at: new Date().toISOString(),
        angle: 'front',
        quality_status: file.size < 100000 ? 'warn' : 'ok',
        quality_reason: file.size < 100000 ? 'Small file size — image may be low resolution.' : undefined,
        url,
      };
      setImages(prev => [...prev, img]);
    });
  }, [images.length]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (key: string) => {
    setImages(prev => prev.filter(i => i.key !== key));
  };

  const updateAngle = (key: string, angle: string) => {
    setImages(prev => prev.map(i => i.key === key ? { ...i, angle } : i));
  };

  const canProceed = () => {
    if (step === 1) return unitId.trim() && (selectedProductId || customSku.trim());
    if (step === 2) return true;
    if (step === 3) return images.length >= 1;
    return false;
  };

  const runInspection = async () => {
    if (images.length === 0) return;
    setStep(4);
    setRunning(true);

    await runInspectionPipeline({
      organization_id: org,
      unit_id: unitId,
      sku,
      asin,
      fnsku,
      shipment_id: shipmentId,
      work_order_id: workOrderId,
      operator_id: operatorId,
      product_id: selectedProductId || 'custom',
      category,
      images,
      rules,
      onStep: (update: AgentStepUpdate) => {
        setAgentSteps(prev => prev.map(s =>
          s.step === update.step
            ? { ...s, status: update.status as StepStatus, event: update.event }
            : s.step < update.step
              ? { ...s, status: 'done' }
              : s
        ));
      },
    }).then(result => {
      const inspection = createNewInspection({
        organization_id: org,
        unit_id: unitId,
        sku,
        asin,
        fnsku,
        shipment_id: shipmentId,
        work_order_id: workOrderId,
        operator_id: operatorId,
        product_id: selectedProductId || 'custom',
        category,
        images,
        checks: result.checks,
        agent_events: result.agent_events,
        cost_estimate: result.cost_estimate,
        latency_ms: result.latency_ms,
      });

      setRunning(false);
      setTimeout(() => {
        onNavigate('inspection-detail', { id: inspection.id });
      }, 600);
    });
  };

  const stepStatusClass = (n: number): string => {
    if (n < step) return 'done';
    if (n === step) return 'active';
    return '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>New Inspection</h2>
        <p>Run a visual prep compliance check for a prepared unit.</p>
      </div>

      {/* Step Wizard */}
      <div className="step-wizard" style={{ marginBottom: '28px' }}>
        {STEPS.map(s => (
          <div key={s.num} className="step-wizard-item">
            <div className={`step-num ${stepStatusClass(s.num)}`}>
              {stepStatusClass(s.num) === 'done' ? <CheckCircle size={12} /> : s.num}
            </div>
            <span className={`step-label ${stepStatusClass(s.num)}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Step 1 — Unit Context</span>
          </div>
          <div className="card-body">
            <div className="section-grid">
              <div>
                <div className="form-group">
                  <label className="form-label">Unit ID *</label>
                  <input className="form-input" value={unitId} onChange={e => setUnitId(e.target.value)} placeholder="UNIT-0001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Product (select to auto-fill)</label>
                  <select className="form-input form-select" value={selectedProductId} onChange={e => { setSelectedProductId(e.target.value); }}>
                    <option value="">— Select product or enter manually —</option>
                    {orgProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.sku} — {p.description}</option>
                    ))}
                  </select>
                </div>
                {selectedProductId && (
                  <button className="btn btn-secondary btn-sm" style={{ marginBottom: '12px' }} onClick={loadProduct}>
                    <ChevronRight size={13} /> Load Unit Context
                  </button>
                )}
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input className="form-input" value={customSku} onChange={e => setCustomSku(e.target.value)} placeholder="SKU-PRODUCT-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">ASIN</label>
                  <input className="form-input" value={customAsin} onChange={e => setCustomAsin(e.target.value)} placeholder="B0XXXXXXXX" />
                </div>
              </div>
              <div>
                <div className="form-group">
                  <label className="form-label">FNSKU</label>
                  <input className="form-input" value={customFnsku} onChange={e => setCustomFnsku(e.target.value)} placeholder="X00XXXXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">FBA Shipment ID</label>
                  <input className="form-input" value={shipmentId} onChange={e => setShipmentId(e.target.value)} placeholder="FBA-XXXXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Order ID</label>
                  <input className="form-input" value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} placeholder="WO-XXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Prep Category</label>
                  <select className="form-input form-select" value={customCategory} onChange={e => setCustomCategory(e.target.value)}>
                    {Object.keys(CATEGORY_RULES).map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Operator</label>
                  <select className="form-input form-select" value={operatorId} onChange={e => setOperatorId(e.target.value)}>
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-primary" disabled={!canProceed()} onClick={() => setStep(2)}>
                Next: Review Rules <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Step 2 — Applicable Rule Set</span>
            <span className="badge badge-review">{rules.length} rules</span>
          </div>
          <div className="card-body">
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <strong>Product:</strong> {sku} &nbsp;|&nbsp; <strong>Category:</strong> {category} &nbsp;|&nbsp;
              <strong>Applicable checks:</strong> {rules.length} &nbsp;|&nbsp;
              <strong>Visually verifiable:</strong> {rules.filter(r => r.visually_verifiable).length} &nbsp;|&nbsp;
              <strong>Non-visual:</strong> {rules.filter(r => !r.visually_verifiable).length}
            </div>
            <div style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {rules.map((rule, i) => (
                <div key={rule.rule_id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)' }}>
                  <div style={{ marginTop: '2px' }}>
                    {rule.visually_verifiable
                      ? <CheckCircle size={14} color="var(--green)" />
                      : <AlertCircle size={14} color="var(--amber)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{CHECK_KEY_LABELS[rule.check_key] || rule.check_key}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{rule.requirement.slice(0, 120)}{rule.requirement.length > 120 ? '…' : ''}</div>
                    {!rule.visually_verifiable && (
                      <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '2px' }}>
                        Not visually verifiable — will return UNCERTAIN
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{rule.rule_id}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next: Photo Capture <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Step 3 — Photo Capture</span>
            <span className="badge badge-na">{images.length} image(s)</span>
          </div>
          <div className="card-body">
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              style={{ marginBottom: '16px' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-zone-icon"><Upload size={28} /></div>
              <h4>Drag and drop photos here</h4>
              <p>JPG, PNG, WEBP — or click to browse &nbsp;|&nbsp; Max 10MB per image</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>

            {images.length > 0 && (
              <div>
                <div className="image-grid">
                  {images.map(img => (
                    <div key={img.key} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg3)' }}>
                      {img.url ? (
                        <div style={{ position: 'relative', height: '120px', background: '#000' }}>
                          <img src={img.url} alt={img.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <button
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => removeImage(img.key)}
                          >
                            <X size={12} color="#fff" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '11px' }}>
                          {img.key}
                        </div>
                      )}
                      <div style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)' }}>{img.key}</span>
                          {img.quality_status === 'warn' && <AlertCircle size={11} color="var(--amber)" />}
                          {img.quality_status === 'ok' && <CheckCircle size={11} color="var(--green)" />}
                        </div>
                        {img.quality_status === 'warn' && (
                          <div style={{ fontSize: '10px', color: 'var(--amber)', marginBottom: '4px' }}>{img.quality_reason}</div>
                        )}
                        <select
                          className="form-input form-select"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          value={img.angle}
                          onChange={e => updateAngle(img.key, e.target.value)}
                        >
                          {ANGLE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="info-box" style={{ marginTop: '16px' }}>
              <Info size={13} style={{ display: 'inline', marginRight: '6px', color: 'var(--blue)' }} />
              Recommended: front, label close-up, rear (if expiry-dated), and any area with seal or handling marks.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary btn-lg" disabled={images.length === 0} onClick={runInspection}>
                Run Prep Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — Running */}
      {step === 4 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">PREP INSPECTION</span>
            {running && <span className="spinner" />}
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text3)' }}>
              Unit: <strong style={{ color: 'var(--text)' }}>{unitId}</strong> &nbsp;·&nbsp;
              {sku} &nbsp;·&nbsp; {rules.length} checks &nbsp;·&nbsp; {images.length} image(s)
            </div>
            <div className="agent-progress">
              {agentSteps.map((s) => (
                <div key={s.step} className="agent-step">
                  <div className={`agent-step-icon ${s.status}`}>
                    {s.status === 'done' ? <CheckCircle size={14} /> : s.status === 'active' ? <Loader size={14} className="spinner" style={{ animation: 'spin 0.7s linear infinite' }} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border2)' }} />}
                  </div>
                  <div className="agent-step-text">
                    <div className="agent-step-name">{s.agent}</div>
                    <div className="agent-step-sub">{s.event}</div>
                  </div>
                </div>
              ))}
            </div>
            {!running && (
              <div style={{ marginTop: '16px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Inspection complete. Redirecting…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
