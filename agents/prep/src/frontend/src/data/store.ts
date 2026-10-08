// ─── Inspection Store (in-memory for demo) ───────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import type { Verdict, OverallDecision } from './rules';
import { CHECK_KEY_LABELS } from './rules';

export interface ImageRecord {
  key: string;
  sha256: string;
  bytes: number;
  taken_at: string;
  angle: string;
  quality_status: 'ok' | 'insufficient' | 'warn';
  quality_reason?: string;
  url: string; // object URL or data URL
}

export interface CheckRecord {
  check_key: string;
  verdict: Verdict;
  confidence: number | null;
  rule_id: string;
  rule_name: string;
  rule_source: string;
  observation: string;
  evidence_images: Array<{ image_key: string; region?: { x: number; y: number; width: number; height: number } }>;
  recommended_action?: string;
  failure_reason?: string;
  model_version: string;
  latency_ms: number;
}

export interface AgentEvent {
  id: string;
  inspection_id: string;
  agent: string;
  event: string;
  status: 'complete' | 'running' | 'error';
  timestamp: string;
  latency_ms: number;
  metadata?: Record<string, unknown>;
}

export interface Override {
  check_key: string;
  from_verdict: Verdict;
  to_verdict: Verdict;
  reason: string;
  by: string;
  at: string;
}

export interface Inspection {
  id: string;
  record_id: string;
  schema_version: string;
  organization_id: string;
  client_id: string | null;
  agent: 'prep';
  unit_id: string;
  product_id: string;
  sku: string;
  asin: string;
  fnsku: string;
  shipment_id: string;
  work_order_id: string;
  operator_id: string;
  created_at: string;
  overall_status: OverallDecision;
  checks: CheckRecord[];
  images: ImageRecord[];
  agent_events: AgentEvent[];
  overrides: Override[];
  cost_estimate: number;
  latency_ms: number;
  content_hash: string;
  status: 'complete' | 'pending' | 'failed';
  is_fixture: boolean;
  fixture_label?: string;
  prep_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  reinspection_of?: string; // parent inspection ID
}

// ─── Demo Fixtures ─────────────────────────────────────────────────────────

function makeEvent(inspection_id: string, agent: string, event: string, ts: string, latency_ms: number): AgentEvent {
  return { id: uuidv4(), inspection_id, agent, event, status: 'complete', timestamp: ts, latency_ms };
}

function computeHash(data: string): string {
  // Simple djb2 for demo (real: SHA-256)
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return hex.repeat(8); // 64 hex chars
}

function computeOverall(checks: CheckRecord[]): OverallDecision {
  const required = checks.filter(c => c.verdict !== 'not_applicable');
  if (required.some(c => c.verdict === 'fail')) return 'FAIL';
  if (required.some(c => c.verdict === 'uncertain')) return 'REVIEW';
  return 'PASS';
}

function computeRisk(_checks: CheckRecord[], overall: OverallDecision): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (overall === 'FAIL') return 'HIGH';
  if (overall === 'REVIEW') return 'MEDIUM';
  return 'LOW';
}



