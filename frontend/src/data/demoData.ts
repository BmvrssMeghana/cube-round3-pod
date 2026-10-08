import { WorkflowState, EvidenceRecord } from '../types';

export const DEMO_WORKFLOWS: Record<string, WorkflowState> = {
  'UNIT-001': {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-001',
    flow_id: 'standard-fba-mfn',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-001',
    status: 'COMPLETED',
    status_reason: 'All stages passed without exception',
    current_stage: 'pack',
    previous_stage: 'prep',
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'accept', finished_at: '2026-10-08T10:00:00Z', duration_ms: 320 },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'compliant', finished_at: '2026-10-08T10:02:00Z', duration_ms: 280 },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'seal', finished_at: '2026-10-08T10:05:00Z', duration_ms: 410 },
      { stage: 'returns', agent_id: null, state: 'skipped', skipped_reason: 'returned=False' },
      { stage: 'recovery', agent_id: null, state: 'skipped', skipped_reason: 'no fees billed' }
    ],
    evidence_references: ['RCV-UNIT-001', 'PRP-UNIT-001', 'PCK-UNIT-001'],
    timestamps: { created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:05:00Z', completed_at: '2026-10-08T10:05:00Z' },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: { status: 'COMPLETED', summary: 'Order packed and sealed for shipment' },
    transitions: []
  },

  'UNIT-002': {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-002',
    flow_id: 'standard-fba-mfn',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-002',
    status: 'HALTED',
    status_reason: 'stage prep is UNCERTAIN, needs a person, and on_uncertain=block',
    current_stage: 'prep',
    previous_stage: 'receiving',
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'accept', finished_at: '2026-10-08T11:00:00Z', duration_ms: 310 },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'completed', verdict: 'FAIL', outcome: 'non_compliant', needs_human: true, finished_at: '2026-10-08T11:03:00Z', duration_ms: 450 },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'pending' },
      { stage: 'returns', agent_id: null, state: 'skipped' },
      { stage: 'recovery', agent_id: null, state: 'skipped' }
    ],
    evidence_references: ['RCV-UNIT-002', 'PRP-UNIT-002'],
    timestamps: { created_at: '2026-10-08T11:00:00Z', updated_at: '2026-10-08T11:03:00Z', completed_at: null },
    errors: [{ code: 'polybag_unsealed', message: 'Polybag seam is open on edge' }],
    overrides: [],
    halted: { stage: 'prep', reason: 'Polybag suffocation warning text obscured by fold', at: '2026-10-08T11:03:00Z' },
    final_outcome: null,
    transitions: []
  },

  'UNIT-003': {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-003',
    flow_id: 'standard-fba-mfn',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-003',
    status: 'COMPLETED',
    status_reason: 'Recovery claim generated for invalid charge',
    current_stage: 'recovery',
    previous_stage: 'returns',
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'accept', finished_at: '2026-10-08T12:00:00Z' },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'compliant', finished_at: '2026-10-08T12:02:00Z' },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'seal', finished_at: '2026-10-08T12:05:00Z' },
      { stage: 'returns', agent_id: 'returns-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'restock', finished_at: '2026-10-08T14:00:00Z' },
      { stage: 'recovery', agent_id: 'recovery-agent@v1.0', state: 'completed', verdict: 'FAIL', outcome: 'claim_recommended', finished_at: '2026-10-08T14:05:00Z' }
    ],
    evidence_references: ['RCV-UNIT-003', 'PRP-UNIT-003', 'PCK-UNIT-003', 'RTN-UNIT-003', 'RCY-UNIT-003'],
    timestamps: { created_at: '2026-10-08T12:00:00Z', updated_at: '2026-10-08T14:05:00Z', completed_at: '2026-10-08T14:05:00Z' },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: { status: 'CLAIM_RECOMMENDED', claim_amount_usd: 45.00 },
    transitions: []
  },

  'UNIT-004': {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-004',
    flow_id: 'standard-fba-mfn',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-004',
    status: 'DEGRADED',
    status_reason: 'Cross-stage condition conflict detected between Receiving and Returns',
    current_stage: 'returns',
    previous_stage: 'pack',
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'accept', finished_at: '2026-10-08T09:00:00Z' },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'compliant', finished_at: '2026-10-08T09:02:00Z' },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'seal', finished_at: '2026-10-08T09:05:00Z' },
      { stage: 'returns', agent_id: 'returns-agent@v1.0', state: 'completed', verdict: 'FAIL', outcome: 'dispose', finished_at: '2026-10-08T13:00:00Z' },
      { stage: 'recovery', agent_id: 'recovery-agent@v1.0', state: 'completed', verdict: 'UNCERTAIN', outcome: 'insufficient_evidence', finished_at: '2026-10-08T13:05:00Z' }
    ],
    evidence_references: ['RCV-UNIT-004', 'PRP-UNIT-004', 'PCK-UNIT-004', 'RTN-UNIT-004', 'RCY-UNIT-004'],
    timestamps: { created_at: '2026-10-08T09:00:00Z', updated_at: '2026-10-08T13:05:00Z', completed_at: null },
    errors: [{ code: 'cross_stage_conflict', message: 'Receiving logged zero damage, but Returns logged severe structural crushing.' }],
    overrides: [],
    halted: null,
    final_outcome: { status: 'CROSS_STAGE_CONFLICT', detail: 'Fulfillment center damage anomaly' },
    transitions: []
  },

  'UNIT-0014': {
    schema_version: '1.0',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    flow_id: 'standard-fba-mfn',
    org_id: 'org_demo_alpha',
    subject_id: 'UNIT-0014',
    status: 'COMPLETED',
    status_reason: 'Full lifecycle unit passport verified with $15.00 recovery claim',
    current_stage: 'recovery',
    previous_stage: 'returns',
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'accept', finished_at: '2026-10-08T08:00:00Z' },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'compliant', finished_at: '2026-10-08T08:05:00Z' },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'seal', finished_at: '2026-10-08T08:10:00Z' },
      { stage: 'returns', agent_id: 'returns-agent@v1.0', state: 'completed', verdict: 'PASS', outcome: 'restock', finished_at: '2026-10-08T15:00:00Z' },
      { stage: 'recovery', agent_id: 'recovery-agent@v1.0', state: 'completed', verdict: 'FAIL', outcome: 'claim_recommended', finished_at: '2026-10-08T15:05:00Z' }
    ],
    evidence_references: ['RCV-UNIT-0014', 'PRP-UNIT-0014', 'PCK-UNIT-0014', 'RTN-UNIT-0014', 'RCY-UNIT-0014'],
    timestamps: { created_at: '2026-10-08T08:00:00Z', updated_at: '2026-10-08T15:05:00Z', completed_at: '2026-10-08T15:05:00Z' },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: { status: 'CLAIM_RECOMMENDED', claim_amount_usd: 15.00, charge_type: 'refund_issued_item_not_returned' },
    transitions: []
  }
};

