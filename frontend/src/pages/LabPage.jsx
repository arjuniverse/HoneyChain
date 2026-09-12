import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, PageHead, Spinner, fmt } from '../components/ui.jsx';

const NORM = { moisture: [16, 20], ph: [3.5, 4.8], brix: [78, 89], ec: [0, 0.8], diastase: [8, 30], hmf: [0, 40] };

export default function LabPage() {
  const { tick } = useApp();
  const [queue, setQueue] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);

  const load = () => api.labQueue().then(setQueue).catch(() => setQueue([]));
  useEffect(load, [tick]);

  async function qualify() {
    const r = await api.qualify({ ...form, batch_id: selected.batch_id, lab_code: 'KVIC-Lab-BL', tester: 'Dr. Anita Kulkarni' });
    setResult(r);
    load();
  }

  if (!queue) return <Spinner />;

  const f = selected ? queue.find(q => q.batch_id === selected.batch_id) : null;

  return (
    <div>
      <PageHead title="🧪 Honey Quality Module" sub="Enter FSSAI/AGMARK-aligned parameters. Scoring is rule-based AI screening — certified laboratory release remains the authority." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="display mb-3 font-black">Queue · awaiting testing</h2>
          <div className="space-y-2">
            {queue.filter(q => q.status === 'HARVESTED').map(q => (
              <button key={q.batch_id} onClick={() => { setSelected(q); setResult(null); setForm({}); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ring-1 transition ${selected?.batch_id === q.batch_id ? 'bg-honey-100 ring-honey-400' : 'bg-cream ring-black/5 hover:ring-honey-300'}`}>
                <div>
                  <div className="font-mono text-xs font-black">{q.batch_id}</div>
                  <div className="mt-0.5 text-xs text-stone-500">{fmt.num(q.qty_kg, 1)} kg · {fmt.date(q.harvest_date)} · Hive {q.hive_no || '—'}</div>
                </div>
                <Badge status="harvested">pending</Badge>
              </button>
            ))}
            {!queue.filter(q => q.status === 'HARVESTED').length && <p className="text-sm text-stone-400">Nothing awaiting lab. 🐝</p>}
          </div>
        </Card>

        <Card>
          <h2 className="display mb-3 font-black">{selected ? <>Testing {selected.batch_id}</> : 'Select a batch'}</h2>
          {result ? (
            <div className="slide-up">
              <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-leaf-700 to-leaf-900 p-5 text-white">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/15 text-3xl font-black">{result.score}</div>
                <div>
                  <div className="text-xs text-white/60">Quality score /100</div>
                  <div className="display text-xl font-black">{result.status} {result.status === 'SUSPECT' && '· CFSR confirm'}</div>
                  <div className="mt-1 text-sm">Adulteration risk: <b>{result.adulteration_risk}</b></div>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-cream p-3 text-sm">
                <b>Parameters:</b> moisture {result.parameters.moisture}%, pH {result.parameters.ph}, brix {result.parameters.brix}, EC {result.parameters.ec}
                {result.parameters.diastase ? `, diastase ${result.parameters.diastase}` : ''}
                {result.parameters.hmf ? `, HMF ${result.parameters.hmf}` : ''}
              </div>
              <p className="mt-2 text-[11px] text-stone-400">✔ Quality block appended to the Honey Chain ledger for {selected.batch_id}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-500">{f?.floral_source || 'Batch details will load here once selected.'}</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(NORM).map(k => (
                  <label key={k} className="text-xs capitalize">
                    <span className="text-stone-400">{k} <span className="text-[10px]">({NORM[k].join('–')})</span></span>
                    <input type="number" step="0.01" value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold" placeholder="—" />
                  </label>
                ))}
              </div>
              <button disabled={!selected} onClick={qualify} className="w-full rounded-full bg-purple-700 py-3 font-bold text-white hover:bg-purple-800 disabled:opacity-40">
                🧪 Score & append to ledger
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}