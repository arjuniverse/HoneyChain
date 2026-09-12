import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { LANGS } from './i18n.js';
import Home from './pages/Home.jsx';
import Portal from './pages/Portal.jsx';
import BeekeeperDashboard from './pages/BeekeeperDashboard.jsx';
import HiveDetail from './pages/HiveDetail.jsx';
import BatchesPage from './pages/BatchesPage.jsx';
import BatchTracePage from './pages/BatchTracePage.jsx';
import LabPage from './pages/LabPage.jsx';
import ConsumerPage from './pages/ConsumerPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import BeaconNewHivePage from './pages/BeekeeperFlowPage.jsx';

export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const ROLE_META = {
  beekeeper: { path: '/beekeeper', label: 'Beekeeper', icon: '🧑‍🌾' },
  lab: { path: '/lab', label: 'Laboratory', icon: '🧪' },
  officer: { path: '/admin', label: 'KVIC Officer', icon: '🏛️' },
  consumer: { path: '/consumer', label: 'Consumer', icon: '🛒' },
  processor: { path: '/batches', label: 'Processor', icon: '🏭' },
};

export default function App() {
  const [me, setMe] = useState(null);
  const [lang, setLang] = useState('en');
  const [tick, setTick] = useState(0);
  const boot = () => api.me().then(setMe).catch(() => setMe({ role: 'beekeeper' }));

  useEffect(() => { boot(); }, []);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const setRole = useCallback((id) => { localStorage.setItem('hc_as', String(id)); boot(); }, []);
  const refresh = useCallback(() => boot(), []);
  const locale = useMemo(() => LANGS.find(l => l.code === lang), [lang]);

  const value = { me, setRole, lang, setLang, locale, tick, refresh };

  if (!me) return <div className="grid min-h-screen place-items-center text-stone-400">🐝 Starting Honey Chain…</div>;

  return (
    <Ctx.Provider value={value}>
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/beekeeper" element={<BeekeeperDashboard />} />
            <Route path="/beekeeper/hives/:id" element={<HiveDetail />} />
            <Route path="/beekeeper/flow" element={<BeaconNewHivePage />} />
            <Route path="/batch/:batchId" element={<BatchTracePage />} />
            <Route path="/batches" element={<BatchesPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/consumer" element={<ConsumerPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/market" element={<MarketplacePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Ctx.Provider>
  );
}

const LINKS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/beekeeper', label: 'Beekeeper', icon: '🧑‍🌾', role: 'beekeeper' },
  { to: '/batches', label: 'Batches', icon: '🍯', role: 'beekeeper' },
  { to: '/lab', label: 'Lab', icon: '🧪', role: 'lab' },
  { to: '/admin', label: 'KVIC', icon: '🏛️', role: 'officer' },
  { to: '/market', label: 'Market', icon: '🛒' },
  { to: '/consumer', label: 'Verify Honey', icon: '🔍' },
  { to: '/assistant', label: 'Voice Assistant', icon: '🎙️' },
];

function TopNav() {
  const { me, setLang, lang, locale, refresh, setRole } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const links = LINKS.filter(l => !l.role || l.role === me?.role);
  const isPortal = me?.role === 'consumer';

  return (
    <header className="glass sticky top-0 z-40 border-b border-black/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-honey-400 to-honey-600 text-2xl shadow-sm">🐝</span>
          <span>
            <span className="display block text-lg font-black leading-tight text-bee-900">Honey Chain</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-honey-700">KVIC · Smart Beekeeping</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-honey-500 text-white shadow-sm' : 'text-bee-700 hover:bg-honey-100'}`}>
              <span className="mr-1">{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-bee-800">
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <button onClick={() => { setRole(1); refresh(); nav('/portal'); }}
            className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:flex ${isPortal ? 'bg-bee-800 text-white' : 'bg-honey-500 text-white'}`}>
            👤 {me?.name || me?.role || 'Switch'}
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {links.slice(0, 6).map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-honey-500 text-white' : 'bg-white text-bee-700 ring-1 ring-black/5'}`}>
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
      {loc.pathname === '/health' && null}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5 px-4 py-8 text-center text-xs text-stone-500">
      <p className="font-semibold text-bee-800">🐝 Honey Chain — Blockchain Honey Traceability & Smart Beekeeping Platform</p>
      <p className="mt-1">Prototype under the KVIC Honey Mission · AI-assisted early warning, not a substitute for certified laboratory diagnostics.</p>
      <p className="mt-1 text-[11px] text-stone-400">PostgreSQL · Hyperledger Fabric (permissioned) · ESP32 IoT · FastAPI/React — simulated prototype</p>
    </footer>
  );
}