export const DEMO_EVIDENCE: Record<string, EvidenceRecord> = {
  'RCV-UNIT-0014': {
    schema_version: '1.0',
    record_id: 'RCV-UNIT-0014',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    stage: 'receiving',
    agent_id: 'receiving-agent@v1.0',
    subject: { org_id: 'org_demo_alpha', subject_id: 'UNIT-0014', unit_id: 'UNIT-0014', sku: 'SKU-BLUE-BOTTLE', po_number: 'PO-9843' },
    status: 'completed',
    captured_at: '2026-10-08T08:00:00Z',
    produced_at: '2026-10-08T08:00:05Z',
    model: { name: 'gemini-2.0-flash-receiving', version: '1.0', provider: 'google' },
    checks: [
      { check_key: 'identity_match', verdict: 'PASS', expected: 'SKU-BLUE-BOTTLE', observed: 'SKU-BLUE-BOTTLE', detail: 'SKU matches PO manifest.' },
      { check_key: 'quantity', verdict: 'PASS', expected: 10, observed: 10, detail: 'Count verified.' },
      { check_key: 'carton_damage', verdict: 'PASS', expected: 'none', observed: 'none', detail: 'No visible carton crushing.' }
    ],
    decision: { verdict: 'PASS', outcome: 'accept', confidence: 0.98, reason: 'Receiving inspection passed all PO manifest checks.', needs_human: false },
    payload: { qty_ordered: 10, qty_received: 10, supplier: 'BlueBottle Inc.' },
    upstream_refs: []
  },

  'PRP-UNIT-0014': {
    schema_version: '1.0',
    record_id: 'PRP-UNIT-0014',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    stage: 'prep',
    agent_id: 'prep-agent@v1.0',
    subject: { org_id: 'org_demo_alpha', subject_id: 'UNIT-0014', unit_id: 'UNIT-0014', sku: 'SKU-BLUE-BOTTLE', fnsku: 'X001A2B3C4' },
    status: 'completed',
    captured_at: '2026-10-08T08:05:00Z',
    produced_at: '2026-10-08T08:05:04Z',
    model: { name: 'prep-rule-vision-v1', version: '1.0', provider: 'prep_engine' },
    checks: [
      { check_key: 'polybag_sealed', verdict: 'PASS', expected: 'sealed', observed: 'sealed', detail: '1.5mil polybag sealed.' },
      { check_key: 'suffocation_warning', verdict: 'PASS', expected: 'legible', observed: 'legible', detail: 'Warning text clear.' },
      { check_key: 'fnsku_label_placement', verdict: 'PASS', expected: 'flat', observed: 'flat', detail: 'Label applied flat.' }
    ],
    decision: { verdict: 'PASS', outcome: 'compliant', confidence: 0.96, reason: 'Prep packaging compliant with FBA guidelines.', needs_human: false },
    payload: { measurements: { weight_oz: 14.2, dimensions_in: [8.0, 5.0, 2.5] } },
    upstream_refs: ['RCV-UNIT-0014']
  },

  'PCK-UNIT-0014': {
    schema_version: '1.0',
    record_id: 'PCK-UNIT-0014',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    stage: 'pack',
    agent_id: 'pack-agent@v1.0',
    subject: { org_id: 'org_demo_alpha', subject_id: 'UNIT-0014', unit_id: 'UNIT-0014', order_id: 'ORD-9843' },
    status: 'completed',
    captured_at: '2026-10-08T08:10:00Z',
    produced_at: '2026-10-08T08:10:06Z',
    model: { name: 'claude-3-5-sonnet-pack', version: '1.0', provider: 'anthropic' },
    checks: [
      { check_key: 'items_present', verdict: 'PASS', expected: ['SKU-BLUE-BOTTLE'], observed: ['SKU-BLUE-BOTTLE'], detail: 'Items verified in carton.' },
      { check_key: 'quantities_correct', verdict: 'PASS', expected: { 'SKU-BLUE-BOTTLE': 1 }, observed: { 'SKU-BLUE-BOTTLE': 1 }, detail: 'Quantity matches order.' }
    ],
    decision: { verdict: 'PASS', outcome: 'seal', confidence: 0.97, reason: 'Carton verified: seal approved.', needs_human: false },
    payload: { detected_items: [{ sku: 'SKU-BLUE-BOTTLE', box_2d: [0.1, 0.1, 0.5, 0.5] }] },
    upstream_refs: ['PRP-UNIT-0014']
  },

  'RTN-UNIT-0014': {
    schema_version: '1.0',
    record_id: 'RTN-UNIT-0014',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    stage: 'returns',
    agent_id: 'returns-agent@v1.0',
    subject: { org_id: 'org_demo_alpha', subject_id: 'UNIT-0014', unit_id: 'UNIT-0014', order_id: 'ORD-9843', sku: 'SKU-BLUE-BOTTLE' },
    status: 'completed',
    captured_at: '2026-10-08T15:00:00Z',
    produced_at: '2026-10-08T15:00:04Z',
    model: { name: 'gemini-2.0-flash-returns', version: '1.0', provider: 'google' },
    checks: [
      { check_key: 'identity_match', verdict: 'PASS', expected: 'SKU-BLUE-BOTTLE', observed: 'SKU-BLUE-BOTTLE', detail: 'Returned item matches order.' },
      { check_key: 'completeness', verdict: 'PASS', expected: [], observed: [], detail: 'All components present.' }
    ],
    decision: { verdict: 'PASS', outcome: 'restock', confidence: 0.95, reason: 'Item returned factory sealed and restocked into active inventory.', needs_human: false },
    payload: { observed_state: 'factory_sealed', amazon_condition: 'New', value_recovery_ratio: 1.0 },
    upstream_refs: ['PCK-UNIT-0014']
  },

  'RCY-UNIT-0014': {
    schema_version: '1.0',
    record_id: 'RCY-UNIT-0014',
    workflow_id: 'WF-org_demo_alpha-UNIT-0014',
    stage: 'recovery',
    agent_id: 'recovery-agent@v1.0',
    subject: { org_id: 'org_demo_alpha', subject_id: 'UNIT-0014', unit_id: 'UNIT-0014' },
    status: 'completed',
    captured_at: '2026-10-08T15:05:00Z',
    produced_at: '2026-10-08T15:05:02Z',
    model: { name: 'recovery-monotonic-classifier-v1', version: '1.0', provider: 'recovery_engine' },
    checks: [
      { check_key: 'charge_chg_rtn_014', verdict: 'FAIL', expected: 'charge supported by evidence', observed: 'CONTRADICTED', detail: 'Returns logs confirm unit was returned (Factory sealed and Restocked), directly contradicting the "item not returned" fee.' }
    ],
    decision: { verdict: 'FAIL', outcome: 'claim_recommended', confidence: 0.98, reason: 'Recovery audit complete: 1 charge contradicted ($15.00 claimable).', needs_human: false },
    payload: {
      charges: [
        {
          line_id: 'CHG-RTN-014',
          charge_type: 'refund_issued_item_not_returned',
          amount_usd: 15.00,
          position: 'CONTRADICTS',
          verdict: 'CONTRADICTED',
          claim_amount: 15.00,
          reasoning: 'Returns logs confirm unit was returned (Factory sealed and Restocked), directly contradicting the "item not returned" fee.',
          sha256_hash: 'a8f5b2c9d4e1f3a7c8b9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2'
        }
      ],
      claimable_usd: 15.00
    },
    upstream_refs: ['RTN-UNIT-0014']
  }
};
