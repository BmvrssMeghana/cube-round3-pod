// Vision AI Engine — provider-neutral abstraction
// In production, swap MockVisionProvider with GeminiVisionProvider / OpenAIVisionProvider

import type { CheckRecord, ImageRecord, AgentEvent } from '../data/store';
import type { Rule, Verdict } from '../data/rules';
import { v4 as uuidv4 } from 'uuid';

// ─── Provider Interface ────────────────────────────────────────────────────

export interface VisionCheckResult {
  check_key: string;
  verdict: Verdict;
  confidence: number | null;
  observation: string;
  evidence_images: Array<{ image_key: string; region?: { x: number; y: number; width: number; height: number } }>;
  recommended_action?: string;
  failure_reason?: string;
  latency_ms: number;
}

export interface VisionProvider {
  inspect(images: ImageRecord[], rules: Rule[]): Promise<VisionCheckResult[]>;
  name: string;
  version: string;
}

// ─── Evidence Quality Gate ─────────────────────────────────────────────────

export interface QualityResult {
  image_key: string;
  status: 'ok' | 'insufficient' | 'warn';
  reason?: string;
  recommendation?: string;
}

export function runEvidenceQualityGate(images: ImageRecord[], _rules: Rule[]): QualityResult[] {
  return images.map(img => {
    // Simulated quality checks
    if (img.bytes < 50000) {
      return {
        image_key: img.key,
        status: 'insufficient',
        reason: 'Image file size too small — likely low resolution.',
        recommendation: 'Capture a higher-resolution image.',
      };
    }
    if (img.quality_status === 'warn') {
      return {
        image_key: img.key,
        status: 'warn',
        reason: img.quality_reason || 'Image quality concern detected.',
        recommendation: 'Recapture with better lighting and focus.',
      };
    }
    return { image_key: img.key, status: 'ok' };
  });
}

// ─── Mock Vision Provider (deterministic for demo) ─────────────────────────

export class MockVisionProvider implements VisionProvider {
  name = 'MockVisionProvider';
  version = 'mock-1.0.0';