const FIXTURE_INSPECTIONS: Inspection[] = [
  // 1. Fully compliant unit
  {
    id: 'insp-fixture-001',
    record_id: 'PRP-DEMO-001',
    schema_version: '1.1',
    organization_id: 'org_demo_alpha',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0071',
    product_id: 'prod-005',
    sku: 'SKU-CABLE-USBC',
    asin: 'B0DUMMY261',
    fnsku: 'X00DUMMY071',
    shipment_id: 'FBA-DUMMY-107',
    work_order_id: 'WO-3014',
    operator_id: 'op_eli',
    created_at: '2026-06-07T07:03:00Z',
    overall_status: 'PASS',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 1 — Fully compliant unit',
    prep_risk: 'LOW',
    cost_estimate: 0.0012,
    latency_ms: 2840,
    content_hash: computeHash('insp-fixture-001'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'a1b2c3d4', bytes: 204800, taken_at: '2026-06-07T07:02:00Z', angle: 'front', quality_status: 'ok', url: '' },
      { key: 'IMG-002', sha256: 'e5f6a7b8', bytes: 198400, taken_at: '2026-06-07T07:02:15Z', angle: 'label', quality_status: 'ok', url: '' },
      { key: 'IMG-003', sha256: 'c9d0e1f2', bytes: 215040, taken_at: '2026-06-07T07:02:30Z', angle: 'rear', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'pass', confidence: 0.98, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Transparent polybag fully enclosing the unit is visible in IMG-001.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 420 },
      { check_key: 'polybag_sealed', verdict: 'pass', confidence: 0.96, rule_id: 'POLY-SEAL-001', rule_name: 'Polybag Sealed', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Seal is continuously visible across the lower edge of the bag.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 380 },
      { check_key: 'polybag_thickness', verdict: 'uncertain', confidence: null, rule_id: 'POLY-THICKNESS-001', rule_name: 'Polybag Thickness', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Bag thickness cannot be determined from a photograph. Physical measurement required.', evidence_images: [], recommended_action: 'Physically measure bag thickness to confirm minimum 1.5 mil.', model_version: 'gemini-1.5-flash-002', latency_ms: 50 },
      { check_key: 'suffocation_warning', verdict: 'pass', confidence: 0.94, rule_id: 'WARN-001', rule_name: 'Suffocation Warning', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Suffocation warning text is visible on the front face of the polybag, fully legible.', evidence_images: [{ image_key: 'IMG-001', region: { x: 30, y: 180, width: 200, height: 40 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 510 },
      { check_key: 'fnsku_label_placement', verdict: 'pass', confidence: 0.97, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label appears on a flat, unobstructed surface without crossing seams or edges.', evidence_images: [{ image_key: 'IMG-002', region: { x: 80, y: 60, width: 180, height: 60 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 620 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.93, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label covers the original barcode area. No secondary scannable barcode visible.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 430 },
    ],
    agent_events: [],
  },

  // 2. FNSKU on seam — FAIL
  {
    id: 'insp-fixture-002',
    record_id: 'PRP-DEMO-002',
    schema_version: '1.1',
    organization_id: 'org_demo_alpha',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0002',
    product_id: 'prod-001',
    sku: 'SKU-CANDLE-3',
    asin: 'B0DUMMY964',
    fnsku: 'X00DUMMY002',
    shipment_id: 'FBA-DUMMY-100',
    work_order_id: 'WO-3000',
    operator_id: 'op_amira',
    created_at: '2026-06-04T12:25:00Z',
    overall_status: 'FAIL',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 2 — FNSKU label on seam',
    prep_risk: 'HIGH',
    cost_estimate: 0.0014,
    latency_ms: 3120,
    content_hash: computeHash('insp-fixture-002'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'fa1b2c3d', bytes: 210000, taken_at: '2026-06-04T12:24:00Z', angle: 'front', quality_status: 'ok', url: '' },
      { key: 'IMG-002', sha256: 'eb3c4d5e', bytes: 195000, taken_at: '2026-06-04T12:24:20Z', angle: 'label', quality_status: 'ok', url: '' },
      { key: 'IMG-003', sha256: 'dc5e6f7a', bytes: 220000, taken_at: '2026-06-04T12:24:40Z', angle: 'close-up', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'not_applicable', confidence: null, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Category "fragile" — this product uses bubble-wrap, not polybag.', evidence_images: [], model_version: 'gemini-1.5-flash-002', latency_ms: 80 },
      { check_key: 'fnsku_label_placement', verdict: 'fail', confidence: 0.94, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label crosses a vertical package seam. Label is not fully on a flat surface.', evidence_images: [{ image_key: 'IMG-003', region: { x: 420, y: 220, width: 190, height: 96 } }], failure_reason: 'Label placement across a seam can cause scanning failures at the FC.', recommended_action: 'Remove the existing FNSKU label. Reapply to a flat, unobstructed surface away from seams and curves.', model_version: 'gemini-1.5-flash-002', latency_ms: 710 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.91, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'Original barcode is covered. No secondary scannable barcode detected.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 380 },
      { check_key: 'handling_marks', verdict: 'pass', confidence: 0.89, rule_id: 'HANDLING-FRAGILE-001', rule_name: 'Fragile Handling Mark', rule_source: 'FBA Packaging & Prep Requirements', observation: 'FRAGILE label is visible on front face.', evidence_images: [{ image_key: 'IMG-001', region: { x: 50, y: 250, width: 120, height: 40 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 410 },
      { check_key: 'bubble_wrap_present', verdict: 'pass', confidence: 0.92, rule_id: 'BUBBLE-WRAP-001', rule_name: 'Bubble Wrap Protection', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Bubble wrap is present and covers all visible surfaces.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 360 },
    ],
    agent_events: [],
  },

  // 3. Blurry image — UNCERTAIN
  {
    id: 'insp-fixture-003',
    record_id: 'PRP-DEMO-003',
    schema_version: '1.1',
    organization_id: 'org_demo_alpha',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0050',
    product_id: 'prod-002',
    sku: 'SKU-PUZZLE-500',
    asin: 'B0DUMMY729',
    fnsku: 'X00DUMMY050',
    shipment_id: 'FBA-DUMMY-105',
    work_order_id: 'WO-3010',
    operator_id: 'op_dana',
    created_at: '2026-06-10T22:07:00Z',
    overall_status: 'REVIEW',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 3 — Blurry image / uncertain suffocation',
    prep_risk: 'MEDIUM',
    cost_estimate: 0.0011,
    latency_ms: 2540,
    content_hash: computeHash('insp-fixture-003'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'aa1b2c3d', bytes: 185000, taken_at: '2026-06-10T22:06:00Z', angle: 'front', quality_status: 'warn', quality_reason: 'Moderate blur detected — suffocation warning area may not be reliably assessed.', url: '' },
      { key: 'IMG-002', sha256: 'bb3c4d5e', bytes: 201000, taken_at: '2026-06-10T22:06:20Z', angle: 'label', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'pass', confidence: 0.95, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Polybag visible despite blur.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 390 },
      { check_key: 'polybag_sealed', verdict: 'pass', confidence: 0.88, rule_id: 'POLY-SEAL-001', rule_name: 'Polybag Sealed', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Seal appears continuous but partial blur reduces confidence.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 360 },
      { check_key: 'suffocation_warning', verdict: 'uncertain', confidence: 0.42, rule_id: 'WARN-001', rule_name: 'Suffocation Warning', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Blur in the warning area prevents reliable OCR. Text region is detected but not legible.', evidence_images: [{ image_key: 'IMG-001', region: { x: 20, y: 160, width: 190, height: 50 } }], recommended_action: 'Capture a focused, straight-on image of the suffocation warning without motion blur.', model_version: 'gemini-1.5-flash-002', latency_ms: 540 },
      { check_key: 'fnsku_label_placement', verdict: 'pass', confidence: 0.92, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label is flat and unobstructed on the clear label image.', evidence_images: [{ image_key: 'IMG-002', region: { x: 90, y: 70, width: 175, height: 55 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 570 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.90, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU covers original barcode.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 390 },
    ],
    agent_events: [],
  },

  // 4. Serum — expiry obscured — FAIL
  {
    id: 'insp-fixture-004',
    record_id: 'PRP-DEMO-004',
    schema_version: '1.1',
    organization_id: 'org_demo_alpha',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0049',
    product_id: 'prod-010',
    sku: 'SKU-SERUM-30',
    asin: 'B0DUMMY031',
    fnsku: 'X00DUMMY049',
    shipment_id: 'FBA-DUMMY-104',
    work_order_id: 'WO-3009',
    operator_id: 'op_amira',
    created_at: '2026-06-07T12:28:00Z',
    overall_status: 'FAIL',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 4 — Expiry obscured by label',
    prep_risk: 'HIGH',
    cost_estimate: 0.0016,
    latency_ms: 3410,
    content_hash: computeHash('insp-fixture-004'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'cc1b2c3d', bytes: 220000, taken_at: '2026-06-07T12:27:00Z', angle: 'front', quality_status: 'ok', url: '' },
      { key: 'IMG-002', sha256: 'dd3c4d5e', bytes: 205000, taken_at: '2026-06-07T12:27:20Z', angle: 'label', quality_status: 'ok', url: '' },
      { key: 'IMG-003', sha256: 'ee5e6f7a', bytes: 195000, taken_at: '2026-06-07T12:27:40Z', angle: 'rear', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'pass', confidence: 0.97, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Polybag present and visible.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 390 },
      { check_key: 'polybag_sealed', verdict: 'pass', confidence: 0.95, rule_id: 'POLY-SEAL-001', rule_name: 'Polybag Sealed', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Seal visible and continuous.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 350 },
      { check_key: 'suffocation_warning', verdict: 'uncertain', confidence: 0.55, rule_id: 'WARN-001', rule_name: 'Suffocation Warning', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Warning text region is visible but partially obscured by a fold in the bag. Full legibility cannot be confirmed.', evidence_images: [{ image_key: 'IMG-001', region: { x: 15, y: 200, width: 220, height: 48 } }], recommended_action: 'Smooth the bag fold and recapture the warning area straight-on.', model_version: 'gemini-1.5-flash-002', latency_ms: 580 },
      { check_key: 'fnsku_label_placement', verdict: 'pass', confidence: 0.96, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label is on a flat surface, not crossing seams.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 560 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.92, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU covers the original barcode.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 370 },
      { check_key: 'expiry_date_visible', verdict: 'fail', confidence: 0.91, rule_id: 'EXPIRY-001', rule_name: 'Expiry Date Visible', rule_source: 'FBA Expiration Dates Policy', observation: 'Expiry date area on the rear of the package is covered by the FNSKU label. Date is not readable from the outside.', evidence_images: [{ image_key: 'IMG-003', region: { x: 100, y: 310, width: 160, height: 36 } }], failure_reason: 'Expiry date is obscured — requirement: date must be legible on outside of package.', recommended_action: 'Reposition the FNSKU label so the expiry date is visible. Do not place labels over date codes.', model_version: 'gemini-1.5-flash-002', latency_ms: 620 },
      { check_key: 'handling_marks', verdict: 'pass', confidence: 0.88, rule_id: 'HANDLING-LIQUID-001', rule_name: 'Liquid / This Way Up Mark', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Orientation arrows visible on the top face.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 440 },
      { check_key: 'cap_seal', verdict: 'uncertain', confidence: 0.50, rule_id: 'CAP-SEAL-001', rule_name: 'Cap / Induction Seal', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Cap area is visible but partially wrapped. Induction seal presence cannot be confirmed.', evidence_images: [{ image_key: 'IMG-001' }], recommended_action: 'Capture a close-up of the cap area to confirm induction seal.', model_version: 'gemini-1.5-flash-002', latency_ms: 480 },
    ],
    agent_events: [],
  },

  // 5. Missing polybag
  {
    id: 'insp-fixture-005',
    record_id: 'PRP-DEMO-005',
    schema_version: '1.1',
    organization_id: 'org_demo_alpha',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0046',
    product_id: 'prod-009',
    sku: 'SKU-TOWEL-BLU',
    asin: 'B0DUMMY600',
    fnsku: 'X00DUMMY046',
    shipment_id: 'FBA-DUMMY-104',
    work_order_id: 'WO-3009',
    operator_id: 'op_dana',
    created_at: '2026-06-08T22:43:00Z',
    overall_status: 'FAIL',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 5 — Missing polybag (softlines)',
    prep_risk: 'HIGH',
    cost_estimate: 0.0013,
    latency_ms: 2790,
    content_hash: computeHash('insp-fixture-005'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'ff1b2c3d', bytes: 188000, taken_at: '2026-06-08T22:42:00Z', angle: 'front', quality_status: 'ok', url: '' },
      { key: 'IMG-002', sha256: 'gg3c4d5e', bytes: 196000, taken_at: '2026-06-08T22:42:20Z', angle: 'label', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'fail', confidence: 0.97, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'No polybag detected. The softlines product is not enclosed in any bag.', evidence_images: [{ image_key: 'IMG-001' }], failure_reason: 'Softlines category requires polybag.', recommended_action: 'Place the item in a transparent polybag (min 1.5 mil) with a suffocation warning, and seal completely.', model_version: 'gemini-1.5-flash-002', latency_ms: 460 },
      { check_key: 'polybag_sealed', verdict: 'not_applicable', confidence: null, rule_id: 'POLY-SEAL-001', rule_name: 'Polybag Sealed', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Cannot evaluate seal — no polybag present.', evidence_images: [], model_version: 'gemini-1.5-flash-002', latency_ms: 40 },
      { check_key: 'suffocation_warning', verdict: 'not_applicable', confidence: null, rule_id: 'WARN-001', rule_name: 'Suffocation Warning', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Cannot evaluate warning — no polybag present.', evidence_images: [], model_version: 'gemini-1.5-flash-002', latency_ms: 40 },
      { check_key: 'fnsku_label_placement', verdict: 'pass', confidence: 0.93, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU label is flat and properly placed on the product.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 540 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.91, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU covers original barcode.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 360 },
    ],
    agent_events: [],
  },

  // 6. Org Bravo — passing inspection
  {
    id: 'insp-fixture-006',
    record_id: 'PRP-DEMO-006',
    schema_version: '1.1',
    organization_id: 'org_demo_bravo',
    client_id: null,
    agent: 'prep',
    unit_id: 'UNIT-0039',
    product_id: 'prod-010',
    sku: 'SKU-SERUM-30',
    asin: 'B0DUMMY031',
    fnsku: 'X00DUMMY039',
    shipment_id: 'FBA-DUMMY-103',
    work_order_id: 'WO-3007',
    operator_id: 'op_chen',
    created_at: '2026-06-02T16:55:00Z',
    overall_status: 'PASS',
    status: 'complete',
    is_fixture: true,
    fixture_label: 'Scenario 6 — Fully compliant serum (Bravo)',
    prep_risk: 'LOW',
    cost_estimate: 0.0017,
    latency_ms: 3640,
    content_hash: computeHash('insp-fixture-006'),
    overrides: [],
    images: [
      { key: 'IMG-001', sha256: 'hh1b2c3d', bytes: 224000, taken_at: '2026-06-02T16:54:00Z', angle: 'front', quality_status: 'ok', url: '' },
      { key: 'IMG-002', sha256: 'ii3c4d5e', bytes: 198000, taken_at: '2026-06-02T16:54:20Z', angle: 'label', quality_status: 'ok', url: '' },
      { key: 'IMG-003', sha256: 'jj5e6f7a', bytes: 215000, taken_at: '2026-06-02T16:54:40Z', angle: 'rear', quality_status: 'ok', url: '' },
    ],
    checks: [
      { check_key: 'polybag_present', verdict: 'pass', confidence: 0.97, rule_id: 'POLY-PRESENT-001', rule_name: 'Polybag Present', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Polybag present and enclosing the unit fully.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 400 },
      { check_key: 'polybag_sealed', verdict: 'pass', confidence: 0.95, rule_id: 'POLY-SEAL-001', rule_name: 'Polybag Sealed', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Continuous heat seal visible.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 360 },
      { check_key: 'suffocation_warning', verdict: 'pass', confidence: 0.91, rule_id: 'WARN-001', rule_name: 'Suffocation Warning', rule_source: 'FBA Packaging & Prep Requirements', observation: 'Warning text clearly visible and legible.', evidence_images: [{ image_key: 'IMG-001', region: { x: 25, y: 185, width: 210, height: 45 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 520 },
      { check_key: 'fnsku_label_placement', verdict: 'pass', confidence: 0.96, rule_id: 'FNSKU-PLACEMENT-001', rule_name: 'FNSKU Label Placement', rule_source: 'FBA Labeling Requirements', observation: 'FNSKU flat on smooth surface.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 580 },
      { check_key: 'original_barcode_covered', verdict: 'pass', confidence: 0.93, rule_id: 'BARCODE-COVER-001', rule_name: 'Original Barcode Covered', rule_source: 'FBA Labeling Requirements', observation: 'Original barcode covered.', evidence_images: [{ image_key: 'IMG-002' }], model_version: 'gemini-1.5-flash-002', latency_ms: 370 },
      { check_key: 'expiry_date_visible', verdict: 'pass', confidence: 0.93, rule_id: 'EXPIRY-001', rule_name: 'Expiry Date Visible', rule_source: 'FBA Expiration Dates Policy', observation: 'Expiry date "06/2028" clearly legible on rear of package.', evidence_images: [{ image_key: 'IMG-003', region: { x: 110, y: 295, width: 140, height: 38 } }], model_version: 'gemini-1.5-flash-002', latency_ms: 640 },
      { check_key: 'handling_marks', verdict: 'pass', confidence: 0.88, rule_id: 'HANDLING-LIQUID-001', rule_name: 'Liquid / This Way Up Mark', rule_source: 'FBA Packaging & Prep Requirements', observation: '"This Way Up" arrows visible on top face.', evidence_images: [{ image_key: 'IMG-001' }], model_version: 'gemini-1.5-flash-002', latency_ms: 430 },
    ],
    agent_events: [],
  },
];

// Attach agent events to fixtures
FIXTURE_INSPECTIONS.forEach(insp => {
  const ts = (offset: number) => {
    const d = new Date(insp.created_at);
    d.setSeconds(d.getSeconds() + offset);
    return d.toISOString();
  };
  insp.agent_events = [
    makeEvent(insp.id, 'Orchestrator', `Inspection ${insp.record_id} started. Unit: ${insp.unit_id}`, ts(0), 48),
    makeEvent(insp.id, 'Orchestrator', `Input validation complete. ${insp.images.length} image(s) received.`, ts(0), 32),
    makeEvent(insp.id, 'Evidence Quality Agent', `Quality assessment complete. ${insp.images.filter(i => i.quality_status === 'ok').length}/${insp.images.length} image(s) cleared.`, ts(1), 215),
    makeEvent(insp.id, 'Rule & Policy Agent', `Rule set loaded for category. ${insp.checks.length} applicable checks determined.`, ts(1), 94),
    makeEvent(insp.id, 'Visual Compliance Agent', `Multi-modal inspection complete. ${insp.checks.length} checks evaluated in one pass.`, ts(2), insp.latency_ms - 400),
    makeEvent(insp.id, 'Evidence Verifier', `Evidence validation complete. Observations cross-checked against rules.`, ts(3), 310),
    makeEvent(insp.id, 'Integrity Layer', `Record integrity validated. Content hash generated: ${insp.content_hash.slice(0, 16)}…`, ts(3), 18),
    makeEvent(insp.id, 'Orchestrator', `Inspection complete. Overall decision: ${insp.overall_status}`, ts(3), 24),
  ];
});

// ─── In-memory store ─────────────────────────────────────────────────────────
class InspectionStore {
  private inspections: Map<string, Inspection> = new Map();

  constructor() {
    FIXTURE_INSPECTIONS.forEach(i => this.inspections.set(i.id, i));
  }

  getAll(org_id: string): Inspection[] {
    return Array.from(this.inspections.values())
      .filter(i => i.organization_id === org_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  get(id: string): Inspection | undefined {
    return this.inspections.get(id);
  }

  add(inspection: Inspection): void {
    this.inspections.set(inspection.id, inspection);
  }

  update(inspection: Inspection): void {
    this.inspections.set(inspection.id, inspection);
  }

  getMetrics(org_id: string) {
    const all = this.getAll(org_id);
    const total = all.length;
    const pass = all.filter(i => i.overall_status === 'PASS').length;
    const fail = all.filter(i => i.overall_status === 'FAIL').length;
    const review = all.filter(i => i.overall_status === 'REVIEW').length;
    const pending = all.filter(i => i.overall_status === 'PENDING').length;
    const evidenceIssues = all.reduce((acc, i) => acc + i.images.filter(img => img.quality_status !== 'ok').length, 0);
    const avgLatency = total ? Math.round(all.reduce((acc, i) => acc + i.latency_ms, 0) / total) : 0;
    const avgCost = total ? (all.reduce((acc, i) => acc + i.cost_estimate, 0) / total).toFixed(4) : '0.0000';
    const passRate = total ? Math.round((pass / total) * 100) : 0;
    const failRate = total ? Math.round((fail / total) * 100) : 0;
    const uncertainRate = total ? Math.round((review / total) * 100) : 0;
    return { total, pass, fail, review, pending, evidenceIssues, avgLatency, avgCost, passRate, failRate, uncertainRate };
  }

  getFailurePatterns(org_id: string) {
    const all = this.getAll(org_id);
    const patterns: Record<string, number> = {};
    all.forEach(insp => {
      insp.checks.filter(c => c.verdict === 'fail').forEach(c => {
        const label = CHECK_KEY_LABELS[c.check_key] || c.check_key;
        patterns[label] = (patterns[label] || 0) + 1;
      });
    });
    return Object.entries(patterns).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  }
}

export const store = new InspectionStore();

export function createNewInspection(params: {
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
  checks: CheckRecord[];
  agent_events: AgentEvent[];
  cost_estimate: number;
  latency_ms: number;
  reinspection_of?: string;
}): Inspection {
  const checks = params.checks;
  const overall_status = computeOverall(checks);
  const prep_risk = computeRisk(checks, overall_status);
  const id = `insp-${uuidv4().slice(0, 8)}`;
  const record_id = `PRP-${Date.now().toString().slice(-6)}`;
  const content_hash = computeHash(id + JSON.stringify(checks));

  const inspection: Inspection = {
    id,
    record_id,
    schema_version: '1.1',
    organization_id: params.organization_id,
    client_id: null,
    agent: 'prep',
    unit_id: params.unit_id,
    product_id: params.product_id,
    sku: params.sku,
    asin: params.asin,
    fnsku: params.fnsku,
    shipment_id: params.shipment_id,
    work_order_id: params.work_order_id,
    operator_id: params.operator_id,
    created_at: new Date().toISOString(),
    overall_status,
    checks,
    images: params.images,
    agent_events: params.agent_events,
    overrides: [],
    cost_estimate: params.cost_estimate,
    latency_ms: params.latency_ms,
    content_hash,
    status: 'complete',
    is_fixture: false,
    prep_risk,
    reinspection_of: params.reinspection_of,
  };
  store.add(inspection);
  return inspection;
}
