import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Legend } from 'recharts';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, Dot, Empty, PageHead, Spinner, Stat, fmt, healthColor } from '../components/ui.jsx';

export default function HiveDetail() {
  const { id } = useParams();
  const { tick } = useApp();
  const [hive, setHive] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pred, setPred] = useState(null);
  const [flash, setFlash] = useState(null);
  const [sending, setSending] = useState(false);

  const load = () => {
    api.hive(id).then(setHive).catch(() => {});
    api.readings(id, 300).then(r => setReadings(r.readings)).catch(() => {});
    api.hiveAlerts(id).then(setAlerts).catch(() => {});
    api.predict(id).then(p => p && setPred(p));
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (tick > 0) load(); }, [tick]);

  const chart = useMemo(() => readings.map(r => ({
    t: new Date(r.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    temp: r.temp, humidity: r.humidity, weight: r.weight_kg, sound: r.sound_level, battery: r.battery_pct,
  })), [readings]);
  const last = readings[readings.length - 1];

  async function simulate(over) {
    setSending(true);
    const out = await api.simulate(id, over);
    setFlash(out);
    load();
    setSending(false);
  }
  async function setStress(level) {
    await api.stress(id, level);
    load();
  }

  if (!hive) return <Spinner />;

  return (
    <div>
      <Link to="/beekeeper" className="text-sm font-bold text-honey-700">← My Apiaries</Link>
      <PageHead
        title={`🐝 ${hive.name || `Hive ${hive.hive_no}`}`}
        sub={`Hive No. ${hive.hive_no} · ESP32 ${hive.model} · source: live IoT (simulated transport) · updated ${fmt.timeAgo(new Date().toISOString())}`}
        right={<Badge status={hive.status}>{hive.status.toUpperCase()}</Badge>}
      />

      {flash && (
        <div className={`slide-up mb-5 rounded-2xl p-4 ring-1 ${flash.status === 'healthy' ? 'bg-leaf-100 ring-leaf-600/30' : flash.status === 'warning' ? 'bg-warn-bg ring-warn/40' : 'bg-dang-bg ring-dang/30'}`}>
          <b className="text-sm">AI analysis · {flash.status === 'healthy' ? 'normal conditions' : 'attention needed'}</b>
          <p className="mt-1 text-sm text-stone-700">{flash.issues?.[0]?.detail || 'All parameters within normal range — no abnormality detected.'}</p>
          <p className="mt-1 text-[11px] text-stone-400">AI-assisted early warning based on live IoT trends — not a definitive disease diagnosis. Verify on-site before acting.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon="🌡️" label="Temperature" value={last ? `${last.temp}°C` : '—'} sub="norm 30–36" tone={last?.temp > 36 ? 'dang' : 'honey'} />
        <Stat icon="💧" label="Humidity" value={last ? `${last.humidity}%` : '—'} sub="norm 45–65" tone={last?.humidity > 65 ? 'dang' : 'sky'} />
        <Stat icon="⚖️" label="Weight" value={last ? fmt.num(last.weight_kg, 1) : '—'} sub="kg" tone="brown" />
        <Stat icon="🎧" label="Sound / Vib" value={last ? last.sound_level : '—'} sub={`vib ${last?.vibration ?? '—'}`} tone="warn" />
        <Stat icon="🔋" label="Battery" value={last ? `${last.battery_pct}%` : '—'} sub="ESP32" tone={last?.battery_pct < 20 ? 'dang' : 'green'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="display font-black">📈 Live Sensor Trends</h2>
              <span className="flex items-center gap-1.5 text-xs font-bold text-leaf-700"><Dot /> LIVE · every 4s</span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <ReferenceLine y={36} stroke="#E53935" strokeDasharray="4 4" />
                <ReferenceLine y={30} stroke="#2E7D32" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="temp" stroke="#F5AD1B" strokeWidth={2.5} dot={false} name="Temp °C" />
                <Line type="monotone" dataKey="humidity" stroke="#1E88E5" strokeWidth={2} dot={false} name="Humidity %" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2"><span className="text-[11px] text-stone-400">Dashed = healthy band (temp 30–36°C). Readings outside band flag AI attention.</span></div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="display font-black">⚖️ Weight gain & yield</h2>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chart.slice(-80)} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="#4E342E" strokeWidth={2} dot={false} name="Weight kg" />
                </LineChart>
              </ResponsiveContainer>
              {pred && (
                <div className="mt-2 rounded-xl bg-honey-50 p-3 text-sm ring-1 ring-honey-200">
                  <div className="font-bold">📦 Predicted harvest: {fmt.num(pred.predictedKg, 1)} kg <span className="font-medium text-stone-500">±{fmt.num((pred.upperKg - pred.predictedKg), 1)} kg</span></div>
                  <div className="mt-0.5 text-stone-600">Estimated date: <b>{fmt.date(pred.harvestDate)}</b> · confidence {Math.round(pred.confidence * 100)}%</div>
                  <div className="mt-1 text-[11px] text-stone-400">Model: weight-gain estimator · stored {fmt.num(pred.storedHoneyKg, 1)} kg · gain {pred.factors?.gainKgPerDay} kg/day</div>
                </div>
              )}
            </Card>
            <Card>
              <h2 className="display font-black">🛠️ Simulate & stress</h2>
              <p className="mb-3 text-xs text-stone-400">Override sensor values to test AI alerting (used when hardware is offline).</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button disabled={sending} onClick={() => simulate({ temp: 40.5 })} className="rounded-xl bg-dang-bg px-3 py-2 font-bold text-dang hover:bg-red-100 disabled:opacity-50">🔥 Temp 40°C</button>
                <button disabled={sending} onClick={() => simulate({ humidity: 82 })} className="rounded-xl bg-sky-100 px-3 py-2 font-bold text-sky-700 hover:bg-sky-200 disabled:opacity-50">💧 Humidity 82%</button>
                <button disabled={sending} onClick={() => simulate({ weight_kg: (last?.weight_kg ?? 30) - 2.5 })} className="rounded-xl bg-amber-soft px-3 py-2 font-bold text-bee-700 hover:bg-honey-100 disabled:opacity-50">⚖️ -2.5 kg drop</button>
                <button disabled={sending} onClick={() => simulate({ sound_level: 940, vibration: 95 })} className="rounded-xl bg-purple-50 px-3 py-2 font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50">🎧 Noise spike</button>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Stress mode (IoT state)</p>
                <div className="flex gap-2">
                  {[{ l: 0, x: 'None' }, { l: 1, x: 'Mild' }, { l: 2, x: 'Severe' }].map(o => (
                    <button key={o.l} onClick={() => setStress(o.l)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${hive.stress_mode === o.l ? 'bg-honey-500 text-white ring-honey-500' : 'bg-white text-stone-600 ring-black/10 hover:bg-honey-50'}`}>{o.x}</button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="display font-black">🔔 Alerts · {hive.hive_no}</h2>
            <div className="mt-3 space-y-2">
              {alerts.map(a => (
                <div key={a.id} className={`rounded-xl p-3 ${a.resolved ? 'bg-stone-50' : a.severity === 'critical' ? 'bg-dang-bg' : 'bg-warn-bg'}`}>
                  <div className="flex items-center justify-between"><span className="text-sm font-bold">{a.type}</span><span className="text-xs text-stone-400">{fmt.timeAgo(a.created_at)} {a.resolved && '· resolved'}</span></div>
                  <p className="mt-1 text-[12px] text-stone-600">{a.message}</p>
                </div>
              ))}
              {!alerts.length && <p className="text-sm text-stone-400">No alerts — colony conditions nominal. 🟢</p>}
            </div>
          </Card>
        </div>

        {/* Right: spec panel */}
        <div className="space-y-6">
          <Card>
            <h2 className="display font-black">ℹ️ Hive Profile</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-stone-400">Hive no.</dt><dd className="text-right font-bold">{hive.hive_no}</dd>
              <dt className="text-stone-400">Colony status</dt><dd className="text-right font-bold capitalize" style={{ color: healthColor(hive.status) }}>{hive.status}</dd>
              <dt className="text-stone-400">Gateway</dt><dd className="text-right font-bold">ESP32+LoRa</dd>
              <dt className="text-stone-400">Sensor</dt><dd className="text-right font-bold">DHT22 · HX711</dd>
              <dt className="text-stone-400">Installed</dt><dd className="text-right font-bold">{fmt.date(hive.installed_at)}</dd>
              <dt className="text-stone-400">Base weight</dt><dd className="text-right font-bold">{fmt.num(hive.base_weight_kg)} kg</dd>
            </dl>
            <div className="mt-4 rounded-xl bg-leaf-100 p-3 text-[12px] text-leaf-700">
              <b>Recommended:</b> sup up for surplus honey storage while bloom index is strong; carry out fortnightly inspections.
            </div>
          </Card>
          <Card>
            <h2 className="display font-black">🔒 Batch ledger for this hive</h2>
            <div className="mt-2 space-y-1.5">
              <Link to="/batch/HC-KA-2026-000127" className="flex items-center justify-between round-ed rounded-xl bg-cream px-3 py-2 ring-1 ring-black/5 hover:ring-honey-400">
                <span className="font-mono text-[11px] font-bold">HC-KA-2026-000127</span><span className="text-xs text-stone-500">5 events →</span>
              </Link>
              <Link to="/batch/HC-KA-2026-000126" className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 ring-1 ring-black/5 hover:ring-honey-400">
                <span className="font-mono text-[11px] font-bold">HC-KA-2026-000126</span><span className="text-xs text-stone-500">6 events →</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}