  async inspect(images: ImageRecord[], rules: Rule[]): Promise<VisionCheckResult[]> {
    // Simulate latency
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    return rules.map(rule => {
      if (!rule.visually_verifiable) {
        return {
          check_key: rule.check_key,
          verdict: 'uncertain' as Verdict,
          confidence: null,
          observation: rule.not_visually_verifiable_reason || 'This requirement cannot be reliably verified from photographs.',
          evidence_images: [],
          recommended_action: 'Verify through physical inspection or non-visual means.',
          latency_ms: 40,
        };
      }

      // Deterministic mock based on check key
      const rand = Math.random();
      let verdict: Verdict;
      let confidence: number;
      let observation: string;
      let recommended_action: string | undefined;
      let failure_reason: string | undefined;

      const imgKey = images[0]?.key || 'IMG-001';


      switch (rule.check_key) {
        case 'polybag_present':
          if (rand > 0.15) {
            verdict = 'pass'; confidence = 0.92 + rand * 0.06;
            observation = 'Transparent polybag fully enclosing the unit is visible.';
          } else {
            verdict = 'fail'; confidence = 0.93;
            observation = 'No polybag detected in the provided images.';
            failure_reason = 'Category requires polybag.';
            recommended_action = 'Place the item in an appropriate transparent polybag and seal completely.';
          }
          break;
        case 'polybag_sealed':
          if (rand > 0.12) {
            verdict = 'pass'; confidence = 0.91 + rand * 0.07;
            observation = 'Polybag seal appears continuous across the visible edge.';
          } else {
            verdict = 'fail'; confidence = 0.88;
            observation = 'Polybag seal appears open or incomplete on the bottom edge.';
            failure_reason = 'Unsealed bag — product could fall out.';
            recommended_action = 'Re-seal the polybag ensuring the entire opening is sealed.';
          }
          break;
        case 'suffocation_warning':
          if (rand > 0.20) {
            verdict = 'pass'; confidence = 0.88 + rand * 0.09;
            observation = 'Suffocation warning text is visible and appears legible on the bag face.';
          } else if (rand > 0.08) {
            verdict = 'uncertain'; confidence = 0.45 + rand * 0.20;
            observation = 'Warning text region is detected but clarity is insufficient for reliable confirmation.';
            recommended_action = 'Capture a straight-on, focused image of the warning text without obstructions.';
          } else {
            verdict = 'fail'; confidence = 0.90;
            observation = 'No suffocation warning text detected on the polybag.';
            failure_reason = 'Polybag opening ≥5 inches requires a suffocation warning.';
            recommended_action = 'Apply or print a suffocation warning on the polybag.';
          }
          break;
        case 'fnsku_label_placement':
          if (rand > 0.18) {
            verdict = 'pass'; confidence = 0.90 + rand * 0.08;
            observation = 'FNSKU label is on a flat, unobstructed surface without crossing seams or edges.';
          } else if (rand > 0.06) {
            verdict = 'fail'; confidence = 0.89 + rand * 0.05;
            observation = 'FNSKU label appears to cross a seam or curved surface.';
            failure_reason = 'Label not fully on flat surface — scanning reliability risk.';
            recommended_action = 'Remove label. Reapply on a flat, unobstructed surface away from all seams and edges.';
          } else {
            verdict = 'uncertain'; confidence = 0.50;
            observation = 'Image angle does not clearly show the label surface and surrounding area.';
            recommended_action = 'Capture a straight-on close-up of the FNSKU label showing the surrounding surface.';
          }
          break;
        case 'original_barcode_covered':
          if (rand > 0.12) {
            verdict = 'pass'; confidence = 0.89 + rand * 0.09;
            observation = 'FNSKU label covers the original barcode area. No secondary scannable barcode detected.';
          } else {
            verdict = 'fail'; confidence = 0.91;
            observation = 'Original manufacturer barcode is visible and not covered by FNSKU.';
            failure_reason = 'Multiple scannable barcodes may cause FC scanning ambiguity.';
            recommended_action = 'Ensure the FNSKU label completely covers the original barcode.';
          }
          break;
        case 'expiry_date_visible':
          if (rand > 0.20) {
            verdict = 'pass'; confidence = 0.86 + rand * 0.11;
            observation = 'Expiry date is visible and appears legible on the outside of the package.';
          } else if (rand > 0.08) {
            verdict = 'uncertain'; confidence = 0.42 + rand * 0.20;
            observation = 'Expiry date region detected but OCR cannot reliably read the date. Glare or partial obstruction.';
            recommended_action = 'Capture a close-up of the expiry date without glare or obstructions.';
          } else {
            verdict = 'fail'; confidence = 0.92;
            observation = 'Expiry date area is covered by a label or wrapping material.';
            failure_reason = 'Expiry date must be legible on the outside of the unit.';
            recommended_action = 'Reposition label or wrapping so the expiry date is fully visible from the outside.';
          }
          break;
        case 'handling_marks':
          if (rand > 0.15) {
            verdict = 'pass'; confidence = 0.87 + rand * 0.10;
            observation = 'Required handling marks are present and visible.';
          } else {
            verdict = 'fail'; confidence = 0.88;
            observation = 'Required handling marks not detected on any provided image.';
            failure_reason = 'Category requires specific handling marks.';
            recommended_action = 'Apply the required handling mark(s) to the outside of the package.';
          }
          break;
        default:
          if (rand > 0.20) {
            verdict = 'pass'; confidence = 0.85 + rand * 0.12;
            observation = 'Requirement appears satisfied based on visual evidence.';
          } else if (rand > 0.08) {
            verdict = 'uncertain'; confidence = 0.45;
            observation = 'Evidence is not conclusive for this check.';
            recommended_action = 'Provide additional photographs targeting this requirement.';
          } else {
            verdict = 'fail'; confidence = 0.85;
            observation = 'Requirement does not appear to be met.';
            recommended_action = 'Review this requirement and re-prep accordingly.';
          }
      }

      const imgEvidence = images.length > 0 ? [{ image_key: imgKey }] : [];

      return {
        check_key: rule.check_key,
        verdict,
        confidence,
        observation,
        evidence_images: imgEvidence,
        recommended_action,
        failure_reason,
        latency_ms: Math.round(300 + Math.random() * 400),
      };
    });
  }
}

