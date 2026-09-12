import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, Empty, PageHead, Spinner, fmt } from '../components/ui.jsx';

const STEPS = [
  { k: 'QUALITY_TESTED', label: '🧪 Lab tested', actor: 'KVIC Food Laboratory · Belagavi' },
  { k: 'PROCESSED', label: '🏭 Processed', actor: 'Honey Chain Processing Unit · Gokak' },
  { k: 'PACKAGED', label: '📦 Packaged', actor: 'Honey Chain Packing Unit' },
  { k: 'OWNERSHIP_TRANSFER', label: '🔄 Ownership transferred', actor: 'KVIC Nodal Officer' },
];

export default function BatchesPage() {
  const { me, tick } = useApp();
  const [batches, setBatches] = useState(null);
  const [hives, setHives] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ beekeeper_id: me?.beekeeper_id, hive_id: '', floral_source: 'Multi-floral · Neem, Eucalyptus', qty_kg: '', harvest_date: new Date().toISOString().slice(0, 10) });
  const [made, setMade] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.batches(me?.beekeeper_id).then(setBatches).catch(() => setBatches([]));
    api.hives(me?.beekeeper_id).then(setHives).catch(() => {});
  };
  useEffect(load, [me?.beekeeper_id, tick]);

  async function create() {
    if (!form.hive_id || !form.qty_kg) return setMsg('Select hive and quantity first.');
    const b = await api.createBatch(form);
    setMade(b.batch_id);
    setMsg('');
    setOpen(false);
    load();
  }
  async function record(batchId, k, actor) {
    await api.addBatchEvent(batchId, { event_type: k, actor });
    load();
  }

  if (!batches) return <Spinner />;

  return (
    <div>
      <PageHead
        title="🫙 Honey Batches"
        sub="Every batch minted on the Honey Chain ledger with a unique, verifiable batch ID."
        right={<button onClick={() => setOpen(o => !o)} className="rounded-full bg-honey-500 px-4 py-2 text-sm font-bold text-bee-950 hover:bg-honey-400">{open ? 'Close' : '➕ Mint new batch'}</button>}
      />

      {open && (
        <Card className="slide-up mb-6 border-honey-300 ring-2 ring-honey-200">
          <h3 className="display font-black">Mint new honey batch</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs"><span className="text-stone-400">Hive</span>
              <select value={form.hive_id} onChange={e => setForm({ ...form, hive_id: e.target.value })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
                <option value="">— select hive —</option>
                {hives.map(h => <option key={h.id} value={h.id}>Hive {h.hive_no} ({h.status})</option>)}
              </select>
            </label>
            <label className="text-xs"><span className="text-stone-400">Quantity (kg)</span>
              <input type="number" value={form.qty_kg} onChange={e => setForm({ ...form, qty_kg: e.target.value })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold" placeholder="12.4" />
            </label>
            <label className="text-xs"><span className="text-stone-400">Harvest date</span>
              <input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold" />
            </label>
            <label className="text-xs"><span className="text-stone-400">Floral source</span>
              <input value={form.floral_source} onChange={e => setForm({ ...form, floral_source: e.target.value })} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold" />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={create} className="rounded-full bg-bee-800 px-5 py-2 text-sm font-bold text-white hover:bg-bee-700">Mint batch → chain</button>
            <span className="text-xs text-stone-400">Batch ID is generated automatically (format HC-KA-YYYY-NNNNNN) and a HARVEST block is written to the ledger.</span>
          </div>
          {made && <p className="mt-2 text-sm font-bold text-leaf-700">✔ Minted <Link className="underline" to={`/batch/${made}`}>{made}</Link> — 1 ledger event added.</p>}
          {msg && <p className="mt-2 text-sm font-bold text-dang">{msg}</p>}
        </Card>
      )}

      {!batches.length ? <Empty message="No batches minted yet. Mint your first honey batch above." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map(b => (
            <Card key={b.batch_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/batch/${b.batch_id}`} className="font-mono text-sm font-black text-honey-700 hover:underline">{b.batch_id}</Link>
                  <div className="mt-1 text-sm font-bold">{fmt.num(b.qty_kg, 1)} kg · {fmt.date(b.harvest_date)}</div>
                  <div className="text-xs text-stone-500">{b.honey_type}<br />{b.floral_source}</div>
                </div>
                <Badge status={b.status}>{b.status.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-stone-400">{b.journeyCount} events on ledger</span>
                <Link to={`/batch/${b.batch_id}`} className="font-bold text-honey-700">Open passport →</Link>
              </div>
              {me?.role !== 'lab' && ['HARVESTED', 'LAB_TESTED', 'PACKAGED'].includes(b.status) && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">Record next step</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STEPS.filter(s => s.k === 'QUALITY_TESTED' ? true : (b.status !== 'HARVESTED' || s.k === 'QUALITY_TESTED')).map(s => (
                      <button key={s.k} onClick={() => record(b.batch_id, s.k, s.actor)} className="rounded-full bg-cream px-3 py-1.5 text-[11px] font-bold text-bee-700 ring-1 ring-black/10 hover:bg-honey-100">{s.label}</button>
                    ))}
                    <Link to={`/batch/${b.batch_id}`} className="rounded-full bg-cream px-3 py-1.5 text-[11px] font-bold text-honey-700 ring-1 ring-honey-200 hover:bg-honey-100">🔍 View QR</Link>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}