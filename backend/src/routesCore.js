import { Router } from 'express';
import { db, all, get, run } from './db.js';
import { healthScore, summarizeHealth, predictYield } from './ai.js';
import { applyManualReading, forceBackfill } from './iot.js';
import { chainStats } from './blockchain.js';

export const core = Router();

// lightweight role switch (prototype auth)
const USERS = [
  { id: 1, role: 'beekeeper', name: 'Ramesh Kumar', beekeeper_id: 1 },
  { id: 2, role: 'beekeeper', name: 'Sunita Patil', beekeeper_id: 2 },
  { id: 3, role: 'lab', name: 'Dr. Anita Kulkarni' },
  { id: 4, role: 'officer', name: 'KVIC Officer · Karnataka' },
  { id: 5, role: 'consumer', name: 'Consumer' },
  { id: 6, role: 'processor', name: 'Processor · Gokak Unit' },
];
core.get('/roles', (req, res) => res.json(USERS));
core.get('/me', (req, res) => {
  const u = USERS.find(x => x.id === Number(req.query.as || 1)) || USERS[0];
  res.json(u);
});

// ---- Beekeepers ----
core.get('/beekeepers', (req, res) => {
  const rows = all(`SELECT b.*, r.state, r.district, r.cluster,
    (SELECT COUNT(*) FROM hives h WHERE h.beekeeper_id=b.id) hives,
    (SELECT COUNT(*) FROM hives h WHERE h.beekeeper_id=b.id AND h.status!='healthy') attention,
    (SELECT COUNT(*) FROM batches bt WHERE bt.beekeeper_id=b.id) batches
    FROM beekeepers b LEFT JOIN regions r ON b.region_id=r.id ORDER BY b.id`);
  res.json(rows);
});
core.get('/beekeepers/:id', (req, res) => {
  const b = get('SELECT * FROM beekeepers WHERE id=?', req.params.id);
  res.json(b || null);
});
core.post('/beekeepers', (req, res) => {
  const { name, contact, village, language, state, district, cluster } = req.body;
  let region = get('SELECT id FROM regions WHERE state=? AND district=? AND cluster=?', state, district, cluster);
  if (!region) region = run('INSERT INTO regions (code, state, district, cluster) VALUES (?,?,?,?)', `${state}-${district}-${cluster}`.toUpperCase().slice(0, 10), state, district, cluster).lastInsertRowid;
  const r = run('INSERT INTO beekeepers (name, contact, village, language, region_id) VALUES (?,?,?,?,?)', name, contact, village, language || 'en', region.id || region);
  res.json(get('SELECT * FROM beekeepers WHERE id=?', r.lastInsertRowid));
});

