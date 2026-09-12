import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, Dot, Empty, PageHead, Spinner, fmt, EVENT_META } from '../components/ui.jsx';

export default function BatchTracePage() {
  const { batchId } = useParams();
  const { tick } = useApp();
  const [data, setData] = useState(null);
  const [chain, setChain] = useState(null);

  useEffect(() => {
    api.batch(batchId).then(setData).catch(() => setData(null));
    api.chainVerify().then(setChain).catch(() => {});
  }, [batchId, tick]);

  const batch = data?.batch;
  const journey = useMemo(() => (batch?.journey || []), [data]);

  if (!data) return <Empty message="Batch not found. Scan a valid Honey Chain QR." />;
  if (!batch) return <Spinner />;

  const qrPayload = JSON.stringify({ HC: 1, batchId: batch.batch_id, qr: batch.qr_token, scan: 'https://honeychain.in/verify' });

  return (
    <div>
      <Link to="/batches" className="text-sm font-bold text-honey-700">← Batches</Link>
      <PageHead
        title={<span className="font-mono">{batch.batch_id}</span>}
        sub={`Beekeeper ${batch.beekeeper?.name} · ${batch.beekeeper?.cluster} · ${batch.beekeeper?.district}, ${batch.beekeeper?.state}`}
        right={
          <div className="flex items-center gap-2">
            {chain?.valid ? <Badge status="green">🔗 Ledger VERIFIED · {chain.blocks} blocks</Badge> : <Badge status="danger">Ledger check pending</Badge>}
            <Badge status={batch.status}>{batch.status.replace('_', ' ')}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Journey timeline */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="display mb-1 font-black">🍯 Digital Honey Passport — the journey</h2>
            <p className="mb-4 text-xs text-stone-400">Each event is a block in the permissioned ledger (Hyperledger Fabric equivalent, hashed & chained). Sensor-level data stays in the normal database; only significant events + hashes are anchored.</p>
            <div className="space-y-0">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px]">
                {'🐝 Hive → 🍯 Harvest → 🧪 Quality → 🏭 Processing → 📦 Packaging → 🛒 Consumer'.split(' .').length > 0 && journey.map((e, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full`} style={{ background: EVENT_META[e.eventType]?.color || '#999' }} />
                    <span className="font-bold text-stone-600">{EVENT_META[e.eventType]?.label || e.eventType.replace(/_/g, ' ')}</span>
                    {i < journey.length - 1 && <span className="text-stone-300">→</span>}
                  </span>
                ))}
              </div>
              {journey.map((e, idx) => {
                const meta = EVENT_META[e.eventType] || { icon: '🔗', color: '#999', label: e.eventType, desc: '' };
                const last = idx === journey.length - 1;
                return (
                  <div key={e.index} className={`trace-line relative flex gap-4 pl-1 pb-6 ${last ? '' : ''}`}>
                    <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ring-4 ring-white" style={{ background: `${meta.color}22` }}>
                      <span style={{ filter: 'none' }}>{meta.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-black text-bee-900">{meta.label}</span>
                        <span className="text-[11px] font-semibold text-stone-400">block #{e.index} · {fmt.dt(e.ts)}</span>
                      </div>
                      <div className="rounded-xl bg-cream px-3 py-2 text-sm text-stone-700 ring-1 ring-black/5">
                        {e.eventType === 'HARVEST' && (<><b>Harvest date:</b> {fmt.date(e.payload.harvestDate)} · <b>{e.payload.qtyKg} kg</b> · floral source: {e.payload.floralSource}<br /><span className="text-xs text-stone-400">Apiary: {e.payload.apiary || '—'}</span></>)}
                        {e.eventType === 'QUALITY_TESTED' && (<><b>Score:</b> {e.payload.score}/100 · {e.payload.status} · moisture {e.payload.moisture}% · brix {e.payload.brix} · pH {e.payload.ph}<br /><span className="text-xs text-stone-400">Adulteration risk: {e.payload.adulterationRisk || 'LOW'}</span></>)}
                        {e.eventType === 'PROCESSED' && (<>{e.payload.process || 'Cold-strain & filtration'} · {fmt.date(e.payload.date)}</>)}
                        {e.eventType === 'PACKAGED' && (<><b>{e.payload.bottles}</b> bottles ({e.payload.unit}) packed · {fmt.date(e.payload.date)}<br /><span className="text-xs text-stone-400">QR label: {e.payload.qrToken}</span></>)}
                        {e.eventType === 'OWNERSHIP_TRANSFER' && (<><b>{e.payload.from}</b> → <b>{e.payload.to}</b> · {fmt.date(e.payload.date)}</>)}
                        {e.eventType === 'SOLD' && (<>Purchased by a consumer <b>~{e.payload.consumerRegion}</b> · {fmt.date(e.payload.date)}</>)}
                        {e.eventType === 'REJECTED' && (<>Batch rejected — {e.payload.reason || 'non-conforming'}</>)}
                        {!['HARVEST','QUALITY_TESTED','PROCESSED','PACKAGED','OWNERSHIP_TRANSFER','SOLD','REJECTED'].includes(e.eventType) && <pre className="text-xs">{JSON.stringify(e.payload, null, 1)}</pre>}
                        <div className="mt-1 text-[11px] text-stone-400">▸ recorded by {e.actor}</div>
                      </div>
                      <button className="mt-1.5 font-mono text-[10px] text-stone-400 underline decoration-dotted hover:text-honey-700" onClick={() => navigator.clipboard?.writeText(e.hash)}>
                        {e.hash.slice(0, 22)}…{e.hash.slice(-8)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: QR + quality + scans */}
        <div className="space-y-6">
          <Card className="text-center">
            <h2 className="display mb-3 font-black">📱 Bottle QR · Scan to verify</h2>
            <div className="mx-auto w-fit rounded-2xl bg-white p-4 ring-4 ring-honey-200">
              <QRCodeSVG value={qrPayload} size={170} level="M" includeMargin={false} fgColor="#3E2723" />
            </div>
            <p className="mt-3 font-mono text-[11px] font-bold text-honey-700">{batch.qr_token}</p>
            <p className="mt-1 text-xs text-stone-400">Scan this QR from the Consumer portal to verify the full journey.</p>
          </Card>

          <Card>
            <h2 className="display mb-2 font-black">🧪 Quality report</h2>
            {batch.quality ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-leaf-600 to-leaf-800 text-xl font-black text-white">{batch.quality.score}</div>
                  <div>
                    <div className="text-xs text-stone-400">Quality score /100</div>
                    <div className="flex gap-1.5 mt-1"><Badge status={batch.quality.status}>{batch.quality.status}</Badge><Badge status={batch.quality.adulteration_risk}>{batch.quality.adulteration_risk} risk</Badge></div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">Moisture</div><b>{batch.quality.moisture}%</b></div>
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">Brix</div><b>{batch.quality.brix}</b></div>
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">pH</div><b>{batch.quality.ph}</b></div>
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">EC</div><b>{batch.quality.ec}</b></div>
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">Diastase</div><b>{batch.quality.diastase}</b></div>
                  <div className="rounded-lg bg-cream py-2"><div className="text-[10px] text-stone-400">HMF</div><b>{batch.quality.hmf}</b></div>
                </div>
                <p className="mt-3 text-[11px] text-stone-400">Lab {batch.quality.lab_code} · {batch.quality.tester} · {fmt.dt(batch.quality.tested_at)} · FSSAI / AGMARK aligned. AI screening complements, never replaces, certified testing.</p>
              </div>
            ) : <p className="text-sm text-stone-400">Pending laboratory testing.</p>}
          </Card>

          <Card>
            <h2 className="display mb-2 font-black">🛡️ QR scan activity</h2>
            <div className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-sm"><span className="text-stone-500">Total scans</span><b>{batch.scan_count}</b></div>
            {batch.suspicious?.flag && (
              <div className="mt-2 rounded-xl bg-dang-bg p-3 text-sm">
                <b className="text-dang">⚠️ SUSPICIOUS QR ACTIVITY</b>
                <p className="mt-1 text-xs text-stone-700">This QR may have been copied or reused. {batch.suspicious.reason}. Locations: {batch.suspicious.locations.join(', ')}.</p>
              </div>
            )}
            {!batch.suspicious?.flag && batch.scan_count > 0 && (
              <div className="mt-2 rounded-xl bg-leaf-100 p-3 text-xs text-leaf-700">✔ Normal scan pattern — no counterfeit flags.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}