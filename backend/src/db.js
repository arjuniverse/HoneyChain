import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const DB_PATH = process.env.HONEY_DB || join(dataDir, 'honeychain.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE, state TEXT, district TEXT, cluster TEXT
);
CREATE TABLE IF NOT EXISTS beekeepers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT, village TEXT, language TEXT DEFAULT 'en',
  region_id INTEGER REFERENCES regions(id),
  device_token TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  beekeeper_id INTEGER NOT NULL REFERENCES beekeepers(id),
  hive_no TEXT NOT NULL, name TEXT, model TEXT DEFAULT 'ES232',
  base_weight_kg REAL DEFAULT 18.0,
  stress_mode INTEGER DEFAULT 0,
  stress_since TEXT,
  status TEXT DEFAULT 'healthy',
  installed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hive_id INTEGER NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  ts INTEGER NOT NULL,
  temp REAL, humidity REAL, weight_kg REAL,
  sound_level REAL, vibration REAL, battery_pct REAL,
  source TEXT DEFAULT 'sim'
);
CREATE INDEX IF NOT EXISTS idx_readings_hive ON sensor_readings(hive_id, ts);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hive_id INTEGER REFERENCES hives(id) ON DELETE CASCADE,
  type TEXT, severity TEXT, message TEXT,
  ai_analysis TEXT, resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hive_id INTEGER REFERENCES hives(id) ON DELETE CASCADE,
  ts INTEGER, predicted_qty_kg REAL, lower_kg REAL, upper_kg REAL,
  harvest_date TEXT, confidence REAL, factors TEXT
);
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT UNIQUE NOT NULL,
  beekeeper_id INTEGER NOT NULL REFERENCES beekeepers(id),
  hive_id INTEGER REFERENCES hives(id),
  floral_source TEXT, qty_kg REAL, harvest_date TEXT,
  honey_type TEXT DEFAULT 'Raw Multi-floral Honey',
  status TEXT DEFAULT 'HARVESTED',
  qr_token TEXT UNIQUE, qr_revoked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blockchain (
  block_index INTEGER PRIMARY KEY,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  ts TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT, entity_id TEXT,
  actor TEXT, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quality_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT REFERENCES batches(batch_id),
  lab_code TEXT DEFAULT 'KVIC-Lab-BL', tester TEXT,
  moisture REAL, ph REAL, brix REAL, ec REAL,
  diastase REAL, hmf REAL,
  score REAL, status TEXT, adulteration_risk TEXT, notes TEXT,
  tested_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS qr_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT, ts TEXT DEFAULT (datetime('now')),
  location TEXT, device TEXT, ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_qrscans_batch ON qr_scans(batch_id, ts);
CREATE TABLE IF NOT EXISTS marketplace (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT UNIQUE REFERENCES batches(batch_id),
  seller_id INTEGER REFERENCES beekeepers(id),
  honey_type TEXT, listing_qty_kg REAL, price_per_kg REAL,
  status TEXT DEFAULT 'ACTIVE', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS weather_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER, temp REAL, rain_prob REAL, floral_index REAL,
  wind_kmh REAL, forecast TEXT
);
CREATE TABLE IF NOT EXISTS offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT, action TEXT, payload TEXT,
  status TEXT DEFAULT 'PENDING', created_at TEXT DEFAULT (datetime('now'))
);
`;

db.exec(SCHEMA);

function run(sql, ...params) {
  const stmt = db.prepare(sql);
  if (/^\s*(insert|update|delete)/i.test(trim(sql))) {
    const r = stmt.run(...params);
    return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }
  return stmt.run(...params);
}
function all(sql, ...params) { return db.prepare(sql).all(...params); }
function get(sql, ...params) { return db.prepare(sql).get(...params); }
function trim(s) { return s.trim(); }

export { run, all, get };

export const seedIfEmpty = (() => { let done = false; return () => done; })();