import { db, run, all, get } from './db.js';
import { initChain, addBlock } from './blockchain.js';
import { forceBackfill } from './iot.js';

let seeded = false;

export function seed() {
  if (seeded) return;
  const cn = get('SELECT COUNT(*) c FROM beekeepers');
  if (cn.c > 0) { seeded = true; initChain(); return; }
  seeded = true;
  initChain();

  const region = run('INSERT INTO regions (code, state, district, cluster) VALUES (?,?,?,?)', 'KA-BL', 'Karnataka', 'Belagavi', 'Gokak NAFIS Cluster').lastInsertRowid;
  run('INSERT INTO regions (code, state, district, cluster) VALUES (?,?,?,?)', 'KA-SH', 'Karnataka', 'Shivamogga', 'Bhadravati Cluster');
  run('INSERT INTO regions (code, state, district, cluster) VALUES (?,?,?,?)', 'MH-AM', 'Maharashtra', 'Amravati', 'Chikhaldara Cluster');

  const bk = run('INSERT INTO beekeepers (name, contact, village, language, region_id, device_token) VALUES (?,?,?,?,?,?)',
    'Ramesh Kumar', '+91 98765 43210', 'Gokak', 'kannada', region, 'DEV-RK-001').lastInsertRowid;
  const bk2 = run('INSERT INTO beekeepers (name, contact, village, language, region_id, device_token) VALUES (?,?,?,?,?,?)',
    'Sunita Patil', '+91 91234 56789', 'Katak', 'hindi', region, 'DEV-SP-002').lastInsertRowid;
  const bk3 = run('INSERT INTO beekeepers (name, contact, village, language, region_id, device_token) VALUES (?,?,?,?,?,?)',
    'Mohan Raj', '+91 99887 76655', 'Bhadravati', 'kannada', 2, 'DEV-MR-003').lastInsertRowid;

  const hives = [];
  for (let i = 1; i <= 20; i++) {
    const h = run('INSERT INTO hives (beekeeper_id, hive_no, name, base_weight_kg) VALUES (?,?,?,?)',
      i <= 12 ? bk : bk2, String(i).padStart(2, '0'), `Apiary ${Math.ceil(i / 4)} · Hive ${String(i).padStart(2, '0')}`, 18).lastInsertRowid;
    hives.push(h);
  }
  for (let i = 1; i <= 8; i++) {
    run('INSERT INTO hives (beekeeper_id, hive_no, name) VALUES (?,?,?)', bk3, `A${String(i).padStart(2,'0')}`, `Bhadravati · Hive ${String(i).padStart(2,'0')}`);
  }

  // history for prediction: ~30 days of day-end weights for first few hives
  const dayMs = 86400000;
  const base = (i) => get('SELECT base_weight_kg FROM hives WHERE id=?', hives[i]).base_weight_kg;
  for (let i = 0; i < 8; i++) {
    let w = base(i) + 8 + Math.random() * 4;
    for (let d = 30; d >= 0; d--) {
      w += 0.34 + (Math.random() - 0.5) * 0.12;
      run('INSERT INTO sensor_readings (hive_id, ts, temp, humidity, weight_kg, sound_level, vibration, battery_pct, source) VALUES (?,?,?,?,?,?,?,?,?)',
        hives[i], Date.now() - d * dayMs, 32.5, 57, +w.toFixed(2), 360, 22, 80, 'backfill');
    }
  }
  // yesterday+ live gap backfill
  for (const h of hives) forceBackfill(h, 240);

  // ---- Batch HC-KA-2026-000127 (demo flow) ----
  const beekeeper = get('SELECT * FROM beekeepers WHERE id=?', bk);
  const hive7 = get("SELECT id FROM hives WHERE beekeeper_id=? AND hive_no='07'", bk);
  const b127 = run('INSERT INTO batches (batch_id, beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type, status, qr_token) VALUES (?,?,?,?,?,?,?,?,?)',
    'HC-KA-2026-000127', bk, hive7.id, 'Multi-floral · Neem, Eucalyptus, Mustard', 24.6, '2026-09-01', 'Raw Multi-floral Honey', 'PACKAGED', 'QR-HC-KA-2026-000127-9F3A').lastInsertRowid;
  addBlock({ eventType: 'HARVEST', entityType: 'batch', entityId: b127, actor: 'Ramesh Kumar (Beekeeper)', payload: { batchId: 'HC-KA-2026-000127', hive: 'Hive 07', qtyKg: 24.6, floralSource: 'Multi-floral · Neem, Eucalyptus, Mustard', harvestDate: '2026-09-01', apiary: 'Gokak NAFIS Cluster', beekeeper: beekeeper.name } });
  addBlock({ eventType: 'QUALITY_TESTED', entityType: 'batch', entityId: b127, actor: 'KVIC Food Laboratory · Belagavi', payload: { batchId: 'HC-KA-2026-000127', labCode: 'KVIC-Lab-BL', tester: 'Dr. Anita Kulkarni', score: 92, status: 'PASSED', moisture: 17.2, brix: 81.4, ph: 4.1 } });
  addBlock({ eventType: 'PROCESSED', entityType: 'batch', entityId: b127, actor: 'Honey Chain Processing Unit · Gokak', payload: { batchId: 'HC-KA-2026-000127', process: 'Cold-strain · de-crystallization · filtration', date: '2026-09-04' } });
  addBlock({ eventType: 'PACKAGED', entityType: 'batch', entityId: b127, actor: 'Honey Chain Packing Unit', payload: { batchId: 'HC-KA-2026-000127', bottles: 82, unit: '300g', date: '2026-09-05', qrToken: 'QR-HC-KA-2026-000127-9F3A' } });
  addBlock({ eventType: 'OWNERSHIP_TRANSFER', entityType: 'batch', entityId: b127, actor: 'KVIC Nodal Officer', payload: { batchId: 'HC-KA-2026-000127', from: 'Ramesh Kumar (Beekeeper)', to: 'NDDB Regional Collection · Belagavi', date: '2026-09-06' } });
  run('INSERT INTO quality_results (batch_id, lab_code, tester, moisture, ph, brix, ec, diastase, hmf, score, status, adulteration_risk, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    'HC-KA-2026-000127', 'KVIC-Lab-BL', 'Dr. Anita Kulkarni', 17.2, 4.1, 81.4, 0.38, 12.5, 3.1, 92, 'PASSED', 'LOW', 'FSSAI & AGMARK aligned parameters');

  // ---- Batch HC-KA-2026-000126 (fully verified & sold) ----
  const b126 = run('INSERT INTO batches (batch_id, beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type, status, qr_token) VALUES (?,?,?,?,?,?,?,?,?)',
    'HC-KA-2026-000126', bk, hive7.id, 'Eucalyptus dominant', 18.2, '2026-08-14', 'Eucalyptus Honey', 'DELIVERED', 'QR-HC-KA-2026-000126-2B7C').lastInsertRowid;
  addBlock({ eventType: 'HARVEST', entityType: 'batch', entityId: b126, actor: 'Ramesh Kumar (Beekeeper)', payload: { batchId: 'HC-KA-2026-000126', qtyKg: 18.2, floralSource: 'Eucalyptus dominant', harvestDate: '2026-08-14' } });
  addBlock({ eventType: 'QUALITY_TESTED', entityType: 'batch', entityId: b126, actor: 'KVIC Food Laboratory · Belagavi', payload: { batchId: 'HC-KA-2026-000126', score: 88, status: 'PASSED', moisture: 18.1 } });
  addBlock({ eventType: 'PROCESSED', entityType: 'batch', entityId: b126, actor: 'Honey Chain Processing Unit · Gokak', payload: { batchId: 'HC-KA-2026-000126', date: '2026-08-17' } });
  addBlock({ eventType: 'PACKAGED', entityType: 'batch', entityId: b126, actor: 'Honey Chain Packing Unit', payload: { batchId: 'HC-KA-2026-000126', bottles: 60, unit: '300g', date: '2026-08-18' } });
  addBlock({ eventType: 'OWNERSHIP_TRANSFER', entityType: 'batch', entityId: b126, actor: 'NDDB Regional Collection · Belagavi', payload: { batchId: 'HC-KA-2026-000126', to: 'Retailer · Bengaluru', date: '2026-08-22' } });
  addBlock({ eventType: 'SOLD', entityType: 'batch', entityId: b126, actor: 'Retailer · Bengaluru', payload: { batchId: 'HC-KA-2026-000126', consumerRegion: 'Bengaluru Urban', date: '2026-08-28' } });
  run('INSERT INTO quality_results (batch_id, lab_code, tester, moisture, ph, brix, ec, diastase, hmf, score, status, adulteration_risk) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    'HC-KA-2026-000126', 'KVIC-Lab-BL', 'Dr. Anita Kulkarni', 18.1, 4.2, 80.2, 0.42, 11.8, 4.0, 88, 'PASSED', 'LOW');

  // ---- Batch awaiting lab test (HC-KA-2026-000128) ----
  const b128 = run('INSERT INTO batches (batch_id, beekeeper_id, hive_id, floral_source, qty_kg, harvest_date, honey_type, status, qr_token) VALUES (?,?,?,?,?,?,?,?,?)',
    'HC-KA-2026-000128', bk2, get('SELECT id FROM hives WHERE beekeeper_id=? LIMIT 1', bk2).id, 'Multi-floral · Sunflower', 12.8, '2026-09-09', 'Raw Multi-floral Honey', 'HARVESTED', 'QR-HC-KA-2026-000128-5D21').lastInsertRowid;
  addBlock({ eventType: 'HARVEST', entityType: 'batch', entityId: b128, actor: 'Sunita Patil (Beekeeper)', payload: { batchId: 'HC-KA-2026-000128', qtyKg: 12.8, floralSource: 'Multi-floral · Sunflower', harvestDate: '2026-09-09' } });

  // marketplace
  run('INSERT INTO marketplace (batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg, status) VALUES (?,?,?,?,?,?)', 'HC-KA-2026-000127', bk, 'Raw Multi-floral Honey', 24.6, 420, 'ACTIVE');
  run('INSERT INTO marketplace (batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg, status) VALUES (?,?,?,?,?,?)', 'HC-KA-2026-000126', bk, 'Eucalyptus Honey', 18.2, 460, 'ACTIVE');
  run('INSERT INTO marketplace (batch_id, seller_id, honey_type, listing_qty_kg, price_per_kg, status) VALUES (?,?,?,?,?,?)', 'HC-KA-2026-000128', bk2, 'Raw Multi-floral Honey', 12.8, 400, 'ACTIVE');

  // weather + forecast history
  const now = Date.now();
  for (let d = 6; d >= 0; d--) {
    run('INSERT INTO weather_log (ts, temp, rain_prob, floral_index, wind_kmh, forecast) VALUES (?,?,?,?,?,?)',
      now - d * dayMs, 30.5 + Math.sin(d) * 2, Math.max(0, Math.min(85, 22 + (d % 3) * 18)), 0.72 + Math.random() * 0.18, 11 + Math.random() * 6, 'Scattered rain expected late week; good foraging days ahead.');
  }

  // sample QR scans for 126 (counters) and simulate suspicious on 127 (2 scans)
  for (let s = 0; s < 8; s++) {
    run('INSERT INTO qr_scans (batch_id, location, device) VALUES (?,?,?)', 'HC-KA-2026-000126', s % 2 ? 'Bengaluru Urban' : 'Belagavi', 'Mobile');
  }
  run('INSERT INTO qr_scans (batch_id, location, device) VALUES (?,?,?)', 'HC-KA-2026-000127', 'Gokak', 'Mobile');
  run('INSERT INTO qr_scans (batch_id, location, device) VALUES (?,?,?)', 'HC-KA-2026-000127', 'Pune', 'Mobile');

  // a couple of resolved alerts
  run("INSERT INTO alerts (hive_id, type, severity, message, ai_analysis, resolved) VALUES (?,?,?,?,?,1)",
    hives[2], 'Weight change', 'warning', 'Hive 03 showed a mild overnight dip in weight. Likely normal foraging variation.', '{"note":"returned to range"}');

  console.log('[Honey Chain] Seeded demo data.');
}

export const isSeeded = () => true;