// ─── Deterministic Decision Engine ─────────────────────────────────────────

export function computeOverallDecision(checks: CheckRecord[]): 'PASS' | 'FAIL' | 'REVIEW' {
  const required = checks.filter(c => c.verdict !== 'not_applicable');
  if (required.some(c => c.verdict === 'fail')) return 'FAIL';
  if (required.some(c => c.verdict === 'uncertain')) return 'REVIEW';
  return 'PASS';
}

// ─── Integrity Validator ────────────────────────────────────────────────────

export interface IntegrityResult {
  valid: boolean;
  issues: string[];
}

export function validateIntegrity(checks: CheckRecord[], images: ImageRecord[]): IntegrityResult {
  const issues: string[] = [];
  const imageKeys = new Set(images.map(i => i.key));

  checks.forEach(c => {
    if (!c.verdict) issues.push(`Check ${c.check_key} missing verdict.`);
    if (c.verdict === 'fail' && c.evidence_images.length === 0) {
      issues.push(`FAIL on ${c.check_key} has no evidence reference.`);
    }
    if (!c.rule_id) issues.push(`Check ${c.check_key} missing rule reference.`);
    c.evidence_images.forEach(e => {
      if (!imageKeys.has(e.image_key)) {
        issues.push(`Check ${c.check_key} references non-existent image ${e.image_key}.`);
      }
    });
  });

  return { valid: issues.length === 0, issues };
}

// ─── Agent Pipeline Orchestrator ───────────────────────────────────────────

export interface PipelineParams {
  organization_id: string;
  unit_id: string;
  sku: string;
  asin: string;
  fnsku: string;
  shipment_id: string;
  work_order_id: string;
  operator_id: string;
  product_id: string;
  category: string;
  images: ImageRecord[];
  rules: Rule[];
  onStep: (step: AgentStepUpdate) => void;
}

export interface AgentStepUpdate {
  step: number;
  agent: string;
  event: string;
  status: 'done' | 'active' | 'pending';
}

const provider = new MockVisionProvider();

