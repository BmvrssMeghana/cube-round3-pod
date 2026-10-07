-- CUBE Prep Manager — PostgreSQL Schema
-- Run once against your database: psql $DATABASE_URL -f schema.sql
-- Compatible with Neon, Supabase, and standard PostgreSQL 14+

-- Enable UUID generation (available on most PG setups)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizations (id, name) VALUES
  ('org_demo_alpha', 'Demo Alpha'),
  ('org_demo_bravo', 'Demo Bravo')
ON CONFLICT DO NOTHING;

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  sku             TEXT NOT NULL,
  asin            TEXT NOT NULL,
  fnsku           TEXT NOT NULL,
  category        TEXT NOT NULL,
  prep_category   TEXT NOT NULL,
  description     TEXT NOT NULL,
  expiry_dated    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_org ON products(sku, organization_id);

-- ─── Inspections ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id               TEXT PRIMARY KEY,
  record_id        TEXT NOT NULL UNIQUE,
  schema_version   TEXT NOT NULL DEFAULT '1.1',
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  client_id        TEXT,
  agent            TEXT NOT NULL DEFAULT 'prep',
  unit_id          TEXT NOT NULL,
  product_id       TEXT,
  sku              TEXT NOT NULL,
  asin             TEXT NOT NULL,
  fnsku            TEXT NOT NULL,
  shipment_id      TEXT NOT NULL,
  work_order_id    TEXT NOT NULL,
  operator_id      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  overall_status   TEXT NOT NULL CHECK (overall_status IN ('PASS','FAIL','REVIEW','PENDING')),
  prep_risk        TEXT NOT NULL CHECK (prep_risk IN ('LOW','MEDIUM','HIGH')),
  cost_estimate    NUMERIC(10,6) NOT NULL,
  latency_ms       INTEGER NOT NULL,
  content_hash     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'complete',
  is_fixture       BOOLEAN NOT NULL DEFAULT FALSE,
  fixture_label    TEXT,
  reinspection_of  TEXT REFERENCES inspections(id)
);

CREATE INDEX IF NOT EXISTS idx_inspections_org ON inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created ON inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(overall_status);
CREATE INDEX IF NOT EXISTS idx_inspections_sku ON inspections(sku);

-- ─── Images ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_images (
  id              BIGSERIAL PRIMARY KEY,
  inspection_id   TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  sha256          TEXT NOT NULL,
  bytes           INTEGER NOT NULL,
  taken_at        TIMESTAMPTZ NOT NULL,
  angle           TEXT NOT NULL,
  quality_status  TEXT NOT NULL CHECK (quality_status IN ('ok','insufficient','warn')),
  quality_reason  TEXT,
  url             TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_images_inspection ON inspection_images(inspection_id);

-- ─── Checks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_checks (
  id                  BIGSERIAL PRIMARY KEY,
  inspection_id       TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  check_key           TEXT NOT NULL,
  verdict             TEXT NOT NULL CHECK (verdict IN ('pass','fail','uncertain','not_applicable','not_verifiable')),
  confidence          NUMERIC(5,4),
  rule_id             TEXT NOT NULL,
  rule_name           TEXT NOT NULL,
  rule_source         TEXT NOT NULL,
  observation         TEXT NOT NULL,
  evidence_images     JSONB NOT NULL DEFAULT '[]',
  recommended_action  TEXT,
  failure_reason      TEXT,
  model_version       TEXT NOT NULL,
  latency_ms          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checks_inspection ON inspection_checks(inspection_id);
CREATE INDEX IF NOT EXISTS idx_checks_verdict ON inspection_checks(verdict);
CREATE INDEX IF NOT EXISTS idx_checks_key ON inspection_checks(check_key);

-- ─── Agent Events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_events (
  id            TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  agent         TEXT NOT NULL,
  event         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'complete',
  timestamp     TIMESTAMPTZ NOT NULL,
  latency_ms    INTEGER NOT NULL,
  metadata      JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_inspection ON agent_events(inspection_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON agent_events(timestamp DESC);

-- ─── Overrides ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_overrides (
  id            BIGSERIAL PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  check_key     TEXT NOT NULL,
  from_verdict  TEXT NOT NULL,
  to_verdict    TEXT NOT NULL,
  reason        TEXT NOT NULL,
  by_user       TEXT NOT NULL,
  at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overrides_inspection ON inspection_overrides(inspection_id);
