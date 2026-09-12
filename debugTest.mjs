import './backend/src/server.js';
import { db, run, get } from './backend/src/db.js';
import { applyManualReading } from './backend/src/iot.js';
const bk = run('INSERT INTO beekeepers (name, contact, village, language) VALUES (?,?,?,?)', 'T','1','X','en');
const hv = run('INSERT INTO hives (beekeeper_id, hive_no, name) VALUES (?,?,?)', bk.lastInsertRowid, '42', 'T').lastInsertRowid;
const hive = get('SELECT * FROM hives WHERE id=?', hv);
console.log('hive row', JSON.stringify(hive));
const r = get('SELECT * FROM sensor_readings WHERE hive_id=?', hv);
console.log('no reading (fresh):', r);
try { applyManualReading(hv, {}); console.log('OK empty overrides'); } catch(e) { console.log('FAIL empty:', e.message); }
try { applyManualReading(hv, { temp: 41.8, humidity: 84 }); console.log('OK with overrides'); } catch(e) { console.log('FAIL ovr:', e.message); }
process.exit(0);
