import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { encodeCapture } from './captureEncoding';
import { getSampleCapture, getAllSampleCaptures } from '../data/sampleCaptures';

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

  const handleAttachAllSamplePhotos = () => {
    setError('');
    const sampleItems = getAllSampleCaptures(requiredShots);
    onChange(sampleItems.map((item) => ({
      shot: item.shot,
      filename: item.filename,
      content_base64: item.content_base64,
    })));
  };

  return (
    <section className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="font-syne font-extrabold text-xs uppercase tracking-wider text-[var(--text-primary)]">
            Required Evidence Captures ({value.length} / {requiredShots.length})
          </h4>
          <p className="text-[11px] font-poppins text-brand-muted mt-0.5">
            Real warehouse inspection shots for agent evaluation. Evidence records hash each capture into the immutable ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAttachAllSamplePhotos}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-poppins font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-1.5"
        >
          ⚡ Attach All Sample Photos ({requiredShots.length})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requiredShots.map((shot) => {
          const captured = value.find((item) => item.shot === shot);
          const sampleItem = getSampleCapture(shot);

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

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept={accept}
                  className="block w-full text-[11px] font-poppins text-[var(--text-secondary)] file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void attach(shot, event.currentTarget.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
                {!captured && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sampleItem) {
                        onChange([...value.filter((item) => item.shot !== shot), {
                          shot,
                          filename: sampleItem.filename,
                          content_base64: sampleItem.content_base64,
                        }]);
                      }
                    }}
                    className="shrink-0 px-2.5 py-1 text-[10px] font-bold font-poppins rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                  >
                    + Sample Photo
                  </button>
                )}
              </div>

              {captured && (
                <div className="flex items-center gap-3 pt-1 border-t border-brand-border/60">
                  <img
                    src={captured.content_base64 ? `data:image/jpeg;base64,${captured.content_base64}` : (sampleItem?.url || '')}
                    alt={captured.shot}
                    className="w-12 h-12 object-cover rounded-lg border border-brand-border bg-black/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-emerald-400 truncate block">
                      {captured.filename}
                    </span>
                    <span className="text-[10px] text-brand-muted block">
                      Image attached & ready for vision evaluation
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] text-brand-crimson hover:underline font-bold uppercase shrink-0"
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