// ---- Hives & live sensor status ----
function enrichHive(h) {
  const last = get('SELECT * FROM sensor_readings WHERE hive_id=? ORDER BY ts DESC LIMIT 1', h.id);
  const pred = get('SELECT * FROM predictions WHERE hive_id=? ORDER BY id DESC LIMIT 1', h.id);
  return {
    ...h, status: h.status || 'healthy',
    lastReading: last ? { ...last } : null,
    prediction: pred ? { predictedKg: pred.predicted_qty_kg, lowerKg: pred.lower_kg, upperKg: pred.upper_kg, harvestDate: pred.harvest_date, confidence: pred.confidence, daysToHarvest: Math.max(0, Math.round((new Date(pred.harvest_date) - new Date()) / 86400000)) } : null,
  };
}
core.get('/hives', (req, res) => {
  const beekeeperId = req.query.beekeeper_id;
  const hives = beekeeperId ? all('SELECT * FROM hives WHERE beekeeper_id=? ORDER BY hive_no', beekeeperId) : all('SELECT * FROM hives ORDER BY id');
  res.json(hives.map(enrichHive));
});
core.get('/hives/health', (req, res) => {
  const hives = all('SELECT * FROM hives').map(enrichHive);
  res.json(summarizeHealth(hives.map(h => ({ status: h.status, score: 100 }))));
});
core.get('/alerts', (req, res) => {
  const beekeeperId = req.query.beekeeper_id;
  const rows = beekeeperId === undefined
    ? all('SELECT a.*, h.hive_no, h.beekeeper_id FROM alerts a JOIN hives h ON h.id=a.hive_id ORDER BY a.created_at DESC LIMIT 50')
    : all('SELECT a.*, h.hive_no FROM alerts a JOIN hives h ON h.id=a.hive_id WHERE h.beekeeper_id=? ORDER BY a.created_at DESC LIMIT 50', beekeeperId);
  res.json(rows.map(a => ({ ...a, ai_analysis: a.ai_analysis ? JSON.parse(a.ai_analysis) : null })));
});
core.get('/hives/:id', (req, res) => {
  const h = get('SELECT * FROM hives WHERE id=?', req.params.id);
  res.json(h ? enrichHive(h) : null);
});
core.get('/hives/:id/readings', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const hive = get('SELECT * FROM hives WHERE id=?', req.params.id);
  const readings = all(`SELECT * FROM sensor_readings WHERE hive_id=? ORDER BY ts DESC LIMIT ?`, req.params.id, limit).reverse();
  res.json({ hive, readings });
});
core.get('/hives/:id/alerts', (req, res) => {
  const alerts = all('SELECT * FROM alerts WHERE hive_id=? ORDER BY created_at DESC LIMIT 30', req.params.id);
  res.json(alerts.map(a => ({ ...a, ai_analysis: a.ai_analysis ? JSON.parse(a.ai_analysis) : null })));
});
core.post('/hives/:id/simulate', (req, res) => {
  const { temp, humidity, weight_kg, sound_level, vibration, battery_pct } = req.body || {};
  const out = applyManualReading(Number(req.params.id), { temp, humidity, weight_kg, sound_level, vibration, battery_pct });
  res.json(out);
});
core.post('/hives/:id/stress', (req, res) => {
  const level = Math.max(0, Math.min(2, Number(req.body.level) || 0));
  run('UPDATE hives SET stress_mode=? WHERE id=?', level, req.params.id);
  applyManualReading(Number(req.params.id), {});
  res.json(get('SELECT id, stress_mode, status FROM hives WHERE id=?', req.params.id));
});
core.post('/hives', (req, res) => {
  const { beekeeper_id, hive_no, name } = req.body;
  const r = run('INSERT INTO hives (beekeeper_id, hive_no, name) VALUES (?,?,?)', beekeeper_id, hive_no, name || `Hive ${hive_no}`);
  res.json(get('SELECT * FROM hives WHERE id=?', r.lastInsertRowid));
});

// ---- AI prediction ----
core.get('/hives/:id/predict', (req, res) => {
  res.json(predictYield(Number(req.params.id)));
});
core.get('/predictions', (req, res) => {
  const preds = all('SELECT * FROM predictions ORDER BY id DESC');
  res.json(preds);
});

// ---- Weather / floral intelligence ----
core.get('/weather', (req, res) => {
  const rows = all('SELECT * FROM weather_log ORDER BY ts');
  const now = Date.now();
  const base = get('SELECT * FROM weather_log ORDER BY ts DESC LIMIT 1');
  const forecast = [];
  for (let d = 0; d < 5; d++) {
    forecast.push({
      date: new Date(now + (d + 1) * 86400000).toISOString().slice(0, 10),
      temp: +(base.temp + Math.sin(d) * 1.5).toFixed(1),
      rainProb: Math.max(0, Math.min(90, Math.round(base.rain_prob + (d === 2 ? 15 : -8)))),
      floralIndex: +(Math.min(1, base.floral_index + Math.sin(d) * 0.04)).toFixed(2),
      wind: Math.round(base.wind_kmh + d * 1.2),
    });
  }
  const conditions = get('SELECT * FROM weather_log ORDER BY ts DESC LIMIT 1');
  const recommendation = conditions.rain_prob > 50
    ? 'High rain probability — bees will forage less. Consider delaying hive inspections and protect supers.'
    : conditions.floral_index > 0.7
      ? 'Good foraging conditions expected over the next 5 days. Ideal to add supers for surplus honey storage.'
      : 'Moderate foraging conditions. Monitor bloom of mustard/eucalyptus sources nearby.';
  res.json({ now: conditions, forecast, recommendation, sources: ['IMD (simulated)', 'Bloom calendar · KVIC NAFIS'] });
});

