import 'dotenv/config';
import pg from 'pg';

/**
 * PostgreSQL persistence for the in-memory store (Railway / any Postgres).
 *
 * The app keeps its whole dataset in one in-memory object (see db.js) and calls
 * saveStore() after every mutation. This module persists that object as a single
 * JSONB document in the `app_state` table, so every field the app uses
 * (staffing groups, shifts, tenure rules, ...) is preserved without a rigid schema.
 *
 * On the very first boot (app_state empty) the app starts from its built-in seed
 * (hospital_flow_data.js) and writes it to Postgres on the first save.
 */

const { Pool, types } = pg;

// Return DATE / TIMESTAMPTZ as strings and NUMERIC as numbers, like the old JSON store.
types.setTypeParser(1082, v => v);                        // date -> 'YYYY-MM-DD'
types.setTypeParser(1114, v => v);                        // timestamp
types.setTypeParser(1184, v => new Date(v).toISOString()); // timestamptz -> ISO
types.setTypeParser(1700, v => (v === null ? null : Number(v))); // numeric

const connectionString = process.env.DATABASE_URL;
export const isPostgresConfigured = Boolean(connectionString);

let pool = null;
const STATE_KEY = 'main';

const needsSsl = (url) => {
  if (process.env.PGSSL === 'false') return false;
  if (process.env.PGSSL === 'true') return true;
  try {
    const host = new URL(url).hostname;
    return !(host === 'localhost' || host === '127.0.0.1' || host.endsWith('.railway.internal'));
  } catch {
    return false;
  }
};

const getPool = () => {
  if (!isPostgresConfigured) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
      max: 3
    });
    pool.on('error', err => console.warn('[PG] idle client error:', err.message));
  }
  return pool;
};

async function ensureStateTable(p) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Returns the stored dataset, or `fallbackDb` when Postgres is not configured,
 * unreachable, or still empty.
 */
export async function loadStoreFromPostgres(fallbackDb) {
  const p = getPool();
  if (!p) return fallbackDb;

  try {
    await ensureStateTable(p);
    const { rows } = await p.query('SELECT data FROM app_state WHERE key = $1', [STATE_KEY]);
    if (rows.length) {
      console.log('✅ Loaded data from PostgreSQL (app_state)');
      return rows[0].data;
    }

    console.log('ℹ️ PostgreSQL is empty. Starting from seed data.');
    return fallbackDb;
  } catch (err) {
    console.error('❌ PostgreSQL load failed:', err.message);
    // With a configured DB we must not silently run on stale local data in production.
    if (process.env.NODE_ENV === 'production') throw err;
    return fallbackDb;
  }
}

// --- Debounced, serialized writes -------------------------------------------
let pending = null;      // latest snapshot waiting to be written
let writing = false;
let timer = null;
const DEBOUNCE_MS = 400;

async function flush() {
  if (writing || !pending) return;
  const p = getPool();
  if (!p) { pending = null; return; }
  writing = true;
  const snapshot = pending;
  pending = null;
  try {
    await p.query(
      `INSERT INTO app_state (key, data, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [STATE_KEY, snapshot]
    );
  } catch (err) {
    console.error('[PG] Save failed:', err.message);
    if (!pending) pending = snapshot; // retry with the next save
  } finally {
    writing = false;
    if (pending) schedule();
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flush(); }, DEBOUNCE_MS);
}

/** Queue the current dataset for persistence (JSON string snapshot, safe from later mutation). */
export function queueSaveToPostgres(db) {
  if (!isPostgresConfigured) return;
  pending = JSON.stringify(db);
  schedule();
}

/** Write any queued snapshot immediately (used on shutdown). */
export async function flushPostgres() {
  if (timer) { clearTimeout(timer); timer = null; }
  while (writing) await new Promise(r => setTimeout(r, 25));
  await flush();
}

export async function closePostgres() {
  await flushPostgres();
  if (pool) { await pool.end(); pool = null; }
}
