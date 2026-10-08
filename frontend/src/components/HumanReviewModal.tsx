import React, { useState } from 'react';
import { VerdictType } from '../types';

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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Human Review & Audit Override</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Unit: <strong>{unitId}</strong> | Evidence Record: <code>{recordId}</code>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Reviewer / Inspector Name:
            </label>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: '#fff' }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              New Verdict:
            </label>
            <select
              value={newVerdict}
              onChange={(e) => setNewVerdict(e.target.value as VerdictType)}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: '#fff' }}
            >
              <option value="PASS">PASS (Approve Compliance)</option>
              <option value="FAIL">FAIL (Mark Defect / Reject)</option>
              <option value="UNCERTAIN">UNCERTAIN (Escalate for Reinspection)</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Justification & Audit Log Note:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the visual or policy reason for overriding the AI evidence verdict..."
              style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: '#fff' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Log Override & Update Passport</button>
          </div>
        </form>
      </div>
    </div>
  );
};