// ---- Digital assistant (voice/text, multilingual) ----
const INTENTS = {
  hiveHealth: { en: ['healthy', 'hive health', 'status', 'kitni', 'how is'], hi: ['स्वस्थ', 'कैसा', 'स्थिति'], kn: ['ಆರೋಗ್ಯ', 'ಹೇಗಿದೆ', 'ಸ್ಥಿತಿ'] },
  prediction: { en: ['predict', 'harvest', 'fkore', 'when'], hi: ['भविष्यवाणी', 'फसल'], kn: ['ಊಹೆ', 'ಫಸಲು', 'ಯಾವಾಗ'] },
  weather: { en: ['weather', 'rain', 'mausam'], hi: ['मौसम', 'बारिश'], kn: ['ಹವಾಮಾನ', 'ಮಳೆ'] },
  alerts: { en: ['alert', 'attention', 'problem','issue'], hi: ['नोटिस'], kn: ['ಎಚ್ಚರಿಕೆ'] },
};
core.post('/assistant', (req, res) => {
  const { text } = req.body || {};
  const lower = (text || '').toLowerCase();
  const hiveM = lower.match(/(?:hive|hive no|hive)\s*(\d{1,2})/i) || lower.match(/^(\d{1,2})\b/) ;
  const hiveId = hiveM ? hiveM[1] : (req.query.hive_id || 7);
  const hive = get("SELECT * FROM hives WHERE (hive_no = ? OR id = ?) LIMIT 1", String(hiveId).padStart(2, '0'), String(hiveId));
  let intent = 'hiveHealth';
  for (const [k, v] of Object.entries(INTENTS)) {
    if (v.en.some(x => lower.includes(x)) || v.hi.some(x => lower.includes(x)) || v.kn.some(x => lower.includes(x))) { intent = k; break; }
  }
  if (intent === 'hiveHealth' && hive) {
    const health = hive.status;
    const last = get('SELECT * FROM sensor_readings WHERE hive_id=? ORDER BY ts DESC LIMIT 1', hive.id);
    const msg = health === 'healthy'
      ? `${hive.hive_no} is healthy. Temperature ${last.temp}°C, humidity ${last.humidity}%, no abnormal pattern detected.`
      : `${hive.hive_no} needs attention. ${get('SELECT message FROM alerts WHERE hive_id=? AND resolved=0 ORDER BY id DESC LIMIT 1', hive.id)?.message || 'One or more sensors are outside normal range, please visit the apiary.'}`;
    res.json({ intent, hiveNo: hive.hive_no, status: health, reply: msg, voice: msg });
  } else if (intent === 'prediction') {
    const p = predictYield(hive?.id || Number(hiveId));
    const reply = p ? `Expected harvest for ${hive.hive_no}: ${p.predictedKg} kg (±${(p.upperKg - p.predictedKg).toFixed(1)}). Estimated date: ${p.harvestDate}. Confidence ${Math.round(p.confidence * 100)}%.` : `Not enough data yet for ${hiveId}.`;
    res.json({ intent, reply, voice: reply });
  } else if (intent === 'weather') {
    const w = get('SELECT * FROM weather_log ORDER BY ts DESC LIMIT 1');
    const reply = `Current temperature ${w.temp}°C, rain probability ${w.rain_prob}%. ${req.body.lang === 'hi' ? 'मौसम अच्छा है, मधुमक्खी दाना जुटा सकती हैं।' : 'Foraging conditions look favourable. Good days for bee activity ahead.'}`;
    res.json({ intent, reply, voice: reply });
  } else if (intent === 'alerts') {
    const alerts = get('SELECT * FROM alerts WHERE hive_id=? AND resolved=0 ORDER BY id DESC LIMIT 1', hive?.id || Number(hiveId));
    res.json({ intent, reply: alerts ? `Open alert: ${alerts.message}` : 'No open alerts. All hives look fine.', voice: '' });
  } else {
    res.json({ intent, reply: 'I found your hive status: ' + (hive?.status || 'unknown') });
  }
});

core.get('/system', (req, res) => {
  res.json({
    chain: chainStats(),
    db: '__honey_chain_demo__',
    iot: { active: true, intervalMs: 4000, transport: 'MQTT/HTTP (ESP32 simulated)' },
    schemaVersion: '1.0.0-prototype',
  });
});
core.get('/debug/scan-qr', (_q, res) => res.json({ ok: true }));