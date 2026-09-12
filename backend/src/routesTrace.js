import { Router } from 'express';
import { db, all, get, run } from './db.js';
import { addBlock, getChain, verifyChain, chainStats } from './blockchain.js';
import { predictYield } from './ai.js';

export const trace = Router();

function batchDetail(batchId) {
  const b = get('SELECT * FROM batches WHERE batch_id=?', batchId);
  if (!b) return null;
  const bk = get('SELECT b.*, r.state, r.district, r.cluster FROM beekeepers b LEFT JOIN regions r ON b.region_id=r.id WHERE b.id=?', b.beekeeper_id);
  const q = get('SELECT * FROM quality_results WHERE batch_id=?', batchId);
  const chain = getChain('batch', b.id);
  const scans = all('SELECT * FROM qr_scans WHERE batch_id=? ORDER BY ts', batchId);
  const market = get('SELECT * FROM marketplace WHERE batch_id=?', batchId);
  const suspicious = analyzeScans(scans);
  return { batch: { ...b, beekeeper: bk, quality: q, marketplaceListing: market, journey: chain, scan_count: scans.length, suspicious } };
}

function analyzeScans(scans) {
  if (scans.length === 0) return { flag: false };
  const recent = scans.slice(-5);
  const locations = new Set(scans.map(s => s.location));
  const fastWindowMs = 120000;
  const rapid = recent.length >= 4 && (new Date(recent[recent.length - 1].ts) - new Date(recent[recent.length - 5].ts)) < fastWindowMs;
  const geoSpread = locations.size > 2 && scans.length >= 4;
  const flagged = scans.length > 12 || rapid || geoSpread;
  return { flag: flagged, reason: flagged ? (rapid ? 'Same QR scanned very rapidly' : geoSpread ? 'Scans from widely separated locations' : 'Abnormally high number of scans') : null, locations: [...locations], firstSeen: scans[0].ts, lastSeen: scans[scans.length - 1].ts };
}

