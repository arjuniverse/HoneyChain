import { createHash } from 'node:crypto';
import { db, get, all } from './db.js';

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function lastBlock() {
  return get('SELECT * FROM blockchain ORDER BY block_index DESC LIMIT 1');
}

export function initChain() {
  if (!get('SELECT * FROM blockchain ORDER BY block_index DESC LIMIT 1')) {
    const genesis = {
      block_index: 0, prevHash: '0'.repeat(64),
      ts: new Date().toISOString(),
      eventType: 'GENESIS', entityType: 'system', entityId: 'genesis',
      actor: 'HoneyChain', payload: { note: 'Honey Chain permissioned ledger genesis block' },
    };
    const hash = sha256(JSON.stringify({ index: genesis.block_index, prevHash: genesis.prevHash, ts: genesis.ts, eventType: genesis.eventType, entityType: genesis.entityType, entityId: genesis.entityId, actor: genesis.actor, payload: genesis.payload }));
    db.prepare('INSERT INTO blockchain (block_index, prev_hash, hash, ts, event_type, entity_type, entity_id, actor, payload) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(genesis.block_index, genesis.prevHash, hash, genesis.ts, genesis.eventType, genesis.entityType, genesis.entityId, genesis.actor, JSON.stringify(genesis.payload));
  }
}

export function addBlock({ eventType, entityType, entityId, actor, payload }) {
  const prev = lastBlock();
  const block_index = prev.block_index + 1;
  const ts = new Date().toISOString();
  const blockData = { index: block_index, prevHash: prev.hash, ts, eventType, entityType, entityId: String(entityId), actor, payload };
  const hash = sha256(JSON.stringify(blockData));
  db.prepare('INSERT INTO blockchain (block_index, prev_hash, hash, ts, event_type, entity_type, entity_id, actor, payload) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(block_index, prev.hash, hash, ts, eventType, entityType, String(entityId), actor, JSON.stringify(payload));
  return { index: block_index, hash, ts, eventType };
}

export function getChain(entityType, entityId) {
  return all('SELECT * FROM blockchain ORDER BY block_index')
    .filter(b => b.entity_type === entityType && b.entity_id === String(entityId))
    .map(b => ({ index: b.block_index, hash: b.hash, prevHash: b.prev_hash, ts: b.ts, eventType: b.event_type, actor: b.actor, payload: JSON.parse(b.payload) }));
}

export function verifyChain() {
  const blocks = all('SELECT * FROM blockchain ORDER BY block_index');
  let valid = true; let brokenAt = null;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const recomputed = sha256(JSON.stringify({ index: b.block_index, prevHash: b.prev_hash, ts: b.ts, eventType: b.event_type, entityType: b.entity_type, entityId: b.entity_id, actor: b.actor, payload: JSON.parse(b.payload) }));
    if (recomputed !== b.hash) { valid = false; brokenAt = b.block_index; break; }
    if (i > 0 && b.prev_hash !== blocks[i - 1].hash) { valid = false; brokenAt = b.block_index; break; }
  }
  return { valid, blocks: blocks.length, brokenAt };
}

export function chainStats() {
  const r = get('SELECT COUNT(*) n, MAX(block_index) last FROM blockchain');
  const verify = verifyChain();
  return { blocks: r.n, lastIndex: r.last, integrity: verify.valid ? 'VERIFIED' : 'BREACHED' };
}