import { db, all, run, get } from './db.js';
import { healthScore } from './ai.js';

let timer = null;

function gaussian(mean, sd) {
  return mean + (Math.random() + Math.random() - 1) * sd;
}

function nextReading(hive) {
  const stress = hive.stress_mode;
  const temp = gaussian(32.5 + stress * 5.5, 1.2);
  const humidity = gaussian(58 + stress * 14, 6);
  const weightBase = hive.base_weight_kg + 20;
  const drift = (Math.random() - 0.45) * 0.06;
  const last = get('SELECT weight_kg FROM sensor_readings WHERE hive_id = ? ORDER BY ts DESC LIMIT 1', hive.id);
  const weightPrevious = last ? last.weight_kg : (hive.base_weight_kg + 20);
  const weight = stress > 1 ? weightPrevious - 0.35 : Math.max(4, weightPrevious + drift);
  const sound = stress ? gaussian(880, 180) : gaussian(360, 140);
  const vibration = stress ? gaussian(85, 25) : gaussian(22, 12);
  const battery = gaussian(78 - stress * 12, 4);
  return { temp: +temp.toFixed(1), humidity: +humidity.toFixed(1), weight_kg: +weight.toFixed(2), sound_level: +Math.max(0, sound.toFixed(0)), vibration: +Math.max(0, vibration.toFixed(0)), battery_pct: +Math.max(0, Math.min(100, battery.toFixed(0))) };
}

function evaluate(hive, reading) {
  const prev = get('SELECT * FROM sensor_readings WHERE hive_id = ? ORDER BY ts DESC LIMIT 1 OFFSET 1', hive.id) ||
               get('SELECT * FROM sensor_readings WHERE hive_id = ? ORDER BY ts DESC LIMIT 1', hive.id);
  const res = healthScore(reading, prev || null);
  const active = res.issues.length > 0;
  if (active) {
    const sorted = res.issues.filter(i => i.severity === 'critical').length ? res.issues.filter(i => i.severity === 'critical') : res.issues;
    const top = sorted[0];
    const exists = get("SELECT id FROM alerts WHERE hive_id=? AND type=? AND resolved=0 ORDER BY id DESC LIMIT 1", hive.id, top.param);
    if (!exists) {
      run('INSERT INTO alerts (hive_id, type, severity, message, ai_analysis) VALUES (?,?,?,?,?)',
        hive.id, top.param, top.severity,
        `${hive.hive_no} requires attention. ${top.detail}`,
        JSON.stringify({ score: res.score, issues: res.issues, note: 'AI-assisted early warning based on live IoT sensor trends. Not a definitive disease diagnosis — verify on-site.' }));
    }
  } else {
    const open = get("SELECT id FROM alerts WHERE hive_id=? AND resolved=0", hive.id);
    if (open) run("UPDATE alerts SET resolved=1 WHERE hive_id=? AND resolved=0", hive.id);
  }
  const newStatus = res.status === 'healthy' ? 'healthy' : res.status;
  if (newStatus !== hive.status) run('UPDATE hives SET status=? WHERE id=?', newStatus, hive.id);
  return res;
}

function tick() {
  const hives = all('SELECT * FROM hives');
  const now = Date.now();
  for (const hive of hives) {
    const reading = nextReading(hive);
    run('INSERT INTO sensor_readings (hive_id, ts, temp, humidity, weight_kg, sound_level, vibration, battery_pct, source) VALUES (?,?,?,?,?,?,?,?,?)',
      hive.id, now, reading.temp, reading.humidity, reading.weight_kg, reading.sound_level, reading.vibration, reading.battery_pct, 'sim');
    evaluate(hive, reading);
  }
  // prune: keep last 3000 readings/hive
  const ids = all('SELECT id, COUNT(*) c FROM sensor_readings GROUP BY hive_id HAVING c > 3000');
  for (const row of ids) {
    const excess = get('SELECT id FROM sensor_readings WHERE hive_id=? ORDER BY ts LIMIT ?', row.hive_id, row.c - 3000);
    if (excess) run('DELETE FROM sensor_readings WHERE hive_id=? AND id<=?', row.hive_id, excess.id);
  }
}

export function startIotSim(intervalMs = 4000) {
  if (timer) return;
  tick();
  timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref();
}

export function applyManualReading(hiveId, overrides) {
  const hive = get('SELECT * FROM hives WHERE id=?', hiveId);
  const now = Date.now();
  const reading = nextReading(hive);
  const clean = Object.fromEntries(Object.entries(overrides || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const merged = { temp: reading.temp, humidity: reading.humidity, weight_kg: reading.weight_kg, sound_level: reading.sound_level, vibration: reading.vibration, battery_pct: reading.battery_pct, ...clean };
  run('INSERT INTO sensor_readings (hive_id, ts, temp, humidity, weight_kg, sound_level, vibration, battery_pct, source) VALUES (?,?,?,?,?,?,?,?,?)',
    hiveId, now, merged.temp, merged.humidity, merged.weight_kg, merged.sound_level, merged.vibration, merged.battery_pct, 'manual');
  return { ...evaluate(hive, merged), reading: merged, ts: now };
}

export function forceBackfill(hiveId, minutes = 120) {
  const hive = get('SELECT * FROM hives WHERE id=?', hiveId);
  const now = Date.now();
  let weight = hive.base_weight_kg + 16 + Math.random() * 8;
  const step = Math.floor(60000 * ((30 * 60) / 120)); // ~15 min steps over 2h -> 8 pts
  for (let t = now - minutes * 60000; t <= now; t += Math.max(step, 60000)) {
    weight += (Math.random() - 0.45) * 0.05;
    const reading = {
      temp: +gaussian(32.5, 1.2).toFixed(1),
      humidity: +gaussian(58, 6).toFixed(1),
      weight_kg: +weight.toFixed(2),
      sound_level: +Math.max(0, gaussian(360, 140).toFixed(0)),
      vibration: +Math.max(0, gaussian(22, 12).toFixed(0)),
      battery_pct: 82,
    };
    run('INSERT INTO sensor_readings (hive_id, ts, temp, humidity, weight_kg, sound_level, vibration, battery_pct, source) VALUES (?,?,?,?,?,?,?,?,?)', hiveId, t, reading.temp, reading.humidity, reading.weight_kg, reading.sound_level, reading.vibration, reading.battery_pct, 'backfill');
  }
}