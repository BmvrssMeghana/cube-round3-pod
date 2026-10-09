import type { StageName } from '../types';

export interface SubAgentStep {
  id: string;
  name: string;
  type: string;
  input: string;
  output: string;
  onFailure: string;
}

export interface StageSpec {
  purpose: string;
  inputs: string[];
  workflow: string;
  carriedForward: string[];
  features: string[];
  usp: string;
  acceptance: string;
  subAgents: SubAgentStep[];
}

export const STAGE_SPECS: Record<StageName, StageSpec> = {
  receiving: {
    purpose: 'Verify what arrived and create receipt evidence before the supplier window closes.',
    inputs: ['PO (SKU, qty, variant)', 'Catalogue / reference images', 'Carton & unit photos', 'org_id', 'unit_id', 'operator'],
    workflow: 'REC-1 capture gate → batched REC-2..5 perception → REC-6 rules (FAIL→EXCEPTION, UNCERTAIN preserved, else ACCEPT).',
    carriedForward: ['Record ID', 'Identity baseline (SKU/variant/qty)', 'Damage findings + hashes', 'Per-check verdicts', 'Supplier-claim draft'],
    features: ['Guided shot checklist', 'Annotated photos', 'Shortage / overage badge', 'Supplier-claim draft', 'Retake guidance'],
    usp: 'Evidence is captured at receipt, before the supplier claim window closes; bad captures must not receive a verdict.',
    acceptance: 'Correct, short, extra, wrong SKU, wrong variant, crushed, water-damaged, torn, missing components, and ambiguous receipts produce expected-vs-observed evidence.',
    subAgents: [
      { id: 'REC-1', name: 'Capture & Quality Gate', type: 'rules/CV', input: 'Photos + required-shot list', output: 'Accepted shots + SHA-256 or retake guidance', onFailure: 'Retake — no verdict on bad photos' },
      { id: 'REC-2', name: 'Identity Resolver', type: 'OCR+vision', input: 'Accepted shots + PO + catalogue', output: 'SKU/ASIN verdict + observed IDs', onFailure: 'UNCERTAIN if label unreadable' },
      { id: 'REC-3', name: 'Quantity Counter', type: 'vision', input: 'Accepted shots + PO quantity', output: 'Cartons, units/carton, observed quantity', onFailure: 'UNCERTAIN if units hidden / stacked' },
      { id: 'REC-4', name: 'Variant Checker', type: 'vision', input: 'Accepted shots + PO variant', output: 'Colour / size verdict', onFailure: 'UNCERTAIN on lighting' },
      { id: 'REC-5', name: 'Damage Inspector', type: 'vision', input: 'Accepted shots', output: 'Damage findings + image regions', onFailure: 'UNCERTAIN if area not visible' },
      { id: 'REC-6', name: 'Decision & Evidence Builder', type: 'rules', input: 'REC-2..5 outputs', output: 'Checks + disposition + supplier claim + evidence', onFailure: 'Error record' },
    ],
  },
  prep: {
    purpose: 'Prove FBA prep compliance using authoritative rules only (never invented by the model).',
    inputs: ['Receiving identity baseline', 'Category + prep rules file', 'Post-prep photos', 'FNSKU / label info'],
    workflow: 'PRP-1 rules → PRP-2 gate → batched PRP-3..5 → PRP-6 (FAIL→FAIL; UNCERTAIN never becomes PASS).',
    carriedForward: ['Prep record ID', 'Rule-by-rule table', 'Pre-shipment photos + sha256', 'Checked vs not-checkable rules'],
    features: ['Authoritative rule citations', 'Rule-by-rule outcomes', 'Pre-shipment timestamp + hashes', 'Checked / not-checkable tracking'],
    usp: 'Prep rules come only from the versioned requirements file; observations do not invent requirements.',
    acceptance: 'Sealed bag, missing / obscured warning, wrong FNSKU placement, label on seam, visible original barcode, covered expiry, missing handling mark, compliant, and ambiguous prep.',
    subAgents: [
      { id: 'PRP-1', name: 'Requirement Resolver', type: 'rules', input: 'Category + prep requirements file', output: 'Applicable rules + visually-checkable flags', onFailure: 'Error if category has no rules' },
      { id: 'PRP-2', name: 'Capture Guide & Gate', type: 'rules/CV', input: 'Post-prep photos', output: 'Required views accepted or retake request', onFailure: 'Retake' },
      { id: 'PRP-3', name: 'Polybag & Seal Checker', type: 'vision', input: 'Accepted shots + seal rule', output: 'Bag presence + seal verdict', onFailure: 'UNCERTAIN if seal hidden' },
      { id: 'PRP-4', name: 'Warning Reader', type: 'OCR+vision', input: 'Accepted shots + warning rule', output: 'Warning visibility / legibility', onFailure: 'UNCERTAIN if glare / blur' },
      { id: 'PRP-5', name: 'Label & Barcode Inspector', type: 'vision+OCR', input: 'Shots + FNSKU information', output: 'FNSKU position, barcode coverage, expiry, handling marks', onFailure: 'UNCERTAIN if ambiguous' },
      { id: 'PRP-6', name: 'Compliance Decider', type: 'rules', input: 'PRP-1..5 results', output: 'Cited per-rule table + overall status + evidence', onFailure: 'Error record' },
    ],
  },
  pack: {
    purpose: 'Verify open-box contents vs order before seal (SEAL vs STOP & FIX).',
    inputs: ['Order lines', 'Catalogue images', 'Receiving baseline', 'Top-down open-box photos'],
    workflow: 'PCK-1 gate → batched PCK-2/3 → PCK-4 reconcile → PCK-5 seal decision.',
    carriedForward: ['Pack record ID', 'Expected vs detected table', 'SEAL/STOP decision', 'Pre-seal timestamp'],
    features: ['Open-box capture guide', 'Per-item reconciliation', 'Look-alike escalation', 'Seal / stop instruction'],
    usp: 'Stops a shipment before sealing and records what was actually packed.',
    acceptance: 'Correct, missing, wrong, extra, wrong quantity, multiple identical items, look-alike, and ambiguous contents.',
    subAgents: [
      { id: 'PCK-1', name: 'Capture Guide & Gate', type: 'rules/CV', input: 'Top-down open-box photos', output: 'Accepted shots or retake guidance', onFailure: 'Retake on blur / occlusion' },
      { id: 'PCK-2', name: 'Item Detector', type: 'vision', input: 'Shots + catalogue images', output: 'Detected types + look-alike flags', onFailure: 'UNCERTAIN on look-alikes' },
      { id: 'PCK-3', name: 'Quantity Counter', type: 'vision', input: 'Shots + item detections', output: 'Per-item counts', onFailure: 'UNCERTAIN if stacked' },
      { id: 'PCK-4', name: 'Order Reconciler', type: 'rules', input: 'Order lines + item counts', output: 'Missing / wrong / extra / quantity table', onFailure: 'Error record' },
      { id: 'PCK-5', name: 'Seal Decider', type: 'rules', input: 'Reconciliation results', output: 'SEAL / STOP & FIX / UNCERTAIN + evidence', onFailure: 'Error record' },
    ],
  },
  returns: {
    purpose: 'Document identity, completeness, condition (defined scale), and disposition for returns.',
    inputs: ['Original order', 'Parts list', 'Defined condition scale', 'Upstream Receiving/Prep/Pack evidence', 'Return photos'],
    workflow: 'RTN-1 gate → batched RTN-2..4 → RTN-5 disposition rules → RTN-6 explanation + record.',
    carriedForward: ['Returns record ID', 'Identity', 'Missing parts', 'Condition grade', 'Disposition + rule ref'],
    features: ['Per-accessory checklist', 'Condition scale', 'Disposition + rule reference', 'Comparison to outbound evidence'],
    usp: 'Links the returned unit to the item and contents recorded when it left the warehouse.',
    acceptance: 'Correct / wrong product, missing accessories, new-looking, lightly used, damaged, heavily damaged, ambiguous, and look-alike returns.',
    subAgents: [
      { id: 'RTN-1', name: 'Capture Guide & Gate', type: 'rules/CV', input: 'Item, accessories, package, serial / label photos', output: 'Accepted required shots', onFailure: 'Retake' },
      { id: 'RTN-2', name: 'Identity Verifier', type: 'vision+OCR', input: 'Shots + order + identity baseline', output: 'Identity PASS / FAIL / UNCERTAIN', onFailure: 'UNCERTAIN' },
      { id: 'RTN-3', name: 'Completeness Checker', type: 'vision', input: 'Shots + parts list', output: 'Per-component present / missing', onFailure: 'UNCERTAIN if not shown' },
      { id: 'RTN-4', name: 'Condition Grader', type: 'vision', input: 'Shots + defined condition scale', output: 'Condition grade + damage regions', onFailure: 'UNCERTAIN if ambiguous' },
      { id: 'RTN-5', name: 'Disposition Recommender', type: 'rules', input: 'RTN-2..4 + disposition table', output: 'Restock / refurbish / liquidate / dispose', onFailure: 'UNCERTAIN → human review' },
      { id: 'RTN-6', name: 'Evidence & Explanation Builder', type: 'rules', input: 'Prior evidence + RTN-1..5', output: 'Reasoning + before / after comparison + evidence', onFailure: 'Error record' },
    ],
  },
  recovery: {
    purpose: 'Compare fee report charges to upstream evidence records — no re-classification of images.',
    inputs: ['Fee / reimbursement CSV or lines', 'All upstream evidence for unit', 'Prior reimbursements', 'org_id'],
    workflow: 'RCY-1 parse → RCY-2 match → RCY-3 retrieve evidence → RCY-4 duplicates → RCY-5 classify → RCY-6 claim → RCY-7 explain.',
    carriedForward: ['Per-charge assessment', 'Claim total', 'SILENT list with reasons', 'Links to contributing records'],
    features: ['Charge-by-charge assessment', 'Conservative claim assembly', 'Duplicate / reimbursed flags', 'Reason for every non-claim'],
    usp: 'Every claim ties to an earlier check and evidence record; missing evidence stays SILENT.',
    acceptance: 'Full / partial / no evidence, multiple charges, cross-manager evidence, ambiguous rows, duplicates, prior reimbursements, and Prep fee without Prep evidence.',
    subAgents: [
      { id: 'RCY-1', name: 'Report Parser', type: 'rules', input: 'Fee / reimbursement CSV', output: 'Normalised charge rows', onFailure: 'Row-level parse errors listed' },
      { id: 'RCY-2', name: 'Unit Matcher', type: 'rules', input: 'Charge rows + unit references', output: 'Charge-to-unit / shipment links', onFailure: 'Unmatched → SILENT' },
      { id: 'RCY-3', name: 'Evidence Retriever', type: 'rules', input: 'Links + org-scoped evidence store', output: 'Relevant records across upstream agents', onFailure: 'None → SILENT' },
      { id: 'RCY-4', name: 'Duplicate & Reimbursed Detector', type: 'rules', input: 'Charge rows + reimbursement history', output: 'Duplicate / reimbursed flags', onFailure: 'Flags only — never claims' },
      { id: 'RCY-5', name: 'Charge-Evidence Classifier', type: 'rules', input: 'Charge + cited evidence', output: 'CONTRADICTED / SUPPORTED / SILENT / UNCERTAIN', onFailure: 'UNCERTAIN if ambiguous' },
      { id: 'RCY-6', name: 'Claim Assembler', type: 'rules', input: 'Charge assessments', output: 'Claim total + source records + hashes', onFailure: 'CONTRADICTED + valid evidence only' },
      { id: 'RCY-7', name: 'Explanation Writer', type: 'rules/template', input: 'All charge results', output: 'Reason for each claim and non-claim', onFailure: 'Error record' },
    ],
  },
};

export const UPSTREAM_FOR: Record<StageName, StageName[]> = {
  receiving: [],
  prep: ['receiving'],
  pack: ['receiving'],
  returns: ['receiving', 'prep', 'pack'],
  recovery: ['receiving', 'prep', 'pack', 'returns'],
};
