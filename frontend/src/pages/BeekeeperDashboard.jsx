import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { T } from '../i18n.js';
import { Badge, Card, Dot, Empty, PageHead, Spinner, Stat, fmt, healthColor } from '../components/ui.jsx';

export default function BeekeeperDashboard() {
  const { me, lang } = useApp();
  const t = T(lang);
  const [hives, setHives] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    if (!me?.beekeeper_id) return;
    api.hives(me.beekeeper_id).then(setHives).catch(() => setHives([]));
    api.alerts(me.beekeeper_id).then(setAlerts).catch(() => {});
    api.weather().then(setWeather).catch(() => {});
    api.batches(me.beekeeper_id).then(setBatches).catch(() => {});
  }, [me?.beekeeper_id]);

  const live = useMemo(() => hives ?? [], [hives]);
  const healthy = live.filter(h => h.status === 'healthy').length;
  const warning = live.filter(h => h.status === 'warning').length;
  const critical = live.filter(h => h.status === 'critical').length;
  const totalStore = live.reduce((s, h) => s + (h.lastReading?.weight_kg ?? 0), 0);
  const harvestGoal = live.filter(h => (h.lastReading?.weight_kg ?? 0) >= 40).length;
  const open = alerts.filter(a => !a.resolved);

  if (!me?.beekeeper_id) return <Empty message="Switch to a Beekeeper role from the Role Portal." />;
  if (!hives) return <Spinner />;

  return (
    <div>
      <PageHead
        title={`ॐ Namaste, ${me?.name || 'Beekeeper'}`}
        sub={`Gokak NAFIS Cluster · Belagavi, Karnataka · 28 hives across 3 apiaries`}
        right={
          <div className="flex gap-2">
            <Link to="/beekeeper/flow" className="rounded-full bg-honey-500 px-4 py-2 text-sm font-bold text-bee-950 hover:bg-honey-400">➕ New Hive / Batch</Link>
            <Link to="/assistant" className="rounded-full bg-bee-800 px-4 py-2 text-sm font-bold text-white hover:bg-bee-700">🎙️ Ask Assistant</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon="🏠" label={t.totalHives} value={live.length} sub="hives" tone="honey" />
        <Stat icon="🟢" label={t.healthy} value={healthy} sub={`${live.length ? Math.round(healthy / live.length * 100) : 0}%`} tone="green" />
        <Stat icon="🟡" label={t.attentionRequired} value={warning + critical} sub="hives" tone="warn" />
        <Stat icon="🍯" label={t.currentProduction} value={fmt.num(totalStore, 1)} sub="kg stored" tone="brown" />
        <Stat icon="📅" label={t.nextHarvest} value={open.length ? 'ASAP' : fmt.num(Math.round(8), 0)} sub={`${harvestGoal} hives ready`} tone="sky" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Hive grid */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display font-black">🧑‍🌾 My Apiaries · Live</h2>
              <span className="flex items-center gap-1.5 text-xs font-bold text-leaf-700"><Dot /> IoT live · {fmt.timeAgo(new Date().toISOString())}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {live.map(h => (
                <Link key={h.id} to={`/beekeeper/hives/${h.id}`} className="group rounded-2xl border border-black/5 bg-cream/60 p-3 transition hover:border-honey-400 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="display font-black">{h.hive_no}</span>
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: healthColor(h.status) }} />
                  </div>
                  <h4 className="mt-1 truncate text-xs text-stone-500">{h.name}</h4>
                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <span className="text-stone-400">Temp</span><span className="text-right font-bold">{h.lastReading?.temp ?? '—'}{h.lastReading && '°C'}</span>
                    <span className="text-stone-400">Humidity</span><span className="text-right font-bold">{h.lastReading?.humidity ?? '—'}{h.lastReading && '%'}</span>
                    <span className="text-stone-400">Weight</span><span className="text-right font-bold">{h.lastReading ? `${fmt.num(h.lastReading.weight_kg, 1)} kg` : '—'}</span>
                    <span className="text-stone-400">Battery</span><span className="text-right font-bold">{h.lastReading?.battery_pct ?? '—'}%</span>
                  </div>
                  <div className="mt-2"><Badge status={h.status}>{t[h.status] || h.status}</Badge></div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Alerts */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="display font-black">🔔 {t.recentAlerts}</h2>
              <Badge status={open.length ? 'warning' : 'green'}>{open.length ? `${open.length} open` : 'clear'}</Badge>
            </div>
            <div className="space-y-2.5">
              {alerts.slice(0, 5).map(a => (
                <div key={a.id} className={`rounded-xl p-3 ${a.resolved ? 'bg-stone-50' : a.severity === 'critical' ? 'bg-dang-bg' : 'bg-warn-bg'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-bee-800">Hive {a.hive_no} · {a.type}</span>
                    <span className="text-stone-400">{fmt.timeAgo(a.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-600">{a.message}</p>
                </div>
              ))}
              {!alerts.length && <p className="text-sm text-stone-400">{t.allGood} 🍯</p>}
            </div>
          </Card>

          {/* Weather */}
          <Card className="bg-gradient-to-br from-bee-900 to-bee-800 text-white">
            <h2 className="display font-black text-honey-300">⛅ {t.weather}</h2>
            {weather && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/10 p-2.5"><div className="text-[10px] font-semibold uppercase text-white/50">Temp</div><div className="text-lg font-black">{weather.now.temp}°C</div></div>
                <div className="rounded-xl bg-white/10 p-2.5"><div className="text-[10px] font-semibold uppercase text-white/50">Rain</div><div className="text-lg font-black">{weather.now.rain_prob}%</div></div>
                <div className="rounded-xl bg-white/10 p-2.5"><div className="text-[10px] font-semibold uppercase text-white/50">Bloom</div><div className="text-lg font-black">{Math.round(weather.now.floral_index * 100)}%</div></div>
              </div>
            )}
            {weather && <p className="mt-3 text-xs leading-relaxed text-white/75">🌼 {weather.recommendation}</p>}
          </Card>

          {/* Prediction strip */}
          <Card>
            <h2 className="display font-black">🍯 {t.prediction}</h2>
            <div className="mt-3 space-y-2">
              {hives.filter(h => h.prediction && h.prediction.daysToHarvest <= 14).slice(0, 4).map(h => (
                <Link key={h.id} to={`/beekeeper/hives/${h.id}`} className="flex items-center justify-between rounded-xl bg-honey-50 px-3 py-2 ring-1 ring-honey-200">
                  <span className="text-sm font-bold">Hive {h.hive_no}</span>
                  <span className="text-sm">{fmt.num(h.prediction.predictedKg, 1)} kg · <span className="text-stone-500">in {h.prediction.daysToHarvest}d</span></span>
                </Link>
              ))}
              {!hives.some(h => h.prediction) && <p className="text-sm text-stone-400">Predictions appear as weight trends build up.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Batch strip */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display font-black">🍯 My Batches</h2>
          <Link to="/batches" className="text-sm font-bold text-honey-700">All batches →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {batches.slice(0, 4).map(b => (
            <Link key={b.batch_id} to={`/batch/${b.batch_id}`} className="rounded-xl border border-black/5 p-3 transition hover:border-honey-400 hover:shadow-md">
              <div className="font-mono text-[11px] font-bold text-honey-700">{b.batch_id}</div>
              <div className="mt-1 text-sm font-bold">{fmt.num(b.qty_kg, 1)} kg · {fmt.date(b.harvest_date)}</div>
              <div className="mt-1 text-xs text-stone-500">{b.honey_type}</div>
              <div className="mt-2"><Badge status={b.status}>{b.status.replace('_', ' ')}</Badge></div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}