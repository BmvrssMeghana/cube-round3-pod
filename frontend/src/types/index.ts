export type StageName = 'receiving' | 'prep' | 'pack' | 'returns' | 'recovery';
export type VerdictType = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'SEAL' | 'STOP_AND_FIX' | 'MANUAL_REVIEW';
export type WorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'HALTED' | 'FAILED' | 'DEGRADED';

export interface SubjectRef {
  org_id: string;
  subject_id: string;
  unit_id: string;
  sku?: string;
  asin?: string;
  fnsku?: string;
  order_id?: string;
  po_number?: string;
  refs?: Record<string, string | number | null>;
}

export interface CheckItem {
  check_key: string;
  verdict: VerdictType;
  confidence?: number;
  expected?: any;
  observed?: any;
  detail?: string;
  evidence_refs?: string[];
  uncertain_reason?: string;
}

export interface EvidenceRecord {
  schema_version: string;
  record_id: string;
  workflow_id: string;
  stage: StageName;
  agent_id: string;
  subject: SubjectRef;
  status: string;
  captured_at: string;
  produced_at: string;
  model: {
    name: string;
    version: string;
    provider?: string;
  };
  checks: CheckItem[];
  decision: {
    verdict: VerdictType;
    outcome: string;
    confidence?: number;
    reason: string;
    needs_human: boolean;
  };
  payload: Record<string, any>;
  upstream_refs: string[];
}

export interface StageResult {
  stage: StageName;
  agent_id: string | null;
  state: 'pending' | 'completed' | 'skipped' | 'error';
  skipped_reason?: string | null;
  record_id?: string | null;
  evidence_status?: string | null;
  verdict?: VerdictType | null;
  outcome?: string | null;
  needs_human?: boolean | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  error?: any;
}

export interface OverrideItem {
  override_id: string;
  supersedes: { record_id: string; override_id: string | null };
  target: string;
  actor: string;
  at: string;
  reason: string;
  original_verdict: VerdictType;
  previous_verdict: VerdictType;
  new_verdict: VerdictType;
  new_outcome?: string;
}

export interface WorkflowState {
  schema_version: string;
  workflow_id: string;
  flow_id: string;
  org_id: string;
  subject_id: string;
  context?: Record<string, any>;
  status: WorkflowStatus;
  status_reason: string;
  current_stage: StageName | null;
  previous_stage: StageName | null;
  stage_results: StageResult[];
  evidence_references: string[];
  timestamps: {
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  };
  errors: any[];
  overrides: OverrideItem[];
  halted: { stage: StageName; reason: string; at: string } | null;
  final_outcome: any | null;
  transitions: any[];
}

export interface RecoveryClaim {
  line_id: string;
  charge_type: string;
  amount_usd: number;
  verdict: 'CONTRADICTED' | 'SUPPORTED' | 'SILENT' | 'UNCERTAIN' | 'EXPIRED';
  claim_amount: number;
  reasoning: string;
  sha256_hash: string;
  dna_tree?: any;
}