// ---- Batches ----
trace.get('/batches', (req, res) => {
  const beekeeperId = req.query.beekeeper_id;
  const rows = beekeeperId ? all('SELECT * FROM batches WHERE beekeeper_id=? ORDER BY id DESC', beekeeperId) : all('SELECT * FROM batches ORDER BY id DESC');
  res.json(rows.map(b => ({ ...b, journeyCount: getChain('batch', b.id).length })));
});
trace.get('/batches/:batchId', (req, res) => res.json(batchDetail(req.params.batchId)));
trace.post('/batches', (req, res) => {
  const { beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type } = req.body;
  const year = new Date().getFullYear();
  const seq = get('SELECT COUNT(*) c FROM batches WHERE batch_id LIKE ?', `HC-%-${year}-%`).c + 1;
  const batchId = `HC-KA-${year}-${String(seq).padStart(6, '0')}`;
  const qrToken = `QR-${batchId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const r = run('INSERT INTO batches (batch_id, beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type, status, qr_token) VALUES (?,?,?,?,?,?,?,?,?)',
    batchId, beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type || 'Raw Multi-floral Honey', 'HARVESTED', qrToken);
  const bk = get('SELECT name FROM beekeepers WHERE id=?', beekeeper_id);
  addBlock({ eventType: 'HARVEST', entityType: 'batch', entityId: r.lastInsertRowid, actor: `${bk.name} (Beekeeper)`, payload: { batchId, hive: `Hive ${get('SELECT hive_no FROM hives WHERE id=?', hive_id)?.hive_no}`, qtyKg: qty_kg, floralSource: floral_source, harvestDate: harvest_date } });
  const iv = predictYield(hive_id || 0);
  void iv;
  res.json(get('SELECT * FROM batches WHERE id=?', r.lastInsertRowid));
});
trace.post('/batches/:batchId/event', (req, res) => {
  const b = get('SELECT * FROM batches WHERE batch_id=?', req.params.batchId);
  if (!b) return res.status(404).json({ error: 'batch not found' });
  const { event_type, actor, payload } = req.body;
  addBlock({ eventType: event_type, entityType: 'batch', entityId: b.id, actor: actor || 'System', payload: { ...payload, batchId: req.params.batchId } });
  const statusMap = { QUALITY_TESTED: 'LAB_TESTED', PROCESSED: 'PROCESSED', PACKAGED: 'PACKAGED', OWNERSHIP_TRANSFER: 'IN_TRANSIT', SOLD: 'DELIVERED', REJECTED: 'REJECTED' };
  if (statusMap[event_type]) run('UPDATE batches SET status=? WHERE id=?', statusMap[event_type], b.id);
  res.json(batchDetail(req.params.batchId));
});
trace.get('/chain/verify', (_q, res) => res.json(verifyChain()));
trace.get('/chain/stats', (_q, res) => res.json(chainStats()));
trace.get('/chain', (_q, res) => res.json(all('SELECT * FROM blockchain ORDER BY block_index').map(b => ({ index: b.block_index, hash: b.hash, prevHash: b.prev_hash, ts: b.ts, event: b.event_type, actor: b.actor }))));

// ---- Quality (lab) ----
trace.get('/lab/queue', (_q, res) => {
  const rows = all(`SELECT * FROM batches WHERE status IN ('HARVESTED','LAB_TESTED') ORDER BY id DESC`);
  res.json(rows.map(b => ({ ...b, quality: get('SELECT * FROM quality_results WHERE batch_id=?', b.batch_id) })));
});
trace.post('/lab/qualify', (req, res) => {
  const { batch_id, lab_code, tester, moisture, ph, brix, ec, diastase, hmf, notes } = req.body;
  const m = Number(moisture) || 0, phV = Number(ph) || 0, br = Number(brix) || 0, ecV = Number(ec) || 0;
  let score = 100;
  score -= Math.max(0, (m - 17.5) * 4.2);        // moisture penalty above 17.5%
  score -= Math.abs(phV - 4.15) * 6;             // ph deviation
  score -= br < 78 ? (78 - br) * 1.1 : 0;        // low brix
  score -= ecV > 0.8 ? (ecV - 0.8) * 18 : 0;     // high conductivity => mineral/adulterant suspicion
  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 70 ? 'PASSED' : score >= 45 ? 'SUSPECT' : 'REJECTED';
  const risk = score >= 85 ? 'LOW' : score >= 70 ? 'MEDIUM' : score >= 45 ? 'HIGH' : 'CRITICAL';
  const existing = get('SELECT id FROM quality_results WHERE batch_id=?', batch_id);
  if (existing) run('UPDATE quality_results SET lab_code=?, tester=?, moisture=?, ph=?, brix=?, ec=?, diastase=?, hmf=?, score=?, status=?, adulteration_risk=?, notes=? WHERE batch_id=?', lab_code, tester, m, phV, br, ecV, diastase, hmf, score, status, risk, notes, batch_id);
  else run('INSERT INTO quality_results (batch_id, lab_code, tester, moisture, ph, brix, ec, diastase, hmf, score, status, adulteration_risk, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', batch_id, lab_code, tester, m, phV, br, ecV, diastase, hmf, score, status, risk, notes);
  const b = get('SELECT * FROM batches WHERE batch_id=?', batch_id);
  addBlock({ eventType: 'QUALITY_TESTED', entityType: 'batch', entityId: b.id, actor: `${tester} (${lab_code})`, payload: { batchId: batch_id, labCode: lab_code, score, status, moisture: m, brix: br, ph: phV, adulterationRisk: risk, aiScreening: 'rule-based screening — certified lab result determines release' } });
  return res.json({ batch_id, score, status, adulteration_risk: risk, parameters: { moisture: m, ph: phV, brix: br, ec: ecV, diastase: diastase || null, hmf: hmf || null }, chainEventAdded: true });
});
trace.get('/lab/results', (_q, res) => res.json(all('SELECT * FROM quality_results ORDER BY tested_at DESC')));

// ---- QR verification & anti-counterfeit ----
trace.post('/qr/verify', (req, res) => {
  const { qr, location, device } = req.body;
  let batchId = (qr || '').trim();
  const m = batchId.match(/HC-[A-Z]{2}-\d{4}-\d{6}/);
  if (!m) return res.status(400).json({ error: 'Invalid QR code. Expected a Honey Chain batch QR.' });
  batchId = m[0];
  const b = get('SELECT * FROM batches WHERE batch_id=?', batchId);
  if (!b) return res.json({ valid: false, reason: 'batch_not_found' });
  if (b.qr_revoked) return res.json({ valid: false, reason: 'qr_revoked', message: 'This QR has been revoked by the issuing authority.' });
  const loc = location || 'Unknown';
  run('INSERT INTO qr_scans (batch_id, location, device) VALUES (?,?,?)', batchId, loc, device || 'web');
  const scans = all('SELECT * FROM qr_scans WHERE batch_id=? ORDER BY ts DESC LIMIT 30', batchId);
  const suspicious = analyzeScans(scans);
  const verdict = suspicious.flag ? { valid: true, suspicious: true } : { valid: true, suspicious: false };
  res.json({ ...verdict, batchId, batch: batchDetail(batchId), scans: scans.reverse(), suspicious });
});
trace.get('/qr/scan-history/:batchId', (req, res) => {
  const scans = all('SELECT * FROM qr_scans WHERE batch_id=? ORDER BY ts', req.params.batchId);
  res.json({ batchId: req.params.batchId, count: scans.length, scans, suspicious: analyzeScans(scans) });
});
trace.get('/counterfeit/alerts', (_q, res) => {
  const batches = all('SELECT * FROM batches');
  const rows = [];
  for (const b of batches) {
    const scans = all('SELECT * FROM qr_scans WHERE batch_id=? ORDER BY ts', b.batch_id);
    const s = analyzeScans(scans);
    if (s.flag) rows.push({ batchId: b.batch_id, beekeeper: get('SELECT name FROM beekeepers WHERE id=?', b.beekeeper_id)?.name, scanCount: scans.length, reason: s.reason, locations: s.locations });
  }
  res.json(rows);
});

// ---- Marketplace ----
trace.get('/marketplace', (_q, res) => {
  const rows = all(`SELECT m.*, b.batch_id, b.floral_source, b.beekeeper_id, bk.name seller, bk.village,
    q.score, q.status quality_status, q.adulteration_risk
    FROM marketplace m JOIN batches b ON b.batch_id=m.batch_id JOIN beekeepers bk ON bk.id=m.seller_id LEFT JOIN quality_results q ON q.batch_id=b.batch_id WHERE m.status='ACTIVE'`);
  res.json(rows);
});
trace.post('/marketplace', (req, res) => {
  const { batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg } = req.body;
  try {
    const r = run('INSERT INTO marketplace (batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg) VALUES (?,?,?,?,?)', batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg);
    res.json(get('SELECT * FROM marketplace WHERE id=?', r.lastInsertRowid));
  } catch (e) { res.status(400).json({ error: 'Batch already listed or invalid' }); }
});

// ---- Admin / KVIC dashboard ----
trace.get('/admin/stats', (_q, res) => {
  res.json({
    beekeepers: get('SELECT COUNT(*) c FROM beekeepers').c,
    hives: get('SELECT COUNT(*) c FROM hives').c,
    healthy: get("SELECT COUNT(*) c FROM hives WHERE status='healthy'").c,
    warning: get("SELECT COUNT(*) c FROM hives WHERE status='warning'").c,
    critical: get("SELECT COUNT(*) c FROM hives WHERE status='critical'").c,
    batches: get('SELECT COUNT(*) c FROM batches').c,
    verified: get('SELECT COUNT(*) c FROM batches WHERE status IN (\'LAB_TESTED\',\'PROCESSED\',\'PACKAGED\',\'IN_TRANSIT\',\'DELIVERED\')').c,
    pendingLab: get("SELECT COUNT(*) c FROM batches WHERE status='HARVESTED'").c,
    openAlerts: get('SELECT COUNT(*) c FROM alerts WHERE resolved=0').c,
    totalQrScans: get('SELECT COUNT(*) c FROM qr_scans').c,
    counterfeit: (() => { let n = 0; for (const b of all('SELECT batch_id FROM batches')) { const s = all('SELECT * FROM qr_scans WHERE batch_id=?', b.batch_id); if (analyzeScans(s).flag) n++; } return n; })(),
    verifiedChain: chainStats().integrity === 'VERIFIED',
    chainBlocks: chainStats().blocks,
    productionLiters: get('SELECT COALESCE(SUM(qty_kg),0) t FROM batches').t,
  });
});
trace.get('/admin/regions', (_q, res) => res.json(all('SELECT * FROM regions')));
trace.get('/admin/drilldown', (_q, res) => {
  const states = all('SELECT DISTINCT state FROM regions');
  res.json(states.map(s => ({
    state: s.state,
    districts: all('SELECT DISTINCT district FROM regions WHERE state=?', s.state).map(d => ({
      district: d.district,
      clusters: all('SELECT DISTINCT cluster FROM regions WHERE state=? AND district=?', s.state, d.district).map(c => ({
        cluster: c.cluster,
        beekeepers: all(`SELECT b.id, b.name, b.village, (SELECT COUNT(*) FROM hives h WHERE h.beekeeper_id=b.id) hives FROM beekeepers b JOIN regions r ON r.id=b.region_id WHERE r.state=? AND r.district=? AND r.cluster=?`, s.state, d.district, c.cluster),
      })),
    })),
  })));
});
trace.get('/admin/alerts', (_q, res) => res.json(all('SELECT a.*, h.hive_no, h.beekeeper_id FROM alerts a JOIN hives h ON h.id=a.hive_id ORDER BY a.created_at DESC LIMIT 50').map(a => ({ ...a, ai_analysis: a.ai_analysis ? JSON.parse(a.ai_analysis) : null }))));
trace.get('/admin/production-series', (_q, res) => {
  const rows = all('SELECT harvest_date, qty_kg, batch_id FROM batches ORDER BY harvest_date');
  const byMonth = {};
  for (const r of rows) { const k = (r.harvest_date || '').slice(0, 7); byMonth[k] = (byMonth[k] || 0) + r.qty_kg; }
  res.json({ monthly: Object.entries(byMonth).map(([month, qty]) => ({ month, qty: +qty.toFixed(1) })), batches: rows });
});

// ---- Offline sync (beekeeper offline-first) ----
trace.get('/offline/pending', (req, res) => res.json(all('SELECT * FROM offline_queue WHERE status=? ORDER BY id', 'PENDING')));
trace.post('/offline/sync', (req, res) => {
  const { device_id, items } = req.body;
  const results = [];
  for (const it of items || []) {
    const r = run('INSERT INTO offline_queue (device_id, action, payload) VALUES (?,?,?)', device_id, it.action, JSON.stringify(it.payload));
    results.push({ id: r.lastInsertRowid, action: it.action, status: 'QUEUED' });
  }
  res.json({ queued: results.length, results });
});
trace.post('/offline/resolve', (req, res) => {
  const id = req.body.id;
  run('UPDATE offline_queue SET status=? WHERE id=?', 'SYNCED', id);
  res.json({ ok: true });
});