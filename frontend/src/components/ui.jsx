export function Card({ children, className = '' }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function Stat({ icon, label, value, sub, tone = 'honey' }) {
  const tones = {
    honey: 'bg-honey-100 text-honey-800',
    green: 'bg-leaf-100 text-leaf-700',
    warn: 'bg-warn-bg text-warn',
    dang: 'bg-dang-bg text-dang',
    brown: 'bg-amber-soft text-bee-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`gird${tone} place-items-center shrink-0 grid h-12 w-12 rounded-xl text-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</div>
        <div className="display text-2xl leading-tight font-bold">{value}{sub && <span className="ml-1 text-sm font-medium text-stone-500">{sub}</span>}</div>
      </div>
    </Card>
  );
}

export function Badge({ status, children }) {
  const map = {
    healthy: 'bg-leaf-100 text-leaf-700',
    green: 'bg-leaf-100 text-leaf-700',
    warning: 'bg-warn-bg text-warn',
    warn: 'bg-warn-bg text-warn',
    critical: 'bg-dang-bg text-dang',
    danger: 'bg-dang-bg text-dang',
    passed: 'bg-leaf-100 text-leaf-700',
    harvested: 'bg-amber-soft text-bee-700',
    packed: 'bg-amber-soft text-bee-700',
    low: 'bg-leaf-100 text-leaf-700',
    medium: 'bg-warn-bg text-warn',
    high: 'bg-dang-bg text-dang',
    criticalQ: 'bg-dang-bg text-dang',
    suspect: 'bg-warn-bg text-warn',
    rejected: 'bg-dang-bg text-dang',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${map[String(status).toLowerCase()] || 'bg-stone-100 text-stone-600'}`}>
      {children || status}
    </span>
  );
}

export function Dot({ color = '#43A047' }) {
  return <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

export function PageHead({ title, sub, right }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-2xl sm:text-3xl font-black text-bee-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center text-stone-400">
      <div className="flex flex-col items-center gap-3">
        <span className="animate-spin text-3xl">🐝</span>
        <span className="text-xs font-medium">Loading Honey Chain…</span>
      </div>
    </div>
  );
}

export function Empty({ message }) {
  return <div className="grid min-h-[30vh] place-items-center text-sm text-stone-400">{message || 'No data'}</div>;
}

export const fmt = {
  num: (n, d = 0) => (n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d })),
  dt: (iso) => (iso ? new Date(iso.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'),
  date: (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
  timeAgo: (iso) => {
    const sec = (Date.now() - new Date(iso.replace(' ', 'T'))) / 1000;
    if (sec < 60) return `${Math.round(sec)}s ago`;
    if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
    return `${Math.round(sec / 86400)}d ago`;
  },
};

export const healthColor = (status) => (status === 'healthy' ? '#43A047' : status === 'warning' ? '#F9A825' : '#E53935');

export const EVENT_META = {
  HARVEST: { icon: '🍯', color: '#D98A0F', label: 'Harvest', desc: 'Batch created at apiary' },
  QUALITY_TESTED: { icon: '🧪', color: '#8E24AA', label: 'Quality Testing', desc: 'Laboratory verification' },
  PROCESSED: { icon: '🏭', color: '#1565C0', label: 'Processing', desc: 'Processing unit' },
  PACKAGED: { icon: '📦', color: '#6D4C41', label: 'Packaging', desc: 'Bottling & QR label' },
  OWNERSHIP_TRANSFER: { icon: '🔄', color: '#00897B', label: 'Ownership Transfer', desc: 'Handover in supply chain' },
  SOLD: { icon: '🛒', color: '#C62828', label: 'Consumer Purchase', desc: 'Reached consumer' },
  REJECTED: { icon: '⛔', color: '#E53935', label: 'Rejected', desc: 'Non-conforming batch' },
  GENESIS: { icon: '🔗', color: '#757575', label: 'Genesis', desc: 'Ledger initialization' },
};