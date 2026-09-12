import { useNavigate } from 'react-router-dom';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { useEffect, useState } from 'react';
import { Card, PageHead, fmt } from '../components/ui.jsx';

const ROLES = [
  { id: 1, key: 'beekeeper', icon: '🧑‍🌾', title: 'Beekeeper', desc: 'Hive dashboard, IoT monitoring, AI alerts, yield & batches.', color: 'from-honey-400 to-honey-600', go: '/beekeeper' },
  { id: 4, key: 'officer', icon: '🏛️', title: 'KVIC Officer', desc: 'State→district→cluster drill-down, quality & counterfeit alerts.', color: 'from-bee-800 to-bee-950', go: '/admin' },
  { id: 3, key: 'lab', icon: '🧪', title: 'Lab Inspector', desc: 'Enter FSSAI parameters, quality scores & release batches.', color: 'from-purple-500 to-violet-700', go: '/lab' },
  { id: 5, key: 'consumer', icon: '🛒', title: 'Consumer', desc: 'Scan bottle QR & verify the complete honey journey.', color: 'from-leaf-600 to-leaf-800', go: '/consumer' },
  { id: 6, key: 'processor', icon: '🏭', title: 'Processor', desc: 'Record processing, packaging and ownership transfers.', color: 'from-sky-600 to-sky-800', go: '/batches' },
];

export default function Portal() {
  const { setRole } = useApp();
  const nav = useNavigate();
  const [beekeepers, setBeekeepers] = useState([]);
  useEffect(() => { api.beekeepers().then(setBeekeepers).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="Choose your role" sub="Switch roles to explore each portal of the Honey Chain platform." />
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map(r => (
          <Card key={r.id} className="transition hover:-translate-y-0.5 hover:shadow-md">
            <button className="w-full text-left" onClick={() => { setRole(r.id); nav(r.go); }}>
              <div className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${r.color} text-3xl text-white shadow`}>{r.icon}</div>
              <h3 className="display font-black">{r.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{r.desc}</p>
            </button>
          </Card>
        ))}
      </div>
      {beekeepers.length > 0 && (
        <Card className="mt-6 bg-amber-soft/50">
          <p className="text-sm font-bold text-bee-800">Registered beekeepers ({beekeepers.length})</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {beekeepers.map(b => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <button className="rounded-full bg-honey-300 px-2 py-0.5 font-bold text-honey-900" onClick={() => nav('/beekeeper')}>{b.id}</button>
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-stone-500">{b.village} · {b.cluster}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <p className="mt-6 text-center text-xs text-stone-400">Prototype auth — no passwords required. {fmt.date(new Date().toISOString())}</p>
    </div>
  );
}