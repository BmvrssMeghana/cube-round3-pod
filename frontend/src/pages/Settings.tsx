import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, User, Shield, Database } from 'lucide-react';

interface SettingsProps {
  org: string;
  onOrgChange: (org: string) => void;
}

export default function Settings({ org, onOrgChange }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [visionProvider, setVisionProvider] = useState('mock');

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Organization, vision provider, and system configuration.</p>
      </div>

      {/* Org */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Organization</span>
          <Building size={14} color="var(--text3)" />
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Active Organization</label>
            <select className="form-input form-select" value={org} onChange={e => onOrgChange(e.target.value)}>
              <option value="org_demo_alpha">org_demo_alpha</option>
              <option value="org_demo_bravo">org_demo_bravo</option>
            </select>
            <p className="form-hint">Data is isolated by organization. Switching organizations shows only that organization's inspections, products, and activity.</p>
          </div>
          <div className="warn-box">
            <strong>Tenancy isolation enforced:</strong> Each organization's inspections, products, images, and agent events are completely isolated. A user in org_demo_bravo cannot access org_demo_alpha data, even by guessing record IDs.
          </div>
        </div>
      </div>

      {/* Vision Provider */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Vision Provider</span>
          <Database size={14} color="var(--text3)" />
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="form-input form-select" value={visionProvider} onChange={e => setVisionProvider(e.target.value)}>
              <option value="mock">MockVisionProvider (deterministic — demo)</option>
              <option value="gemini">GeminiVisionProvider (production)</option>
              <option value="openai">OpenAIVisionProvider (production)</option>
            </select>
            <p className="form-hint">
              The vision provider is abstracted. Switching from Mock to a real provider requires only setting the API key below. The agent pipeline and decision logic do not change.
            </p>
          </div>
          {visionProvider !== 'mock' && (
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input
                className="form-input"
                type="password"
                placeholder="API key (never stored in frontend; backend-only in production)"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <p className="form-hint">In production, API keys are never exposed in the frontend. All model calls are made server-side via the FastAPI backend.</p>
            </div>
          )}
          <div className="info-box">
            <strong>Cost optimization:</strong> All checks are batched into a single multimodal model call per inspection. This keeps cost within the $0.40–$1.10 per-unit economics of prep center operations.
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Security &amp; Auditability</span>
          <Shield size={14} color="var(--text3)" />
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Tenancy isolation', value: 'Enforced — row-level by org_id' },
              { label: 'API keys in frontend', value: 'Never — backend only' },
              { label: 'Image uploads', value: 'Validated type + size limit (10MB)' },
              { label: 'Evidence records', value: 'Append-only with content hash' },
              { label: 'Human overrides', value: 'Stored separately — never overwrites AI decision' },
              { label: 'Model version tracking', value: 'Per-check model version stored' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: 'var(--green)', fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interoperability */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CUBE Interoperability</span>
        </div>
        <div className="card-body">
          <div className="info-box" style={{ marginBottom: '12px' }}>
            Prep Manager emits the CUBE evidence contract (schema v1.1) compatible with Recovery Manager. Every inspection record includes agent: "prep", shipment_id, checks array, and content_hash — the minimum required for Recovery Manager to use this data in a claim.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
            {[
              { stage: '01 Receiving', status: 'Connected', color: 'var(--green)' },
              { stage: '02 Prep', status: 'Active (this stage)', color: 'var(--accent)' },
              { stage: '03 Pack', status: 'Connected', color: 'var(--green)' },
              { stage: '04 Returns', status: 'Connected', color: 'var(--green)' },
              { stage: '05 Recovery', status: 'Consumes this output', color: 'var(--blue)' },
            ].map(s => (
              <div key={s.stage} style={{ padding: '10px 12px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{s.stage}</div>
                <div style={{ color: s.color, fontWeight: 500 }}>{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
