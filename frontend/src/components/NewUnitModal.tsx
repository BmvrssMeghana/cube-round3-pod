import React, { useState } from 'react';
import { X, Package, Play } from 'lucide-react';

interface NewUnitModalProps {
  onClose: () => void;
  onCreateUnit: (
    unitId: string,
    route: string,
    returned: boolean,
    sku: string,
    expectedQty: number,
    variant: string,
    fnsku: string,
    orderId: string,
  ) => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  background: '#0D1117',
  border: '1px solid #1E2D45',
  borderRadius: 8,
  color: '#E2E8F0',
  fontSize: 13,
  padding: '8px 12px',
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-poppins font-semibold text-slate-400 mb-1.5" style={{ fontSize: 11 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({ onClose, onCreateUnit }) => {
  const [unitId, setUnitId] = useState(() => `UNIT-TEST-${Date.now().toString().slice(-4)}`);
  const [sku, setSku] = useState('SKU-BLUE-BOTTLE');
  const [expectedQty, setExpectedQty] = useState(10);
  const [variant, setVariant] = useState('');
  const [fnsku, setFnsku] = useState('');
  const [orderId, setOrderId] = useState('');
  const [route, setRoute] = useState('fba');
  const [returned, setReturned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#2563EB';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#1E2D45';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId.trim() || !sku.trim() || expectedQty < 1) return;
    setLoading(true);
    setError('');
    try {
      await onCreateUnit(unitId, route, returned, sku, expectedQty, variant, fnsku, orderId);
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create this unit workflow.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 slide-up"
        style={{ background: '#131822', border: '1px solid #2A3F60', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ borderBottom: '1px solid #1E2D45', paddingBottom: 16 }}>
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Package size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="font-poppins font-semibold text-blue-400 uppercase tracking-widest" style={{ fontSize: 10 }}>
                Operational Dispatch
              </p>
              <h3 className="font-heading font-black text-white" style={{ fontSize: 18 }}>
                Create New Unit Workflow
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: '#0D1117', border: '1px solid #1E2D45' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Unit ID / Serial Tag">
            <input
              type="text"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              style={inputStyle}
              onFocus={focus}
              onBlur={blur}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Catalog SKU">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
                required
              />
            </Field>
            <Field label="Expected Quantity">
              <input
                type="number"
                value={expectedQty}
                min="1"
                onChange={(e) => setExpectedQty(parseInt(e.target.value, 10) || 1)}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Variant">
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="Size/Color"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </Field>
            <Field label="FNSKU">
              <input
                type="text"
                value={fnsku}
                onChange={(e) => setFnsku(e.target.value)}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </Field>
            <Field label="Order ID">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Routing Pipeline">
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              >
                <option value="fba" style={{ background: '#131822' }}>FBA (Prep Manager Audit)</option>
                <option value="mfn" style={{ background: '#131822' }}>MFN (Pack Overhead Cam)</option>
              </select>
            </Field>
            <Field label="Returned Status">
              <select
                value={returned ? 'yes' : 'no'}
                onChange={(e) => setReturned(e.target.value === 'yes')}
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              >
                <option value="no" style={{ background: '#131822' }}>No Return (Standard)</option>
                <option value="yes" style={{ background: '#131822' }}>Returned (Triggers Claims)</option>
              </select>
            </Field>
          </div>

          {error && (
            <p className="font-poppins text-red-400" style={{ fontSize: 12 }}>{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid #1E2D45' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !sku.trim() || expectedQty < 1}
              className="btn btn-primary"
            >
              <Play size={13} />
              {loading ? 'Creating…' : 'Start Inspection Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
