// Database migration runner — runs schema.sql against PostgreSQL
// Usage: npm run db:migrate

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('[migrate] Running CUBE Prep Manager schema migration...');
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[migrate] ✅ Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] ❌ Migration failed:', (err as Error).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
