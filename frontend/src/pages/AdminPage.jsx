import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, Empty, PageHead, Spinner, Stat, fmt } from '../components/ui.jsx';

export default function AdminPage() {
  const { tick } = useApp();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [drill, setDrill] = useState(null);
  const [series, setSeries] = useState(null);
  const [chain, setChain] = useState(null);
  const [counter, setCounter] = useState([]);
  const [path, setPath] = useState([]); // drilldown selection stack

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.adminAlerts().then(setAlerts).catch(() => {});
    api.adminDrilldown().then(setDrill).catch(() => {});
    api.productionSeries().then(setSeries).catch(() => {});
    api.chainVerify().then(setChain).catch(() => {});
    api.counterfeit().then(setCounter).catch(() => {});
  }, [tick]);

  if (!stats) return <Spinner />;

  return (
    <div>
      <PageHead
        title="🏛️ KVIC Command Centre"
        sub="National-level monitoring of beekeeping clusters under the Honey Mission."
        right={<Badge status={chain?.valid ? 'green' : 'danger'}>Ledger {chain?.valid ? 'VERIFIED' : 'UNCHECKED'} · {chain?.blocks} blocks</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon="🧑‍🌾" label="Beekeepers" value={stats.beekeepers} tone="honey" />
        <Stat icon="🏠" label="Registered hives" value={stats.hives} sub={`${stats.healthy} healthy`} tone="green" />
        <Stat icon="🫙" label="Honey batches" value={stats.batches} sub={`${stats.verified} verified`} tone="brown" />
        <Stat icon="🍯" label="Production" value={fmt.num(stats.productionLiters, 0)} sub="kg total" tone="sky" />
        <Stat icon="🧪" label="Pending lab" value={stats.pendingLab} tone="warn" />
        <Stat icon="🔔" label="Open alerts" value={stats.openAlerts} sub={`${stats.warning}W · ${stats.critical}C`} tone="warn" />
        <Stat icon="🛡️" label="Counterfeit flags" value={stats.counterfeit} tone="dang" />
        <Stat icon="📱" label="QR verifications" value={stats.totalQrScans} tone="sky" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="display mb-3 font-black">📊 Monthly production (kg)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series?.monthly || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Bar dataKey="qty" fill="#F5AD1B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="display mb-3 font-black">🛡️ Counterfeit / duplicate-QR flags</h2>
          {counter.length ? counter.map(c => (
            <div key={c.batchId} className="mb-2 rounded-xl bg-dang-bg p-3 text-sm">
              <div className="flex items-center justify-between"><b className="font-mono text-xs">{c.batchId}</b><Badge status="danger">FLAGGED</Badge></div>
              <p className="mt-1 text-xs text-stone-600">{c.reason}. {c.scanCount} scans from {c.locations.join(', ')} · beekeeper {c.beekeeper}</p>
            </div>
          )) : <p className="text-sm text-stone-400">No suspicious QR activity across all batches.</p>}
          <p className="mt-2 text-[11px] text-stone-400">Trigger: {'>'}12 scans, rapid bursts (5 in 2 min) or scans spread across 3+ locations.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="display mb-3 font-black">🗺️ Drill-down · State → District → Cluster → Beekeeper</h2>
          {drill ? (
            <div className="text-sm">
              {drill.map(s => (
                <details key={s.state} className="mb-1 rounded-xl bg-cream px-3 py-2" open={path.includes(s.state)}>
                  <summary className="cursor-pointer font-bold">{s.state} <span className="text-stone-400">({s.districts.length} districts)</span></summary>
                  {s.districts.map(d => (
                    <details key={d.district} className="mt-1 ml-3 rounded-lg bg-white px-3 py-1.5">
                      <summary className="cursor-pointer font-semibold text-stone-700">{d.district} <span className="text-stone-400">({d.clusters.length} clusters)</span></summary>
                      {d.clusters.map(c => (
                        <details key={c.cluster} className="ml-3 mt-1">
                          <summary className="cursor-pointer text-stone-600">{c.cluster}</summary>
                          {c.beekeepers.map(b => (
                            <div key={b.id} className="ml-4 mt-1 flex items-center justify-between rounded-lg bg-honey-50 px-3 py-1.5 ring-1 ring-honey-200">
                              <span className="font-semibold">{b.name} <span className="text-xs text-stone-400">· {b.village}</span></span>
                              <span className="text-xs font-bold text-honey-700">{b.hives} hives</span>
                            </div>
                          ))}
                        </details>
                      ))}
                    </details>
                  ))}
                </details>
              ))}
            </div>
          ) : <Empty />}
        </Card>

        <Card>
          <h2 className="display mb-3 font-black">🤖 AI quality & hive alerts</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {alerts.map(a => (
              <div key={a.id} className={`rounded-xl p-3 ${a.resolved ? 'bg-stone-50' : a.severity === 'critical' ? 'bg-dang-bg' : 'bg-warn-bg'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">Hive {a.hive_no} · {a.type}</span>
                  <span className="text-stone-400">{fmt.timeAgo(a.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-stone-600">{a.message}</p>
                {a.ai_analysis?.score != null && <div className="mt-1 text-[10px] text-stone-400">AI health score {a.ai_analysis.score}/100 · warning confidence model v1.2</div>}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-leaf-100 py-2"><div className="text-[10px] text-stone-400">Healthy</div><b className="text-leaf-700">{stats.healthy}</b></div>
            <div className="rounded-xl bg-warn-bg py-2"><div className="text-[10px] text-stone-400">Warning</div><b className="text-warn">{stats.warning}</b></div>
            <div className="rounded-xl bg-dang-bg py-2"><div className="text-[10px] text-stone-400">Critical</div><b className="text-dang">{stats.critical}</b></div>
          </div>
        </Card>
      </div>

      {stats.verifiedChain &&
        <Card className="mt-6 bg-gradient-to-r from-leaf-800 to-leaf-700 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display font-black">🔗 Blockchain ledger operational</h2>
              <p className="mt-1 text-sm text-white/70">{stats.chainBlocks} blocks anchored · SHA-256 hash-chained · integrity verified · permissioned network (Fabric/R3 equivalent for pilot)</p>
            </div>
            <Link to="/batch/HC-KA-2026-000127" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-leaf-800 hover:bg-honey-50">Inspect batch 000127 →</Link>
          </div>
        </Card>}
    </div>
  );
}