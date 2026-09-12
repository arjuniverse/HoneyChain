import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import { Badge, Card, Empty, PageHead, fmt, EVENT_META } from '../components/ui.jsx';

const QUICK = ['HC-KA-2026-000127', 'HC-KA-2026-000126'];

export default function ConsumerPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [camHint, setCamHint] = useState(false);

  async function verify(val) {
    const v = (val ?? code).trim();
    if (!v) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      const r = await api.verifyQr({ qr: v, location: ['Bengaluru', 'Belagavi', 'Pune', 'Goa'][Math.floor(Math.random() * 4)], device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop' });
      setResult(r);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const journey = result?.batch?.batch?.journey || [];
  const b = result?.batch?.batch;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="🔍 Verify your honey" sub="Scan the QR on your Honey Chain bottle — or enter/re-type its batch ID." />

      <Card className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="HC-KA-2026-000127  or  paste QR payload"
            className="min-w-[280px] rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-honey-400" />
          <button onClick={() => verify()} disabled={busy} className="rounded-full bg-bee-800 px-6 py-3 font-bold text-white hover:bg-bee-700 disabled:opacity-50">
            {busy ? 'Verifying…' : 'Scan / Verify'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-stone-400">Quick demo bottles:</span>
          {QUICK.map(q => (
            <button key={q} onClick={() => { setCode(q); verify(q); }} className="rounded-full bg-honey-100 px-3 py-1 font-mono font-bold text-honey-800 hover:bg-honey-200">{q}</button>
          ))}
          <button onClick={() => setCamHint(o => !o)} className="text-stone-500 underline decoration-dotted">📷 camera? (simulated)</button>
        </div>
        {camHint && <p className="mt-2 text-xs text-stone-400">Camera QR scanning is handled by the mobile app / WebUSB scanner. For the prototype, batch-ID entry calls the same verification endpoint.</p>}
      </Card>

      {err && <Card className="mt-5 bg-dang-bg"><p className="text-sm font-bold text-dang">{err}</p></Card>}

      {result && (
        <div className="slide-up mt-6 space-y-5">
          {!result.valid ? (
            <Card className="bg-dang-bg ring-2 ring-dang/30">
              <h2 className="display text-xl font-black text-dang">⛔ NOT VERIFIED</h2>
              <p className="mt-1 text-sm">This QR does not correspond to any valid Honey Chain batch {result.reason === 'qr_revoked' ? 'or has been revoked by KVIC.' : '— it may be counterfeit.'}</p>
            </Card>
          ) : result.suspicious ? (
            <Card className="bg-dang-bg ring-2 ring-dang/40">
              <h2 className="display text-xl font-black text-dang">⚠️ SUSPICIOUS QR ACTIVITY</h2>
              <p className="mt-1 text-sm text-stone-700">Valid record found, but scan behaviour suggests this QR may have been copied or reused. {result.suspicious.reason}.</p>
              <div className="mt-2 text-xs text-stone-600">Scans: {result.batch.batch.scan_count} · seen in {result.suspicious.locations?.join(', ')}</div>
            </Card>
          ) : (
            <Card className="relative overflow-hidden border-leaf-600/30 ring-2 ring-leaf-600">
              <div className="absolute right-4 top-4 rounded-full bg-leaf-100 px-3 py-1 text-xs font-black text-leaf-700">LIVE RECORD</div>
              <h2 className="display text-2xl font-black text-leaf-700">✅ {b.honey_type.includes('Eucalyptus') ? 'VERIFIED HONEY' : 'VERIFIED MULTI-FLORAL HONEY'}</h2>
              <p className="mt-1 text-sm text-stone-600">This batch has a valid, end-to-end traceability record on the Honey Chain ledger.</p>
            </Card>
          )}

          {b && (
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <h3 className="display mb-2 font-black">📋 Batch details</h3>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-stone-400">Batch ID</dt><dd className="text-right font-mono font-bold">{b.batch_id}</dd>
                  <dt className="text-stone-400">Beekeeper</dt><dd className="text-right font-bold">{b.beekeeper?.name}</dd>
                  <dt className="text-stone-400">Cluster</dt><dd className="text-right font-bold">{b.beekeeper?.cluster}</dd>
                  <dt className="text-stone-400">Harvest date</dt><dd className="text-right font-bold">{fmt.date(b.harvest_date)}</dd>
                  <dt className="text-stone-400">Floral source</dt><dd className="text-right font-bold">{b.floral_source}</dd>
                  <dt className="text-stone-400">Quantity</dt><dd className="text-right font-bold">{fmt.num(b.qty_kg, 1)} kg</dd>
                  <dt className="text-stone-400">Current status</dt><dd className="text-right"><Badge status={b.status}>{b.status.replace('_', ' ')}</Badge></dd>
                </dl>
                {b.quality && (
                  <div className="mt-3 rounded-xl bg-cream p-3 text-xs">
                    <b>Quality: {b.quality.status}</b> · score {b.quality.score}/100 · moisture {b.quality.moisture}% · brix {b.quality.brix} · adulteration risk <b>{b.quality.adulteration_risk}</b>
                  </div>
                )}
              </Card>
              <Card>
                <h3 className="display mb-3 font-black">🧬 Journey · hive → bottle</h3>
                {journey.map((e, i) => (
                  <div key={i} className={`relative pl-5 pb-3 text-sm ${i < journey.length - 1 ? 'border-l-2 border-honey-300' : ''}`}>
                    <span className="absolute -left-[7px] top-0.5 grid h-3 w-3 place-items-center rounded-full ring-2 ring-white" style={{ background: EVENT_META[e.eventType]?.color }} />
                    <b>{EVENT_META[e.eventType]?.label || e.eventType.replace(/_/g, ' ')}</b>
                    <span className="ml-2 text-[11px] text-stone-400">{fmt.date(e.ts)} · block #{e.index}</span>
                    <div className="text-xs text-stone-500">{e.actor}</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <Card className="bg-amber-soft/60">
            <p className="text-xs font-bold uppercase tracking-wide text-honey-800">🛡️ Block-level integrity</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {journey.map(e => (
                <span key={e.index} className="rounded-lg bg-white px-2.5 py-1 font-mono text-[10px] text-stone-500 ring-1 ring-black/5" title={e.hash}>
                  #{e.index} <span className="text-stone-300">…</span>{e.hash.slice(-8)}
                </span>
              ))}
            </div>
            <Link to={`/batch/${b.batch_id}`} className="mt-3 inline-block text-sm font-bold text-honey-700 underline">Open full passport & ledger →</Link>
          </Card>

          <Card className="text-center">
            <h3 className="display mb-2 font-black">⌛ Anti-counterfeit — try a suspicious scan flow</h3>
            <p className="text-xs text-stone-500">Rapid-scan the same QR below (mobile emulation from different cities) to flip a counterfeit flag.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => verify(b.batch_id)} className="rounded-full bg-dang px-4 py-2 text-xs font-bold text-white hover:bg-red-600">🔥 Duplicate-scan ×5 (simulate copy)</button>
            </div>
          </Card>
        </div>
      )}

      {!result && (
        <div className="mt-8 text-center">
          <p className="text-sm text-stone-400">How it works</p>
          <div className="mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-2 text-[11px] text-stone-500">
            {['🐝 Hive', '🍯 Harvest', '🧪 Lab', '🏭 Process', '📦 Pack', '🛒 You'].map((s, i, a) => (
              <span key={s} className="flex items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 font-bold ring-1 ring-black/10">{s}</span>{i < a.length - 1 && '→'}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}