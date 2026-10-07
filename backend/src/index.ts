// CUBE Prep Manager — Express API Server
// Connects to PostgreSQL (pgsql4 / Neon / Supabase)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db/pool.js';
import {
  getInspections,
  getInspectionById,
  createInspection,
  getMetrics,
  getFailurePatterns,
} from './repositories/inspections.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now, version() AS pg_version');
    res.json({
      status: 'ok',
      service: 'cube-prep-manager-api',
      db: 'connected',
      pg_version: (rows[0] as Record<string, string>).pg_version?.split(' ')[0],
      server_time: (rows[0] as Record<string, string>).now,
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Inspections ──────────────────────────────────────────────────────────────

// GET /api/orgs/:orgId/inspections
app.get('/api/orgs/:orgId/inspections', async (req, res) => {
  try {
    const { orgId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const inspections = await getInspections(orgId, limit, offset);
    res.json({ data: inspections, count: inspections.length });
  } catch (err) {
    console.error('[API] GET inspections:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orgs/:orgId/inspections/:id
app.get('/api/orgs/:orgId/inspections/:id', async (req, res) => {
  try {
    const { orgId, id } = req.params;
    const inspection = await getInspectionById(id, orgId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }
    res.json({ data: inspection });
  } catch (err) {
    console.error('[API] GET inspection:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orgs/:orgId/inspections
app.post('/api/orgs/:orgId/inspections', async (req, res) => {
  try {
    const { orgId } = req.params;
    const body = req.body as {
      inspection: Parameters<typeof createInspection>[0]['inspection'];
      images: object[];
      checks: object[];
      agent_events: object[];
    };

    // Enforce org isolation
    if (body.inspection.organization_id !== orgId) {
      return res.status(400).json({ error: 'Organization mismatch' });
    }

    const result = await createInspection({
      inspection: body.inspection,
      images: body.images || [],
      checks: body.checks || [],
      agent_events: body.agent_events || [],
    });

    res.status(201).json({ data: result });
  } catch (err) {
    console.error('[API] POST inspection:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Metrics ─────────────────────────────────────────────────────────────────

// GET /api/orgs/:orgId/metrics
app.get('/api/orgs/:orgId/metrics', async (req, res) => {
  try {
    const { orgId } = req.params;
    const [metrics, failures] = await Promise.all([
      getMetrics(orgId),
      getFailurePatterns(orgId),
    ]);
    res.json({ data: { ...metrics, failure_patterns: failures } });
  } catch (err) {
    console.error('[API] GET metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[API] CUBE Prep Manager backend running on port ${PORT}`);
  console.log(`[API] CORS allowed origin: ${ALLOWED_ORIGIN}`);
  console.log(`[API] DB: ${process.env.DATABASE_URL ? 'PostgreSQL connected' : 'No DATABASE_URL — DB calls will fail'}`);
});

export default app;
