import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { encodeCapture } from './captureEncoding';

export interface CaptureAttachment {
  shot: string;
  filename: string;
  content_base64: string;
}

interface CaptureChecklistProps {
  requiredShots: string[];
  value: CaptureAttachment[];
  onChange: (attachments: CaptureAttachment[]) => void;
  accept?: string;
}

export const CaptureChecklist: React.FC<CaptureChecklistProps> = ({
  requiredShots,
  value,
  onChange,
  accept = 'image/jpeg,image/png,image/webp',
}) => {
  const [error, setError] = useState('');

  const attach = async (shot: string, file?: File) => {
    setError('');
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(`${file.name} exceeds the 8 MB limit.`);
      return;
    }
    if (accept.startsWith('image/') && !file.type.startsWith('image/')) {
      setError('Choose an image file for this capture.');
      return;
    }
    try {
      const capture = await encodeCapture(file, shot);
      onChange([...value.filter((item) => item.shot !== shot), capture]);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Could not read the selected file.');
    }
  };

  return (
    <section className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
      <div>
        <h4 className="font-syne font-extrabold text-xs uppercase tracking-wider text-[var(--text-primary)]">
          Required Evidence Captures ({value.length} / {requiredShots.length})
        </h4>
        <p className="text-[11px] font-poppins text-brand-muted mt-0.5">
          Upload clear, unobstructed files for each view. Evidence records hash these files to form the audit chain.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requiredShots.map((shot) => {
          const captured = value.find((item) => item.shot === shot);
          return (
            <div
              key={shot}
              className={`p-3 rounded-xl border text-xs font-poppins space-y-2 transition-all ${
                captured
                  ? 'bg-brand-card border-brand-yellow/50'
                  : 'bg-brand-card border-brand-border'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                <span>{shot}</span>
                {captured ? (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">✓ Attached</span>
                ) : (
                  <span className="text-[10px] text-brand-orange font-bold uppercase">Required</span>
                )}
              </div>

              <input
                type="file"
                accept={accept}
                className="block w-full text-[11px] font-poppins text-[var(--text-secondary)] file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-brand-yellow file:text-black hover:file:bg-white cursor-pointer"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  void attach(shot, event.currentTarget.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />

              {captured && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-400 truncate max-w-[150px]">
                    {captured.filename}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-brand-crimson hover:underline font-bold uppercase"
                    onClick={() => onChange(value.filter((item) => item.shot !== shot))}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="font-poppins text-xs text-brand-crimson">{error}</p>}
    </section>
  );
};
