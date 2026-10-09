import React, { useState } from 'react';
import { store } from '../data/store';
import type { CheckRecord } from '../data/store';
import { CHECK_KEY_LABELS } from '../data/rules';
import {
  CheckCircle, XCircle, AlertCircle, ChevronLeft, RefreshCw, Info,
  Image as ImageIcon, Shield, Clock, Hash, Eye
} from 'lucide-react';
import VerdictBadge from '../components/VerdictBadge';
import { format } from 'date-fns';

interface InspectionDetailProps {
  inspectionId: string;
  org: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function CheckCard({ check }: { check: CheckRecord }) {
  const [expanded, setExpanded] = useState(false);
  const borderCls = check.verdict === 'pass' ? 'border-brand-secondary/40' : check.verdict === 'fail' ? 'border-brand-crimson/40' : 'border-brand-orange/40';

  return (
    <div className={`p-4 rounded-xl bg-brand-surface border ${borderCls} space-y-3 mb-3`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-syne font-bold text-sm text-white">{CHECK_KEY_LABELS[check.check_key] || check.check_key}</div>
          <div className="font-syne text-[10px] text-brand-muted mt-0.5">{check.rule_id}</div>
        </div>
        <VerdictBadge verdict={check.verdict} />
      </div>

      <div className="text-xs text-slate-200 leading-relaxed font-poppins">{check.observation}</div>

      <div className="flex flex-wrap items-center gap-4 font-syne text-[11px] text-brand-muted pt-1 border-t border-brand-border/40">
        {check.confidence !== null && (
          <div className="flex items-center gap-1">
            <Shield size={11} className="text-brand-yellow" />
            <span>Confidence: <strong className="text-white">{Math.round((check.confidence || 0) * 100)}%</strong></span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Info size={11} />
          <span>Rule: <strong className="text-slate-200">{check.rule_name}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={11} />
          <span>Latency: <strong className="text-slate-200">{check.latency_ms}ms</strong></span>
        </div>
      </div>

      {check.confidence !== null && (
        <div className="w-full bg-black h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full ${check.verdict === 'pass' ? 'bg-brand-secondary' : check.verdict === 'fail' ? 'bg-brand-crimson' : 'bg-brand-orange'}`}
            style={{ width: `${Math.round((check.confidence || 0) * 100)}%` }}
          />
        </div>
      )}

      {(check.recommended_action || check.failure_reason) && (
        <div className={`p-3 rounded-lg text-xs font-syne ${check.verdict === 'fail' ? 'bg-brand-crimson/10 border border-brand-crimson/30 text-brand-crimson' : 'bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow'}`}>
          {check.failure_reason && <div><strong>Failure reason:</strong> {check.failure_reason}</div>}
          {check.recommended_action && <div><strong>Recommended action:</strong> {check.recommended_action}</div>}
        </div>
      )}

      {check.evidence_images.length > 0 && check.evidence_images[0].region && (
        <div className="pt-2">
          <button
            className="flex items-center gap-1 font-syne text-[11px] text-brand-yellow hover:underline"
            onClick={() => setExpanded(e => !e)}
          >
            <Eye size={12} /> {expanded ? 'Hide' : 'Show'} evidence region
          </button>
          {expanded && (
            <div className="mt-2 p-3 rounded-lg bg-black/60 border border-brand-border font-syne text-[11px] text-brand-muted space-y-1">
              {check.evidence_images.map(e => (
                <div key={e.image_key}>
                  <strong className="text-white">{e.image_key}</strong>
                  {e.region && ` — Region: x=${e.region.x} y=${e.region.y} w=${e.region.width} h=${e.region.height}`}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InspectionDetail({ inspectionId, org, onNavigate }: InspectionDetailProps) {
  const [activeTab, setActiveTab] = useState<'checks' | 'trace' | 'activity' | 'record'>('checks');
  const insp = store.get(inspectionId);

  if (!insp || insp.organization_id !== org) {
    return (
      <div className="p-8 text-center bg-brand-card border border-brand-border rounded-2xl font-syne text-sm text-brand-muted space-y-4">
        <h3 className="font-syne text-xl text-white">Inspection not found.</h3>
        <p>This inspection may belong to a different organization or does not exist.</p>
        <button className="pill-btn px-4 py-2 rounded-full bg-brand-yellow text-black font-bold text-xs" onClick={() => onNavigate('history')}>
          Back to History
        </button>
      </div>
    );
  }

  const failedChecks = insp.checks.filter(c => c.verdict === 'fail');
  const uncertainChecks = insp.checks.filter(c => c.verdict === 'uncertain');
  const passedChecks = insp.checks.filter(c => c.verdict === 'pass');

  const resultBannerStyle = insp.overall_status === 'PASS' ? 'bg-brand-secondary/15 border-brand-secondary/30 text-brand-secondary' : insp.overall_status === 'FAIL' ? 'bg-brand-crimson/15 border-brand-crimson/30 text-brand-crimson' : 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange';
  const ResultIcon = insp.overall_status === 'PASS' ? CheckCircle : insp.overall_status === 'FAIL' ? XCircle : AlertCircle;

  return (
    <div className="space-y-6 font-poppins">
      <button className="flex items-center gap-1 font-syne text-xs text-brand-yellow hover:underline" onClick={() => onNavigate('history')}>
        <ChevronLeft size={14} /> Back to History
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div>
          <h2 className="font-syne font-extrabold text-2xl text-white">
            {insp.record_id} <span className="font-syne text-sm text-brand-muted ml-2">{insp.unit_id}</span>
          </h2>
          <div className="font-syne text-xs text-brand-muted mt-1">
            {insp.sku} &nbsp;·&nbsp; {insp.asin} &nbsp;·&nbsp; {format(new Date(insp.created_at), 'MMM d, yyyy HH:mm')} UTC
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-brand-surface border border-brand-border font-syne text-xs text-brand-yellow font-bold">
            {insp.prep_risk} RISK
          </span>
          <button className="pill-btn px-4 py-2 rounded-full bg-brand-yellow text-black font-bold text-xs" onClick={() => onNavigate('new-inspection')}>
            <RefreshCw size={13} className="inline mr-1" /> Reinspect
          </button>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`p-5 rounded-2xl border ${resultBannerStyle} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <ResultIcon size={32} />
          <div>
            <div className="font-syne text-[10px] uppercase tracking-wider font-bold">PREP STATUS</div>
            <div className="font-syne font-extrabold text-2xl uppercase">{insp.overall_status}</div>
          </div>
        </div>
        <div className="font-syne text-xs text-right">
          {passedChecks.length} passed &nbsp;/&nbsp; {failedChecks.length} failed &nbsp;/&nbsp; {uncertainChecks.length} uncertain
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-border pb-3 font-syne text-xs">
        {['checks', 'trace', 'activity', 'record'].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-full font-bold uppercase transition-all ${activeTab === t ? 'bg-brand-yellow text-black' : 'text-brand-muted hover:text-white bg-brand-card'}`}
            onClick={() => setActiveTab(t as any)}
          >
            {t === 'checks' ? `Check Results (${insp.checks.length})` : t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'checks' && (
        <div className="space-y-3">
          {failedChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
          {uncertainChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
          {passedChecks.map(c => <CheckCard key={c.check_key} check={c} />)}
        </div>
      )}
    </div>
  );
}
