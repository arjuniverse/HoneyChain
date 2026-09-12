import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api.js';
import { Card } from '../components/ui.jsx';

const FEATURES = [
  { icon: '📡', title: 'IoT Smart Hives', desc: 'Live temperature, humidity, weight, sound & battery from ESP32 sensors.', tag: 'Live' },
  { icon: '🤖', title: 'AI Hive Health', desc: 'AI-assisted early warning predicting colony stress before it is visible.', tag: 'AI' },
  { icon: '📈', title: 'Yield Prediction', desc: 'Estimates harvest quantity, date and confidence from weight trends + weather.', tag: 'AI' },
  { icon: '🔗', title: 'Blockchain Traceability', desc: 'Permissioned ledger — every harvest, lab test, process & handover immutably.', tag: 'Chain' },
  { icon: '🔍', title: 'QR Consumer Verification', desc: 'Scan once, see the whole journey from hive to bottle. Anti-counterfeit built-in.', tag: 'QR' },
  { icon: '🛡️', title: 'Anti-Counterfeit', desc: 'Detects copied QR codes via scan-rate & geo-spread analytics.', tag: 'Risk' },
  { icon: '🧪', title: 'Quality Module', desc: 'Lab scoring on FSSAI/AGMARK-aligned parameters with adulteration risk.', tag: 'Lab' },
  { icon: '🛒', title: 'Marketplace', desc: 'Verified batches listed directly for buyers — stronger market linkages.', tag: 'Market' },
  { icon: '🗣️', title: 'Multilingual Voice', desc: 'English, हिन्दी & ಕನ್ನಡ voice/text assistant for rural beekeepers.', tag: 'Voice' },
];

export default function Home() {
  const [sys, setSys] = useState(null);
  useState(() => { api.system().then(setSys).catch(() => {}); }, []);
  return (
    <div>
      <section className="grid-hex relative overflow-hidden rounded-3xl bg-gradient-to-br from-bee-900 via-bee-800 to-bee-950 px-6 py-14 text-white sm:px-12">
        <div className="pointer-events-none absolute -right-10 -top-16 text-[220px] opacity-10">🐝</div>
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide">
            <span className="live-dot h-2 w-2 rounded-full bg-honey-300" /> KVIC Honey Mission · Prototype 2026
          </span>
          <h1 className="display mt-5 text-4xl font-black leading-tight sm:text-6xl">
            Every drop of honey, <span className="text-honey-400">on the chain.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            Honey Chain connects rural beekeepers with IoT hive sensors, AI health & yield intelligence, blockchain batch
            traceability and instant QR verification — from <b className="text-honey-300">hive to bottle</b>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/beekeeper" className="rounded-full bg-honey-500 px-6 py-3 font-bold text-bee-950 shadow-lg shadow-honey-500/25 transition hover:bg-honey-400">🧑‍🌾 Beekeeper Dashboard</Link>
            <Link to="/consumer" className="rounded-full bg-white/10 px-6 py-3 font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20">🔍 Verify a Bottle</Link>
            <Link to="/admin" className="rounded-full bg-white/10 px-6 py-3 font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20">🏛️ KVIC Admin</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-xs font-semibold text-white/60">
            <span>✓ Wi-Fi-free offline-first app</span>
            <span>✓ English · हिन्दी · ಕನ್ನಡ</span>
            <span>✓ 28 hives live · 3 batches on chain</span>
          </div>
        </div>
        {sys && (
          <div className="absolute bottom-4 right-6 hidden rounded-lg bg-white/5 px-3 py-2 text-[10px] text-white/50 ring-1 ring-white/10 lg:block">
            Blockchain integrity: <b className={sys.chain.integrity === 'VERIFIED' ? 'text-leaf-600' : 'text-red-400'}>{sys.chain.integrity}</b> · {sys.chain.blocks} blocks
          </div>
        )}
      </section>

      <section className="mt-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-honey-700">Platform</p>
        <h2 className="display mt-1 text-3xl font-black">From hive to bottle — fully traceable</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <Card key={f.title} className="group transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-honey-100 text-2xl">{f.icon}</span>
                <span className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf-700">{f.tag}</span>
              </div>
              <h3 className="mt-3 font-bold text-bee-900">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-gradient-to-br from-honey-100 to-amber-soft p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="display text-2xl font-black">Try the full 14-step demo flow</h2>
            <p className="mt-1 max-w-xl text-sm text-bee-700/80">
              Register a beekeeper → add Hive #07 → live IoT → trigger an AI warning → predict yield → create <b>HC-KA-2026-000127</b> →
              lab quality → process & pack → generate QR → consumer scan → duplicate-scan counterfeit alert → KVIC visibility.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/beekeeper/flow" className="rounded-full bg-bee-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-bee-700">▶ Start Demo Flow</Link>
            <Link to="/batch/HC-KA-2026-000127" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-bee-800 ring-1 ring-black/10 hover:bg-honey-100">View Batch 000127</Link>
          </div>
        </div>
      </section>
    </div>
  );
}