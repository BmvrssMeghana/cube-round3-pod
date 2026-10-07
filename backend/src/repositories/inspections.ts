// Inspection repository — all DB operations for inspections
import { query } from '../db/pool.js';

export interface DbInspection {
  id: string;
  record_id: string;
  schema_version: string;
  organization_id: string;
  client_id: string | null;
  agent: string;
  unit_id: string;
  product_id: string | null;
  sku: string;
  asin: string;
  fnsku: string;
  shipment_id: string;
  work_order_id: string;
  operator_id: string;
  created_at: string;
  overall_status: 'PASS' | 'FAIL' | 'REVIEW' | 'PENDING';
  prep_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  cost_estimate: number;
  latency_ms: number;
  content_hash: string;
  status: string;
  is_fixture: boolean;
  fixture_label?: string;
  reinspection_of?: string;
}

export async function getInspections(orgId: string, limit = 100, offset = 0) {
  const { rows } = await query(
    `SELECT * FROM inspections
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );
  return rows as DbInspection[];
}

export async function getInspectionById(id: string, orgId: string) {
  const { rows } = await query(
    `SELECT i.*,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'key', img.key, 'sha256', img.sha256, 'bytes', img.bytes,
           'taken_at', img.taken_at, 'angle', img.angle,
           'quality_status', img.quality_status, 'quality_reason', img.quality_reason,
           'url', img.url
         )) FILTER (WHERE img.id IS NOT NULL), '[]'
       ) AS images,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'check_key', c.check_key, 'verdict', c.verdict, 'confidence', c.confidence,
           'rule_id', c.rule_id, 'rule_name', c.rule_name, 'rule_source', c.rule_source,
           'observation', c.observation, 'evidence_images', c.evidence_images,
           'recommended_action', c.recommended_action, 'failure_reason', c.failure_reason,
           'model_version', c.model_version, 'latency_ms', c.latency_ms
         )) FILTER (WHERE c.id IS NOT NULL), '[]'
       ) AS checks,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'id', ae.id, 'inspection_id', ae.inspection_id, 'agent', ae.agent,
           'event', ae.event, 'status', ae.status, 'timestamp', ae.timestamp,
           'latency_ms', ae.latency_ms, 'metadata', ae.metadata
         )) FILTER (WHERE ae.id IS NOT NULL), '[]'
       ) AS agent_events,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'check_key', ov.check_key, 'from_verdict', ov.from_verdict,
           'to_verdict', ov.to_verdict, 'reason', ov.reason,
           'by', ov.by_user, 'at', ov.at
         )) FILTER (WHERE ov.id IS NOT NULL), '[]'
       ) AS overrides
     FROM inspections i
     LEFT JOIN inspection_images img ON img.inspection_id = i.id
     LEFT JOIN inspection_checks c ON c.inspection_id = i.id
     LEFT JOIN agent_events ae ON ae.inspection_id = i.id
     LEFT JOIN inspection_overrides ov ON ov.inspection_id = i.id
     WHERE i.id = $1 AND i.organization_id = $2
     GROUP BY i.id`,
    [id, orgId]
  );
  return rows[0] || null;
}

export async function createInspection(data: {
  inspection: DbInspection;
  images: object[];
  checks: object[];
  agent_events: object[];
}) {
  const client = await (await import('../db/pool.js')).pool.connect();
  try {
    await client.query('BEGIN');

    const { inspection, images, checks, agent_events } = data;

    await client.query(
      `INSERT INTO inspections (
        id, record_id, schema_version, organization_id, client_id, agent,
        unit_id, product_id, sku, asin, fnsku, shipment_id, work_order_id,
        operator_id, created_at, overall_status, prep_risk, cost_estimate,
        latency_ms, content_hash, status, is_fixture, fixture_label, reinspection_of
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )`,
      [
        inspection.id, inspection.record_id, inspection.schema_version,
        inspection.organization_id, inspection.client_id, inspection.agent,
        inspection.unit_id, inspection.product_id, inspection.sku, inspection.asin,
        inspection.fnsku, inspection.shipment_id, inspection.work_order_id,
        inspection.operator_id, inspection.created_at, inspection.overall_status,
        inspection.prep_risk, inspection.cost_estimate, inspection.latency_ms,
        inspection.content_hash, inspection.status, inspection.is_fixture,
        inspection.fixture_label, inspection.reinspection_of
      ]
    );

    for (const img of images as Record<string, unknown>[]) {
      await client.query(
        `INSERT INTO inspection_images
          (inspection_id, key, sha256, bytes, taken_at, angle, quality_status, quality_reason, url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [inspection.id, img.key, img.sha256, img.bytes, img.taken_at, img.angle,
         img.quality_status, img.quality_reason || null, img.url || '']
      );
    }

    for (const c of checks as Record<string, unknown>[]) {
      await client.query(
        `INSERT INTO inspection_checks
          (inspection_id, check_key, verdict, confidence, rule_id, rule_name,
           rule_source, observation, evidence_images, recommended_action, failure_reason,
           model_version, latency_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [inspection.id, c.check_key, c.verdict, c.confidence ?? null,
         c.rule_id, c.rule_name, c.rule_source, c.observation,
         JSON.stringify(c.evidence_images || []),
         c.recommended_action || null, c.failure_reason || null,
         c.model_version, c.latency_ms]
      );
    }

    for (const ev of agent_events as Record<string, unknown>[]) {
      await client.query(
        `INSERT INTO agent_events (id, inspection_id, agent, event, status, timestamp, latency_ms, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ev.id, inspection.id, ev.agent, ev.event, ev.status || 'complete',
         ev.timestamp, ev.latency_ms, ev.metadata ? JSON.stringify(ev.metadata) : null]
      );
    }

    await client.query('COMMIT');
    return inspection;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMetrics(orgId: string) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE overall_status = 'PASS')::int AS pass,
       COUNT(*) FILTER (WHERE overall_status = 'FAIL')::int AS fail,
       COUNT(*) FILTER (WHERE overall_status = 'REVIEW')::int AS review,
       ROUND(AVG(latency_ms))::int AS avg_latency_ms,
       ROUND(AVG(cost_estimate)::numeric, 6) AS avg_cost
     FROM inspections
     WHERE organization_id = $1`,
    [orgId]
  );
  return rows[0];
}

export async function getFailurePatterns(orgId: string) {
  const { rows } = await query(
    `SELECT c.check_key, COUNT(*)::int AS count
     FROM inspection_checks c
     JOIN inspections i ON i.id = c.inspection_id
     WHERE i.organization_id = $1 AND c.verdict = 'fail'
     GROUP BY c.check_key
     ORDER BY count DESC
     LIMIT 20`,
    [orgId]
  );
  return rows;
}
