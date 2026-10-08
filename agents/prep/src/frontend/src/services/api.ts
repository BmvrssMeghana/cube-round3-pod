import { WorkflowState, EvidenceRecord, StageName } from '../types';
import { DEMO_WORKFLOWS, DEMO_EVIDENCE } from '../data/demoData';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; flow: string; agents: Record<string, any> }> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend health API offline, using fallback');
  }
  return {
    status: 'ok',
    flow: 'standard-fba-mfn',
    agents: {
      receiving: { status: 'ok', mode: 'inproc' },
      prep: { status: 'ok', mode: 'inproc' },
      pack: { status: 'ok', mode: 'inproc' },
      returns: { status: 'ok', mode: 'inproc' },
      recovery: { status: 'ok', mode: 'inproc' },
    },
  };
}

export async function fetchWorkflows(): Promise<WorkflowState[]> {
  try {
    const res = await fetch(`${BASE_URL}/workflows`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.warn('Fetch workflows offline, using demo dataset');
  }
  return Object.values(DEMO_WORKFLOWS);
}

export async function fetchWorkflow(unitId: string, orgId: string = 'org_demo_alpha'): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  try {
    const res = await fetch(`${BASE_URL}/workflows/${workflowId}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`Fetching workflow ${workflowId} failed, checking demo dataset`);
  }

  if (DEMO_WORKFLOWS[unitId]) {
    return DEMO_WORKFLOWS[unitId];
  }

  return {
    schema_version: '1.0',
    workflow_id: workflowId,
    flow_id: 'standard-fba-mfn',
    org_id: orgId,
    subject_id: unitId,
    status: 'IN_PROGRESS',
    status_reason: 'Custom test unit active in pipeline',
    current_stage: 'receiving',
    previous_stage: null,
    stage_results: [
      { stage: 'receiving', agent_id: 'receiving-agent@v1.0', state: 'pending' },
      { stage: 'prep', agent_id: 'prep-agent@v1.0', state: 'pending' },
      { stage: 'pack', agent_id: 'pack-agent@v1.0', state: 'pending' },
      { stage: 'returns', agent_id: null, state: 'skipped' },
      { stage: 'recovery', agent_id: null, state: 'skipped' },
    ],
    evidence_references: [],
    timestamps: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: null },
    errors: [],
    overrides: [],
    halted: null,
    final_outcome: null,
    transitions: [],
  };
}

export async function fetchWorkflowBundle(unitId: string, orgId: string = 'org_demo_alpha'): Promise<{ workflow: WorkflowState; evidence: Record<string, EvidenceRecord> }> {
  const workflowId = `WF-${orgId}-${unitId}`;
  try {
    const res = await fetch(`${BASE_URL}/workflows/${workflowId}/evidence`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`Fetching bundle for ${workflowId} failed, using demo dataset`);
  }

  const wf = await fetchWorkflow(unitId, orgId);
  const evidence: Record<string, EvidenceRecord> = {};
  for (const ref of wf.evidence_references) {
    if (DEMO_EVIDENCE[ref]) {
      evidence[ref] = DEMO_EVIDENCE[ref];
    }
  }

  return { workflow: wf, evidence };
}

export async function triggerWorkflowRun(unitId: string, orgId: string = 'org_demo_alpha', route: string = 'fba', returned: boolean = false): Promise<WorkflowState> {
  try {
    const res = await fetch(`${BASE_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, unit_id: unitId, route, returned }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Trigger workflow run failed, simulating run');
  }

  return await fetchWorkflow(unitId, orgId);
}

export async function createCustomUnit(unitId: string, route: string = 'fba', returned: boolean = false, sku: string = 'SKU-TEST-101', expectedQty: number = 10): Promise<WorkflowState> {
  try {
    const res = await fetch(`${BASE_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: 'org_demo_alpha', unit_id: unitId, route, returned, sku, expected_qty: expectedQty }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Create custom unit failed, simulating creation');
  }

  return fetchWorkflow(unitId);
}

export async function runStageInspection(unitId: string, stage: StageName, payload: Record<string, any>): Promise<{ workflow: WorkflowState; output: any; evidence: EvidenceRecord }> {
  try {
    const res = await fetch(`${BASE_URL}/inspect/${stage}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_id: unitId, subject_id: unitId, org_id: 'org_demo_alpha', ...payload }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`Live inspection for stage ${stage} failed backend call`);
  }

  // Fallback client simulation if backend is unavailable
  const recId = `${stage.substring(0, 3).toUpperCase()}-NEW-${Date.now().toString().slice(-4)}`;
  const mockEv: EvidenceRecord = {
    schema_version: '1.0',
    record_id: recId,
    workflow_id: `WF-org_demo_alpha-${unitId}`,
    stage,
    agent_id: `${stage}-agent@v1.0`,
    subject: { org_id: 'org_demo_alpha', subject_id: unitId, unit_id: unitId, sku: payload.sku || 'SKU-TEST-101' },
    status: 'completed',
    captured_at: new Date().toISOString(),
    produced_at: new Date().toISOString(),
    model: { name: `${stage}-ai-engine-v1`, version: '1.0', provider: 'cube' },
    checks: [
      { check_key: 'inspection_status', verdict: payload.verdict || 'PASS', expected: 'PASS', observed: payload.verdict || 'PASS', detail: 'Interactive inspection evaluated.' }
    ],
    decision: {
      verdict: payload.verdict || 'PASS',
      outcome: payload.outcome || 'completed',
      confidence: 0.95,
      reason: payload.reason || `Live inspection executed for stage ${stage.toUpperCase()}`,
      needs_human: payload.verdict === 'UNCERTAIN',
    },
    payload,
    upstream_refs: [],
  };

  const wf = await fetchWorkflow(unitId);
  wf.evidence_references.push(recId);
  const sr = wf.stage_results.find((s) => s.stage === stage);
  if (sr) {
    sr.state = 'completed';
    sr.verdict = mockEv.decision.verdict;
    sr.record_id = recId;
  }

  return { workflow: wf, output: { evidence: mockEv }, evidence: mockEv };
}

export async function submitOverride(
  unitId: string,
  recordId: string,
  newVerdict: 'PASS' | 'FAIL' | 'UNCERTAIN',
  actor: string,
  reason: string,
  orgId: string = 'org_demo_alpha'
): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  try {
    const res = await fetch(`${BASE_URL}/workflows/${workflowId}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: recordId, new_verdict: newVerdict, actor, reason }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Submit override failed, simulating override update');
  }

  const wf = await fetchWorkflow(unitId, orgId);
  wf.overrides.push({
    override_id: `OVR-${wf.overrides.length + 1}`,
    supersedes: { record_id: recordId, override_id: null },
    target: 'decision',
    actor,
    at: new Date().toISOString(),
    reason,
    original_verdict: 'FAIL',
    previous_verdict: 'FAIL',
    new_verdict: newVerdict,
  });
  return wf;
}
