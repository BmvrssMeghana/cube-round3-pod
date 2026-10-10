import type { WorkflowState, EvidenceRecord, StageName } from '../types';

const BASE_URL = '/api';
const TOKEN_KEY = 'cube-access-token';

export interface AuthUser {
  email: string;
  org_id: string;
  org_name: string;
}

export interface AuthSession {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: AuthUser;
}

function authHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) result.set('Authorization', `Bearer ${token}`);
  return result;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, headers: authHeaders(init.headers) });
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await responseError(response);
  const session: AuthSession = await response.json();
  localStorage.setItem(TOKEN_KEY, session.access_token);
  return session;
}

export async function signUp(input: {
  email: string;
  password: string;
  mode: 'team' | 'organization';
  team?: 'alpha' | 'bravo';
  invite_code?: string;
  org_name?: string;
}): Promise<AuthSession> {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await responseError(response);
  const session: AuthSession = await response.json();
  localStorage.setItem(TOKEN_KEY, session.access_token);
  return session;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiFetch(`${BASE_URL}/auth/me`);
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export function signOut(): void {
  localStorage.removeItem(TOKEN_KEY);
}

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
  const response = await apiFetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

export async function fetchHealth(): Promise<{
  status: string;
  flow: string;
  database: { status: string; engine?: string; error?: string };
  agents: Record<string, { status: string }>;
}> {
  const res = await apiFetch(`${BASE_URL}/health`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchWorkflows(orgId: string): Promise<WorkflowState[]> {
  const res = await apiFetch(`${BASE_URL}/workflows?org_id=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw await responseError(res);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error('Workflow API returned an invalid response.');
  return list;
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
): Promise<DashboardSummary> {
  const res = await apiFetch(`${BASE_URL}/dashboard/summary?${dashboardQuery(orgId, range, start, end)}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchDashboardTimeseries(orgId: string, range: string = '30d') {
  const res = await apiFetch(`${BASE_URL}/dashboard/timeseries?${dashboardQuery(orgId, range)}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchDashboardActivity(orgId: string, limit = 40) {
  const res = await apiFetch(`${BASE_URL}/dashboard/activity?org_id=${encodeURIComponent(orgId)}&limit=${limit}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchDashboardLocations(orgId: string) {
  const res = await apiFetch(`${BASE_URL}/dashboard/locations?org_id=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchAgentDashboard(
  stage: StageName,
  orgId: string,
  params: Record<string, string | number> = {},
) {
  const qs = new URLSearchParams({ org_id: orgId, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await apiFetch(`${BASE_URL}/dashboard/agents/${stage}?${qs}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchWorkflow(unitId: string, orgId: string): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  const res = await apiFetch(`${BASE_URL}/workflows/${workflowId}`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function fetchWorkflowBundle(unitId: string, orgId: string): Promise<{
  workflow: WorkflowState;
  evidence: Record<string, EvidenceRecord>;
  source_records: Array<{ record_type: string; record_id: string; source_file: string; record_data: Record<string, unknown>; captured_at: string | null }>;
}> {
  const workflowId = `WF-${orgId}-${unitId}`;
  const res = await apiFetch(`${BASE_URL}/workflows/${workflowId}/evidence`);
  if (!res.ok) throw await responseError(res);
  return res.json();
}

export async function triggerWorkflowRun(unitId: string, orgId: string, route: string = 'fba', returned: boolean = false): Promise<WorkflowState> {
  return postJson<WorkflowState>('/workflows', {
    org_id: orgId, unit_id: unitId, route, returned, sku: 'SKU-TEST-101', expected_qty: 1,
  });
}

export async function createCustomUnit(unitId: string, orgId: string, route: string = 'fba', returned: boolean = false, sku: string = 'SKU-TEST-101', expectedQty: number = 10): Promise<WorkflowState> {
  return createUnit({ unit_id: unitId, org_id: orgId, route, returned, sku, expected_qty: expectedQty });
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
  return postJson<WorkflowState>('/units', input);
}

export async function runStageInspection(
  unitId: string,
  stage: StageName,
  payload: Record<string, any>,
  orgId: string,
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
  orgId: string
): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  return postJson<WorkflowState>(`/workflows/${workflowId}/overrides`, {
    record_id: recordId, new_verdict: newVerdict, actor, reason,
  });
}

export async function runWorkflow(unitId: string, orgId: string): Promise<WorkflowState> {
  const workflowId = `WF-${orgId}-${unitId}`;
  return postJson<WorkflowState>(`/workflows/${workflowId}/run`, {});
}

export { submitOverride as applyOverride };