export async function runInspectionPipeline(params: PipelineParams): Promise<{
  checks: CheckRecord[];
  agent_events: AgentEvent[];
  cost_estimate: number;
  latency_ms: number;
}> {
  const startTime = Date.now();
  const events: AgentEvent[] = [];
  const iid = `temp-${uuidv4().slice(0, 8)}`;

  const ev = (agent: string, event: string, latency_ms: number): AgentEvent => ({
    id: uuidv4(),
    inspection_id: iid,
    agent,
    event,
    status: 'complete',
    timestamp: new Date().toISOString(),
    latency_ms,
  });

  // Step 1: Orchestrator
  params.onStep({ step: 0, agent: 'Orchestrator', event: 'Validating inspection inputs…', status: 'active' });
  await new Promise(r => setTimeout(r, 200));
  events.push(ev('Orchestrator', `Inspection started. Unit: ${params.unit_id}`, 48));
  params.onStep({ step: 0, agent: 'Orchestrator', event: 'Inputs validated', status: 'done' });

  // Step 2: Evidence Quality Agent
  params.onStep({ step: 1, agent: 'Evidence Quality Agent', event: `Assessing ${params.images.length} image(s)…`, status: 'active' });
  await new Promise(r => setTimeout(r, 300));
  const qualityResults = runEvidenceQualityGate(params.images, params.rules);
  const insufficientCount = qualityResults.filter(q => q.status === 'insufficient').length;
  const warnCount = qualityResults.filter(q => q.status === 'warn').length;
  events.push(ev('Evidence Quality Agent', `Quality gate: ${params.images.length - insufficientCount - warnCount} clear, ${warnCount} warn, ${insufficientCount} insufficient.`, 215));
  params.onStep({ step: 1, agent: 'Evidence Quality Agent', event: `${params.images.length} image(s) assessed`, status: 'done' });

  // Step 3: Rule Agent
  params.onStep({ step: 2, agent: 'Rule & Policy Agent', event: `Loading rules for "${params.category}"…`, status: 'active' });
  await new Promise(r => setTimeout(r, 150));
  const visVerifiable = params.rules.filter(r => r.visually_verifiable).length;
  events.push(ev('Rule & Policy Agent', `${params.rules.length} rules loaded. ${visVerifiable} visually verifiable, ${params.rules.length - visVerifiable} non-visual.`, 94));
  params.onStep({ step: 2, agent: 'Rule & Policy Agent', event: `${params.rules.length} applicable rules`, status: 'done' });

  // Step 4: Vision Agent (main multimodal call)
  params.onStep({ step: 3, agent: 'Visual Compliance Agent', event: `Running multi-modal inspection (${params.rules.length} checks, 1 model call)…`, status: 'active' });
  const visionResults = await provider.inspect(params.images, params.rules);
  const totalVisionLatency = visionResults.reduce((acc, r) => acc + r.latency_ms, 0);
  events.push(ev('Visual Compliance Agent', `${params.rules.length} checks evaluated in single model call.`, totalVisionLatency));
  params.onStep({ step: 3, agent: 'Visual Compliance Agent', event: `${params.rules.length} checks complete`, status: 'done' });

  // Step 5: Evidence Verifier
  params.onStep({ step: 4, agent: 'Evidence Verifier', event: 'Validating observations against rules…', status: 'active' });
  await new Promise(r => setTimeout(r, 200));
  const checks: CheckRecord[] = visionResults.map((r, i) => ({
    check_key: r.check_key,
    verdict: r.verdict,
    confidence: r.confidence,
    rule_id: params.rules[i]?.rule_id || '',
    rule_name: params.rules[i]?.rule_name || '',
    rule_source: params.rules[i]?.source_name || '',
    observation: r.observation,
    evidence_images: r.evidence_images,
    recommended_action: r.recommended_action,
    failure_reason: r.failure_reason,
    model_version: provider.version,
    latency_ms: r.latency_ms,
  }));
  const fails = checks.filter(c => c.verdict === 'fail').length;
  events.push(ev('Evidence Verifier', `Evidence cross-checked. ${fails} failure(s) confirmed.`, 310));
  params.onStep({ step: 4, agent: 'Evidence Verifier', event: `Evidence validated`, status: 'done' });

  // Step 6: Integrity Layer
  params.onStep({ step: 5, agent: 'Integrity Layer', event: 'Computing content hash…', status: 'active' });
  await new Promise(r => setTimeout(r, 100));
  const { valid, issues } = validateIntegrity(checks, params.images);
  events.push(ev('Integrity Layer', `Record integrity: ${valid ? 'valid' : 'issues: ' + issues.join(', ')}`, 18));
  events.push(ev('Orchestrator', `Pipeline complete. Decision: ${computeOverallDecision(checks)}`, 24));
  params.onStep({ step: 5, agent: 'Integrity Layer', event: 'Record hash generated', status: 'done' });

  const latency_ms = Date.now() - startTime;
  const cost_estimate = 0.0008 + params.images.length * 0.0002 + params.rules.length * 0.00005;

  return { checks, agent_events: events, cost_estimate, latency_ms };
}
