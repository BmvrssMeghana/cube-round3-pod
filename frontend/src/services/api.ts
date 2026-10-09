import type { WorkflowState, EvidenceRecord, StageName } from '../types';

import { DEMO_WORKFLOWS, DEMO_EVIDENCE } from '../data/demoData';

const BASE_URL = '/api';

const ALLOW_DEMO_FALLBACK = import.meta.env.VITE_ALLOW_DEMO_FALLBACK === '1';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function responseError(response: Response): Promise<Error> {
  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === 'string') message = detail;
    else if (Array.isArray(detail)) message = detail.map((item) => item.msg || item).join('; ');
  } catch {
    // Keep the HTTP status as the actionable error when the body is not JSON.
  }
  return new ApiError(message, response.status);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export async function fetchHealth(): Promise<{ status: string; flow: string; agents: Record<string, any> }> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.error('Backend health API unavailable', error);
  }
  return {
    status: 'degraded',
    flow: 'standard-fba-mfn',
    agents: {
      receiving: { status: 'down', mode: 'offline' },
      prep: { status: 'down', mode: 'offline' },
      pack: { status: 'down', mode: 'offline' },
      returns: { status: 'down', mode: 'offline' },
      recovery: { status: 'down', mode: 'offline' },
    },
  };
}

export async function fetchWorkflows(orgId: string = 'org_demo_alpha'): Promise<WorkflowState[]> {
  try {
    const res = await fetch(`${BASE_URL}/workflows?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) return list;
    }
  } catch (error) {
    console.warn('Fetch workflows failed', error);
  }
  if (ALLOW_DEMO_FALLBACK) return Object.values(DEMO_WORKFLOWS);
  return [];
}

export interface DashboardSummary {
  org_id: string;
  generated_at: string;
  range: { key: string; start: string; end: string };
  kpis: Record<string, number | null | Record<string, number>>;
  funnel: Record<string, number>;
  agent_performance: Record<string, { pass: number; fail: number; uncertain: number; completed_in_period: number }>;
  verdict_distribution: { counts: Record<string, number>; denominator: number; percentages: Record<string, number> };
  operational_health: { metric: string; percentage: number | null; numerator: number; denominator: number };
  latency: { median_ms: number | null; average_ms: number | null };
}

function dashboardQuery(orgId: string, range: string, start?: string, end?: string): string {
  const params = new URLSearchParams({ org_id: orgId, range });
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return params.toString();
}

export async function fetchDashboardSummary(
  orgId: string,
  range: string = '30d',
  start?: string,
  end?: string,
): Promise<DashboardSummary | null> {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/summary?${dashboardQuery(orgId, range, start, end)}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Dashboard summary unavailable', error);
  }
  return null;
}

export async function fetchDashboardTimeseries(orgId: string, range: string = '30d') {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/timeseries?${dashboardQuery(orgId, range)}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Dashboard timeseries unavailable', error);
  }
  return null;
}

export async function fetchDashboardActivity(orgId: string, limit = 40) {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/activity?org_id=${encodeURIComponent(orgId)}&limit=${limit}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Dashboard activity unavailable', error);
  }
  return [];
}

export async function fetchDashboardLocations(orgId: string) {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/locations?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Dashboard locations unavailable', error);
  }
  return null;
}

export async function fetchAgentDashboard(
  stage: StageName,
  orgId: string,
  params: Record<string, string | number> = {},
) {
  const qs = new URLSearchParams({ org_id: orgId, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  try {
    const res = await fetch(`${BASE_URL}/dashboard/agents/${stage}?${qs}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn(`Agent dashboard ${stage} unavailable`, error);
  }
  return null;
}

export async function probeBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchWorkflow(unitId: string, orgId: string = 'org_demo_alpha'): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  try {
    const res = await fetch(`${BASE_URL}/workflows/${workflowId}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn(`Fetching workflow ${workflowId} failed, checking demo dataset`, error);
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
  } catch (error) {
    console.warn(`Fetching bundle for ${workflowId} failed, using demo dataset`, error);
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
  return postJson<WorkflowState>('/workflows', {
    org_id: orgId, unit_id: unitId, route, returned, sku: 'SKU-TEST-101', expected_qty: 1,
  });
}

export async function createCustomUnit(unitId: string, route: string = 'fba', returned: boolean = false, sku: string = 'SKU-TEST-101', expectedQty: number = 10): Promise<WorkflowState> {
  return createUnit({ unit_id: unitId, route, returned, sku, expected_qty: expectedQty });
}

export async function createUnit(input: {
  unit_id: string;
  org_id?: string;
  route?: string;
  returned?: boolean;
  sku: string;
  expected_qty: number;
  variant?: string;
  fnsku?: string;
  order_id?: string;
}): Promise<WorkflowState> {
  return postJson<WorkflowState>('/units', { org_id: 'org_demo_alpha', ...input });
}

export async function runStageInspection(
  unitId: string,
  stage: StageName,
  payload: Record<string, any>,
  orgId: string = 'org_demo_alpha',
  route: string = 'fba',
  returned: boolean = false,
): Promise<{ workflow: WorkflowState; output: any; evidence: EvidenceRecord }> {
  return postJson<{ workflow: WorkflowState; output: any; evidence: EvidenceRecord }>(`/inspect/${stage}`, {
    ...payload, unit_id: unitId, org_id: orgId, route, returned,
  });
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
  return postJson<WorkflowState>(`/workflows/${workflowId}/overrides`, {
    record_id: recordId, new_verdict: newVerdict, actor, reason,
  });
}

export async function runWorkflow(unitId: string, orgId: string = 'org_demo_alpha'): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  return postJson<WorkflowState>(`/workflows/${workflowId}/run`, {});
}

export { submitOverride as applyOverride };
