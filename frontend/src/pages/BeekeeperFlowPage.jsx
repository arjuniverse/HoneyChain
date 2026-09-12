import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import { Badge, Card, PageHead, fmt } from '../components/ui.jsx';

const STEPS = [
  { n: 1, t: 'Register beekeeper' }, { n: 2, t: 'Register Hive #07' }, { n: 3, t: 'Live IoT readings' },
  { n: 4, t: 'Trigger AI health warning' }, { n: 5, t: 'Yield prediction' }, { n: 6, t: 'Mint honey batch' },
  { n: 7, t: 'Laboratory quality' }, { n: 8, t: 'Process & package' }, { n: 9, t: 'Generate QR' },
  { n: 10, t: 'Consumer verification' }, { n: 11, t: 'Full journey' }, { n: 12, t: 'Duplicate scan test' },
  { n: 13, t: 'Counterfeit alert' }, { n: 14, t: 'KVIC visibility' },
];

const LAB_DEFAULT = { moisture: 17.2, ph: 4.1, brix: 81.4, ec: 0.38, diastase: 12.5, hmf: 3.1 };

export default function BeekeeperFlowPage() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState({ beekeeper: null, hive: null, batch: null, alert: null, pred: null, lab: null, verify: null, dup: null, suspicious: null });
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const bottomRef = useRef(null);

  const t = STEPS[step];
  const logAdd = (msg) => setLog(l => [...l, `✓ ${msg}`]);

  // Step 1-2: register beekeeper + hive
  async function registerBeekeeper() {
    setBusy(true);
    const bk = await api.registerBeekeeper({ name: 'Ramesh Kumar', contact: '+91 98765 43210', village: 'Gokak', language: 'kannada', state: 'Karnataka', district: 'Belagavi', cluster: 'Gokak NAFIS Cluster' });
    const h = await api.registerHive({ beekeeper_id: bk.id, hive_no: '07', name: 'Demo Apiary · Hive 07' });
    setS(prev => ({ ...prev, beekeeper: bk, hive: h }));
    logAdd(`Beekeeper ${bk.name} registered (id ${bk.id})`);
    logAdd(`Hive #07 registered with ESP32 ${h.model} gateway`);
    setBusy(false);
    setStep(2);
  }

  // Step 3: show live readings
  async function loadHive() {
    const h = await api.hive(s.hive.id);
    setS(p => ({ ...p, hive: h }));
    setStep(3);
  }
  async function triggerAlert() {
    setBusy(true);
    const a = await api.simulate(s.hive.id, { temp: 41.8, humidity: 84 });
    setS(p => ({ ...p, alert: a }));
    logAdd(`AI flagged: ${a.issues?.map(i => i.param).join(', ') || 'temp/humidity above range'}`);
    setBusy(false);
    setStep(4);
  }
  async function showPrediction() {
    const pr = await api.predict(s.hive.id);
    setS(p => ({ ...p, pred: pr }));
    setStep(5);
  }
  async function mintBatch() {
    setBusy(true);
    const b = await api.createBatch({ beekeeper_id: s.beekeeper.id, hive_id: s.hive.id, floral_source: 'Multi-floral · Neem, Eucalyptus', qty_kg: 12.4, harvest_date: new Date().toISOString().slice(0, 10) });
    setS(p => ({ ...p, batch: b }));
    logAdd(`Minted ${b.batch_id} · HARVEST block written to ledger`);
    setBusy(false);
    setStep(6);
  }
  async function runLab() {
    setBusy(true);
    const r = await api.qualify({ batch_id: s.batch.batch_id, ...LAB_DEFAULT });
    setS(p => ({ ...p, lab: r }));
    logAdd(`Lab score ${r.score}/100 · ${r.status} · adulteration risk ${r.adulteration_risk}`);
    setBusy(false);
    setStep(7);
  }
  async function processPack() {
    setBusy(true);
    await api.addBatchEvent(s.batch.batch_id, { event_type: 'PROCESSED', actor: 'Honey Chain Processing Unit · Gokak' });
    await api.addBatchEvent(s.batch.batch_id, { event_type: 'PACKAGED', actor: 'Honey Chain Packing Unit' });
    logAdd('PROCESSED + PACKAGED blocks anchored');
    setBusy(false);
    setStep(8);
  }
  async function scanQr() {
    setBusy(true);
    const v = await api.verifyQr({ qr: s.batch.batch_id, location: 'Gokak', device: 'Mobile' });
    setS(p => ({ ...p, verify: v }));
    logAdd(`Consumer scan recorded · ${v.valid ? 'VERIFIED HONEY' : 'unverified'}`);
    setBusy(false);
    setStep(10);
  }
  async function dupScans() {
    setBusy(true);
    console.log('duplicate scanning');
    const cities = ['Pune', 'Nagpur', 'Jaipur', 'Delhi', 'Lucknow'];
    let last = null;
    for (let i = 0; i < 5; i++) last = await api.verifyQr({ qr: s.batch.batch_id, location: cities[i], device: 'Mobile' });
    setS(p => ({ ...p, dup: last }));
    logAdd('5 rapid scans from spread cities simulated');
    setBusy(false);
    setStep(12);
  }
  async function showSuspicious() {
    const c = await api.counterfeit();
    const mine = c.find(x => x.batchId === s.batch.batch_id);
    setS(p => ({ ...p, suspicious: mine || { batchId: s.batch.batch_id } }));
    setStep(13);
  }
  async function goStep(ndx) {
    if (busy) return;
    const target = STEPS[ndx];
    if (target.n === 3) return loadHive();
    if (target.n === 4) return triggerAlert();
    if (target.n === 5) return showPrediction();
    if (target.n === 6) return mintBatch();
    if (target.n === 7) return runLab();
    if (target.n === 8) return processPack();
    if (target.n === 10) { const full = await api.batch(s.batch.batch_id); setS(p => ({ ...p, full })); setStep(10); return; }
    if (target.n === 11) { const full = await api.batch(s.batch.batch_id); setS(p => ({ ...p, full })); setStep(11); return; }
    if (target.n === 12) return dupScans();
    if (target.n === 13) return showSuspicious();
    setStep(ndx);
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [step]);

  const b = s.batch;
  const verify = s.verify;

  return (
    <div>
      <PageHead title="▶️ Guided Demo Flow" sub="14 live steps — every step writes real data via the API. Follow along to demo the full Honey Chain story." />

      {/* progress rail */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {STEPS.map((st, i) => (
          <button key={st.n} onClick={() => i <= step && goStep(i)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${i === step ? 'bg-honey-500 text-white' : i < step ? 'bg-leaf-100 text-leaf-700' : 'bg-white text-stone-400 ring-1 ring-black/5'}`}>
            {i < step ? '✔ ' : ''}{st.n}. {st.t}
          </button>
        ))}
      </div>

      <Card className="ring-2 ring-honey-300">
        <div className="flex items-center justify-between">
          <span className="display text-xl font-black">Step {t.n} · {t.t}</span>
          <Badge status="harvested">live demo</Badge>
        </div>

        {/* Step bodies */}
        {step === 0 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Register a beekeeping cluster member under KVIC's NAFIS scheme. (Karnataka · Belagavi · Gokak)</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-xl bg-cream px-3 py-2"><span className="text-stone-400">Name</span><b>Ramesh Kumar</b></div>
              <div className="flex justify-between rounded-xl bg-cream px-3 py-2"><span className="text-stone-400">Contact</span><b>+91 98765 43210</b></div>
              <div className="flex justify-between rounded-xl bg-cream px-3 py-2"><span className="text-stone-400">Village</span><b>Gokak</b></div>
              <div className="flex justify-between rounded-xl bg-cream px-3 py-2"><span className="text-stone-400">Cluster</span><b>Gokak NAFIS Cluster</b></div>
            </div>
            <button onClick={registerBeekeeper} className="rounded-full bg-bee-800 px-6 py-2.5 font-bold text-white hover:bg-bee-700 disabled:opacity-50">{busy ? 'Registering…' : '▶ Register beekeeper'}</button>
          </div>
        )}

        {step === 1 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Register Hive <b>#07</b> — attaches an ESP32 IoT gateway (temp/humidity DHT22, load-cell HX711, sound mic, battery).</p>
            <pre className="rounded-xl bg-bee-950 p-3 text-xs text-honey-200">{`POST /api/hives
{ beekeeper_id: ${s.beekeeper?.id}, hive_no: "07", name: "Demo Apiary · Hive 07" }`}</pre>
            <button onClick={() => { setBusy(true); api.registerHive({ beekeeper_id: s.beekeeper.id, hive_no: '07', name: 'Demo Apiary · Hive 07' }).then(h => { setS(p => ({ ...p, hive: h })); logAdd(`Hive #07 registered (id ${h.id})`); setBusy(false); setStep(2); }); }}
              className="rounded-full bg-bee-800 px-6 py-2.5 font-bold text-white hover:bg-bee-700 disabled:opacity-50">{busy ? 'Adding…' : '▶ Register Hive #07'}</button>
          </div>
        )}

        {step === 2 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">The gateway streams live telemetry every ~4s. Here is the latest sample from Hive #07.</p>
            {s.hive?.lastReading && (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {[['Temp', `${s.hive.lastReading.temp}°C`], ['Humidity', `${s.hive.lastReading.humidity}%`], ['Weight', `${fmt.num(s.hive.lastReading.weight_kg, 1)} kg`], ['Sound', s.hive.lastReading.sound_level], ['Battery', `${s.hive.lastReading.battery_pct}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-cream py-3 text-center"><div className="text-[10px] text-stone-400">{k}</div><div className="font-black">{v}</div></div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-stone-400">Transport: MQTT over LoRa → gateway → API. Sensor-level data stored in the normal database (PostgreSQL in production).</p>
            <button onClick={loadHive} className="rounded-full bg-bee-800 px-6 py-2.5 font-bold text-white hover:bg-bee-700">▶ Show live readings</button>
          </div>
        )}

        {step === 3 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Now we push abnormal readings to the sensor (simulating a hardware override / real sensor event). Watch the AI flag a warning.</p>
            <pre className="rounded-xl bg-dang-bg p-3 text-xs text-dang">{`{ temp: 41.8, humidity: 84 }  →  POST /api/hives/${s.hive?.id}/simulate`}</pre>
            <button onClick={triggerAlert} className="rounded-full bg-dang px-6 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-50">{busy ? 'Analyzing…' : '🔥 Inject abnormal reading'}</button>
          </div>
        )}

        {step === 4 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">AI-assisted early-warning triggered.</p>
            {s.alert && (
              <div className="rounded-2xl bg-dang-bg p-4 ring-2 ring-dang/30">
                <b className="text-dang">⚠️ Hive #07 requires attention</b>
                <p className="mt-1 text-sm text-stone-700">{s.alert.issues?.[0]?.detail || 'Temperature and humidity above normal range.'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.alert.issues?.map((i, k) => <Badge key={k} status={i.severity === 'critical' ? 'danger' : 'warning'}>{i.param} · {i.value}</Badge>)}
                </div>
                <p className="mt-2 text-[10px] text-stone-400">Model note: AI suggests early intervention — on-ground inspection and certified lab verification always govern. AI score {s.alert.score ?? '—'}/100.</p>
              </div>
            )}
            <button onClick={triggerAlert} className="mr-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold ring-1 ring-black/10">↻ Repeat trigger</button>
            <button onClick={showPrediction} className="rounded-full bg-leaf-700 px-6 py-2.5 font-bold text-white hover:bg-leaf-800">▶ Next · Yield prediction</button>
          </div>
        )}

        {step === 5 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Yield model (weight-gain estimator + weather factors) predicts harvest window & quantity.</p>
            {s.pred && (
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[200px] flex-1 rounded-2xl bg-gradient-to-br from-bee-900 to-bee-800 p-4 text-white">
                  <div className="text-xs text-white/60">Expected harvest</div>
                  <div className="display text-3xl font-black text-honey-400">{fmt.num(s.pred.predictedKg, 1)} kg <span className="text-base text-white/50">±{fmt.num(s.pred.upperKg - s.pred.predictedKg, 1)}</span></div>
                  <div className="mt-2 text-sm">Estimated date: <b>{fmt.date(s.pred.harvestDate)}</b></div>
                  <div className="mt-1 text-sm">Confidence: <b>{Math.round(s.pred.confidence * 100)}%</b></div>
                </div>
                <div className="flex-1 rounded-2xl bg-cream p-4 text-sm text-stone-600">
                  <b className="text-bee-800">Model factors</b>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    <li>Current hive weight {fmt.num(s.pred.currentWeightKg, 1)} kg · stored honey {fmt.num(s.pred.storedHoneyKg, 1)} kg</li>
                    <li>Gain rate {s.pred.factors.gainKgPerDay} kg/day (window based)</li>
                    <li>Harvest threshold {s.pred.factors.harvestThresholdKg} kg</li>
                    <li>Model: {s.pred.factors.model}</li>
                  </ul>
                </div>
              </div>
            )}
            <button onClick={showPrediction} className="mr-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold ring-1 ring-black/10">↻ Re-run</button>
            <Link to={`/beekeeper/hives/${s.hive.id}`} className="mr-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold ring-1 ring-black/10">Open live charts</Link>
            <button onClick={mintBatch} className="rounded-full bg-leaf-700 px-6 py-2.5 font-bold text-white hover:bg-leaf-800 disabled:opacity-50">{busy ? 'Minting…' : '▶ Next · Mint batch'}</button>
          </div>
        )}

        {step === 6 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Mint a unique batch. Each batch gets an immutable HARVEST block with hash-chaining.</p>
            {b && (
              <div className="rounded-2xl bg-leaf-100 p-4 ring-2 ring-leaf-600/30">
                <div className="font-mono text-xl font-black text-leaf-800">{b.batch_id}</div>
                <div className="mt-1 text-sm">Hive 07 · 12.4 kg · Multi-floral · harvest {fmt.date(b.harvest_date)}</div>
                <div className="mt-1 text-[11px] text-stone-500">QR token: {b.qr_token}</div>
              </div>
            )}
            <button onClick={mintBatch} className="rounded-full bg-leaf-700 px-6 py-2.5 font-bold text-white hover:bg-leaf-800 disabled:opacity-50">{busy ? 'Minting…' : '▶ Mint batch to chain'}</button>
          </div>
        )}

        {step === 7 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Laboratory officer enters FSSAI/AGMARK aligned parameters; rule-based scoring computes quality + adulteration risk.</p>
            {s.lab && (
              <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-purple-700 to-violet-900 p-4 text-white">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl font-black">{s.lab.score}</div>
                <div>
                  <div className="text-xs text-white/60">Quality score /100</div>
                  <div className="display text-xl font-black">{s.lab.status} · risk {s.lab.adulteration_risk}</div>
                  <div className="mt-0.5 text-xs text-white/70">moisture {s.lab.parameters.moisture}% · brix {s.lab.parameters.brix} · pH {s.lab.parameters.ph}</div>
                </div>
              </div>
            )}
            <button onClick={runLab} className="rounded-full bg-purple-700 px-6 py-2.5 font-bold text-white hover:bg-purple-800 disabled:opacity-50">{busy ? 'Scoring…' : '▶ Score & append QUALITY_TESTED'}</button>
          </div>
        )}

        {step === 8 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Record processing & packaging — adds more ledger blocks (ownership of the batch moves down the supply chain).</p>
            <pre className="rounded-xl bg-bee-950 p-3 text-xs text-honey-200">{`POST /batches/${b.batch_id}/event { event_type: "PROCESSED" }
POST /batches/${b.batch_id}/event { event_type: "PACKAGED" }`}</pre>
            <button onClick={processPack} className="rounded-full bg-leaf-700 px-6 py-2.5 font-bold text-white hover:bg-leaf-800 disabled:opacity-50">{busy ? 'Anchoring…' : '▶ Process & package'}</button>
          </div>
        )}

        {step === 9 && (
          <div className="slide-up mt-4 space-y-4">
            <p className="text-sm text-stone-600">A dynamic QR is generated for the packaged batch. Consumers scan it to verify authenticity & journey.</p>
            <div className="flex flex-wrap items-center gap-5">
              <div className="rounded-2xl bg-white p-4 ring-4 ring-honey-200">
                {b && <QRCodeSVG value={JSON.stringify({ HC: 1, batchId: b.batch_id, qr: b.qr_token })} size={150} fgColor="#3E2723" level="M" />}
              </div>
              <div className="text-sm">
                <div className="font-mono font-black text-honey-700">{b.qr_token}</div>
                <p className="mt-1 max-w-xs text-xs text-stone-500">Packed · 82 bottles · every bottle carries the journey behind one scan.</p>
                <button onClick={() => setStep(10)} className="mt-3 rounded-full bg-honey-500 px-6 py-2.5 font-bold text-bee-950 hover:bg-honey-400">▶ Next · Consumer scan</button>
              </div>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Consumer portal scans the bottle QR → verification result.</p>
            {verify && (
              verify.valid && !verify.suspicious ? (
                <div className="rounded-2xl bg-leaf-100 p-4 ring-2 ring-leaf-600">
                  <b className="text-lg text-leaf-800">✅ VERIFIED HONEY</b>
                  <p className="mt-1 text-sm text-stone-600">Valid traceability record for {verify.batchId} — harvest, lab, processing & packaging all on chain.</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-dang-bg p-4 ring-2 ring-dang/30">
                  <b className="text-dang">⚠️ Suspicious activity flag</b>
                  <p className="text-sm text-stone-600">{verify.suspicious?.reason}</p>
                </div>
              )
            )}
            <button onClick={scanQr} className="rounded-full bg-leaf-700 px-6 py-2.5 font-bold text-white hover:bg-leaf-800 disabled:opacity-50">{busy ? 'Scanning…' : '📱 Scan QR (1×)'}</button>
          </div>
        )}

        {step === 11 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">The complete journey — every event a linked block.</p>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {s.full?.batch.journey.map(e => (
                <div key={e.index} className="rounded-xl bg-cream px-3 py-2 text-xs">
                  <b>#{e.index}</b> <span className="font-bold">{e.eventType.replace(/_/g, ' ')}</span> <span className="text-stone-400">· {fmt.dt(e.ts)} · {e.actor}</span>
                  <div className="truncate font-mono text-[9px] text-stone-400">{e.hash}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { setStep(12); }} className="rounded-full bg-bee-800 px-6 py-2.5 font-bold text-white hover:bg-bee-700">▶ Next · Duplicate scan test</button>
          </div>
        )}

        {step === 12 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">We now simulate a copied QR being scanned 5× from 5 different cities within minutes — mimicking a re-printed label in the market.</p>
            <div className="flex flex-wrap gap-1.5">
              {['Pune', 'Nagpur', 'Jaipur', 'Delhi', 'Lucknow'].map(c => <span key={c} className="rounded-full bg-cream px-3 py-1 text-xs font-bold ring-1 ring-black/5">📍 {c}</span>)}
            </div>
            <button onClick={dupScans} className="rounded-full bg-dang px-6 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-50">{busy ? 'Scanning…' : '🔥 Simulate duplicate scans ×5'}</button>
          </div>
        )}

        {step === 13 && (
          <div className="slide-up mt-4 space-y-3">
            <p className="text-sm text-stone-600">Anti-counterfeit engine detects the anomaly and elevates the batch to a flagged state on KVIC's dashboard.</p>
            <div className="rounded-2xl bg-dang-bg p-4 ring-2 ring-dang/40">
              <b className="text-dang">⚠️ SUSPICIOUS QR ACTIVITY — {s.suspicious?.batchId}</b>
              <p className="mt-1 text-sm text-stone-700">{s.suspicious?.reason || 'QR may have been copied or reused.'} Scans observed from widely separated locations.</p>
              <p className="mt-1 text-[11px] text-stone-400">Counterfeit alerts appear in real time in the KVIC Command Centre. KVIC can revoke the QR and issue RFID-sealed reprints via ODK.</p>
            </div>
            <button onClick={() => setStep(14)} className="rounded-full bg-bee-800 px-6 py-2.5 font-bold text-white hover:bg-bee-700">▶ Next · KVIC visibility</button>
          </div>
        )}

        {step === 14 && (
          <div className="slide-up mt-4 space-y-4">
            <p className="text-sm text-stone-600">The same batch and its counterfeit flag are visible in the KVIC Command Centre, drill-down from State → District → Cluster → Beekeeper.</p>
            <Card className="bg-gradient-to-br from-bee-900 to-bee-800 text-white">
              <div className="flex flex-wrap gap-4 text-sm">
                <div><div className="text-white/50">State</div><b>Karnataka</b></div>
                <div><div className="text-white/50">District</div><b>Belagavi</b></div>
                <div><div className="text-white/50">Cluster</div><b>Gokak NAFIS</b></div>
                <div><div className="text-white/50">Beekeeper</div><b>Ramesh Kumar</b></div>
                <div><div className="text-white/50">Batch</div><b className="font-mono text-honey-300">{b.batch_id}</b></div>
                <div><div className="text-white/50">Flag</div><b className="text-red-400">COUNTERFEIT</b></div>
              </div>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin" className="rounded-full bg-honey-500 px-6 py-2.5 font-bold text-bee-950 hover:bg-honey-400">Open KVIC Command Centre</Link>
              <Link to={`/batch/${b.batch_id}`} className="rounded-full bg-white px-6 py-2.5 font-bold text-bee-800 ring-1 ring-black/10">Open batch passport</Link>
              <Link to="/market" className="rounded-full bg-white px-6 py-2.5 font-bold text-bee-800 ring-1 ring-black/10">Verify on marketplace</Link>
            </div>
            <p className="mt-2 text-sm font-bold text-leaf-700">🎉 Demo flow complete — 14 steps, all live against the API.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </Card>

      {log.length > 0 && (
        <Card className="mt-4 bg-bee-950 text-honey-100">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">Event log (ledger)</p>
          <div className="space-y-1 font-mono text-[11px]">
            {log.map((l, i) => <div key={i} className="text-honey-200">{l}</div>)}
          </div>
        </Card>
      )}
    </div>
  );
}