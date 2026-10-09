import React, { useState } from 'react';
import type { VerdictType } from '../types';
import { X, Shield } from 'lucide-react';

interface HumanReviewModalProps {
  unitId: string;
  recordId: string;
  onClose: () => void;
  onSubmitOverride: (recordId: string, newVerdict: VerdictType, actor: string, reason: string) => void;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({ unitId, recordId, onClose, onSubmitOverride }) => {
  const [actor, setActor] = useState('OpsLead_Inspector');
  const [newVerdict, setNewVerdict] = useState<VerdictType>('PASS');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor.trim() || !reason.trim()) {
      alert('Actor name and override reason are required.');
      return;
    }
    onSubmitOverride(recordId, newVerdict, actor, reason);
    onClose();
  };

  const verdictColors: Record<string, string> = {
    PASS: '#22C55E',
    FAIL: '#EF4444',
    UNCERTAIN: '#F59E0B',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 slide-up"
        style={{ background: '#131822', border: '1px solid #2A3F60', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ borderBottom: '1px solid #1E2D45', paddingBottom: 16 }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Shield size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="font-poppins font-semibold text-blue-400 uppercase tracking-widest" style={{ fontSize: 10 }}>
                Supervisor Override
              </p>
              <h3 className="font-heading font-black text-white" style={{ fontSize: 18 }}>
                Human Review & Audit Override
              </h3>
              <p className="font-poppins text-slate-500 mt-0.5" style={{ fontSize: 11 }}>
                Unit: <span className="text-blue-300">{unitId}</span> · Record: <span className="text-blue-300">{recordId}</span>
              </p>
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
          <div>
            <label className="block font-poppins font-semibold text-slate-400 mb-1.5" style={{ fontSize: 11 }}>
              Reviewer / Inspector Name
            </label>
            <input
              type="text"
              className="input-field"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-poppins font-semibold text-slate-400 mb-1.5" style={{ fontSize: 11 }}>
              Supervisor Verdict
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['PASS', 'FAIL', 'UNCERTAIN'] as VerdictType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewVerdict(v)}
                  className="py-2.5 px-3 rounded-lg font-poppins font-semibold transition-all"
                  style={{
                    fontSize: 12,
                    background: newVerdict === v ? `${verdictColors[v]}15` : '#0D1117',
                    color: newVerdict === v ? verdictColors[v] : '#475569',
                    border: `1px solid ${newVerdict === v ? verdictColors[v] + '40' : '#1E2D45'}`,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-poppins font-semibold text-slate-400 mb-1.5" style={{ fontSize: 11 }}>
              Audit Log Justification <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              className="input-field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the visual or policy reason for overriding the AI evidence verdict..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid #1E2D45' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              <Shield size={14} />
              Log Cryptographic Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
