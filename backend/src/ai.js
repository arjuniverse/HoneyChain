import { get, all, run } from './db.js';

export const NORMAL_RANGES = {
  temp: [30, 36],
  humidity: [45, 65],
  weightDropPerDay: [0.05, 0.3],
  sound: [250, 550],
  vibration: [0, 60],
  battery: [20, 100],
};

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

export function healthScore(r, prev) {
  const issues = [];
  if (r.temp != null && (r.temp < NORMAL_RANGES.temp[0] || r.temp > NORMAL_RANGES.temp[1])) issues.push({ param: 'Temperature', value: `${r.temp}°C`, detail: `High temperature — ${r.temp}°C is above healthy range (${NORMAL_RANGES.temp[0]}-${NORMAL_RANGES.temp[1]}°C). Colony stress may indicate overheating or drought stress.`, severity: r.temp > 39 ? 'critical' : 'warning' });
  if (r.humidity != null && (r.humidity < NORMAL_RANGES.humidity[0] || r.humidity > NORMAL_RANGES.humidity[1])) issues.push({ param: 'Humidity', value: `${r.humidity}%`, detail: `Humidity ${r.humidity}% is outside healthy range (${NORMAL_RANGES.humidity[0]}-${NORMAL_RANGES.humidity[1]}%). Prolonged excess moisture risks fungal disease and fermentation of stored honey.`, severity: r.humidity > 78 ? 'critical' : 'warning' });
  if (r.sound_level != null && (r.sound_level < 120 || r.sound_level > 850)) issues.push({ param: 'Sound pattern', value: `${r.sound_level} a.u.`, detail: `Sound signature ${r.sound_level} deviates from normal band (120-850). Quiet/none may signal queen loss; loud high-pitched can indicate swarming or robbing.`, severity: 'warning' });
  if (r.vibration != null && r.vibration > 90) issues.push({ param: 'Vibration', value: `${r.vibration}`, detail: `Abnormal vibration ${r.vibration} may indicate animal disturbance or structural stress on the hive stand.`, severity: 'warning' });
  if (r.battery_pct != null && r.battery_pct < 20) issues.push({ param: 'Battery', value: `${r.battery_pct}%`, detail: `Sensor battery low (${r.battery_pct}%). Data gaps are possible — replace device battery soon.`, severity: 'warning' });
  if (prev && prev.weight_kg != null && r.weight_kg != null) {
    const delta = r.weight_kg - prev.weight_kg;
    if (delta < -1.2) issues.push({ param: 'Weight change', value: `${delta.toFixed(2)} kg`, detail: `Rapid weight loss of ${Math.abs(delta).toFixed(2)} kg — possible robbing, queen loss or disease. Inspect the hive on-ground.`, severity: 'critical' });
  }
  const penalty = issues.reduce((s, i) => s + (i.severity === 'critical' ? 30 : 12), 0);
  const score = clamp(100 - penalty, 0, 100);
  const worst = issues.filter(i => i.severity === 'critical');
  const status = worst.length ? 'critical' : issues.length ? 'warning' : 'healthy';
  return { score, status, issues, generatedAt: new Date().toISOString() };
}

export function summarizeHealth(readings) {
  const healthy = readings.filter(r => ['healthy', 'green'].includes(r.status));
  return {
    green: readings.filter(h => h.status === 'healthy').length,
    warning: readings.filter(h => h.status === 'warning').length,
    critical: readings.filter(h => h.status === 'critical').length,
    avgScore: readings.length ? Math.round(readings.reduce((s, h) => s + (h.score ?? 100), 0) / readings.length) : 100,
  };
}

export function predictYield(hiveId) {
  const hive = get('SELECT * FROM hives WHERE id = ?', hiveId);
  if (!hive) return null;
  const rows = all('SELECT ts, weight_kg FROM sensor_readings WHERE hive_id = ? AND weight_kg IS NOT NULL ORDER BY ts DESC LIMIT 400', hiveId);
  if (rows.length < 6) return null;
  const series = rows.reverse();
  const current = series[series.length - 1].weight_kg;
  const HARVEST_THRESHOLD = 42;       // kg target weight before extraction
  const BASE = hive.base_weight_kg;   // empty hive + brood weight
  const stored = clamp(current - BASE, 0, 60);

  const dayMs = 86400000;
  const now = Date.now();
  const recent = series.slice(-72);   // ~3 days of readings
  let gain = 0; let validPts = 0;
  const windowStart = recent[0].ts;
  const windowEnd = recent[recent.length - 1].ts;
  const spanDays = Math.max((windowEnd - windowStart) / dayMs, 0.08);
  gain = (current - recent[0].weight_kg) / spanDays;
  validPts = recent.length;

  const targetGain = gain > 0.01 ? gain : 0.15;
  const remainingKg = Math.max(HARVEST_THRESHOLD - current, 0);
  const daysToHarvest = Math.round(remainingKg / targetGain);
  const harvestDate = new Date(now + Math.max(daysToHarvest, 0) * dayMs + 3 * dayMs).toISOString().slice(0, 10);
  const confidence = clamp(0.93 - Math.abs(gain - 0.18) * 1.4 - (validPts < 20 ? 0.15 : 0), 0.55, 0.97);
  const spread = clamp(stored * 0.12, 0.3, 2.2) * (1 - (confidence - 0.5));
  const predicted = Math.max(0, stored + targetGain * 3);

  const factors = { gainKgPerDay: +gain.toFixed(3), storedHoneyKg: +stored.toFixed(2), weightSamples: validPts, harvestThresholdKg: HARVEST_THRESHOLD, model: 'weight-gain linear estimator (days~gain, production~stored+3d gain)' };
  if (get('SELECT id FROM predictions WHERE hive_id = ? ORDER BY id DESC LIMIT 1', hiveId)) {
    dbUpdate(hiveId, predicted, spread, harvestDate, confidence, factors);
  } else {
    dbInsert(hiveId, predicted, spread, harvestDate, confidence, factors);
  }
  return {
    hiveId,
    predictedKg: +predicted.toFixed(2),
    lowerKg: +Math.max(0, predicted - spread).toFixed(2),
    upperKg: +(predicted + spread).toFixed(2),
    harvestDate,
    daysToHarvest: Math.max(daysToHarvest, 0),
    confidence: +confidence.toFixed(2),
    currentWeightKg: +current.toFixed(2),
    storedHoneyKg: +stored.toFixed(2),
    factors,
  };
}

function dbUpdate(hiveId, predicted, spread, harvestDate, confidence, factors) {
  run('UPDATE predictions SET predicted_qty_kg=?, lower_kg=?, upper_kg=?, harvest_date=?, confidence=?, factors=? WHERE hive_id=?',
    +predicted.toFixed(2), +Math.max(0, predicted - spread).toFixed(2), +(predicted + spread).toFixed(2), harvestDate, +confidence.toFixed(2), JSON.stringify(factors), hiveId);
}
function dbInsert(hiveId, predicted, spread, harvestDate, confidence, factors) {
  run('INSERT INTO predictions (hive_id, ts, predicted_qty_kg, lower_kg, upper_kg, harvest_date, confidence, factors) VALUES (?,?,?,?,?,?,?,?)',
    hiveId, Date.now(), +predicted.toFixed(2), +Math.max(0, predicted - spread).toFixed(2), +(predicted + spread).toFixed(2), harvestDate, +confidence.toFixed(2), JSON.stringify(factors));
}