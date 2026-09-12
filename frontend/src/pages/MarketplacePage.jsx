import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Badge, Card, Empty, PageHead, Spinner } from '../components/ui.jsx';

export default function MarketplacePage() {
  const { tick, me } = useApp();
  const [listings, setListings] = useState(null);

  useEffect(() => { api.marketplace().then(setListings).catch(() => setListings([])); }, [tick]);

  if (!listings) return <Spinner />;

  return (
    <div>
      <PageHead title="🛒 Honey Marketplace" sub="Direct market linkage for verified KVIC beekeepers — every listing carries its quality score, verified lab status and traceable batch." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.map(l => (
          <Card key={l.id} className="flex flex-col">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-honey-100 text-2xl">🍯</span>
              {l.quality_status === 'PASSED' ? <Badge status="green">Lab PASSED</Badge> : <Badge status="warn">pending</Badge>}
            </div>
            <h3 className="mt-3 font-black">{l.honey_type}</h3>
            <p className="mt-0.5 text-xs text-stone-500">by {l.seller} · {l.village}</p>
            <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <span className="text-stone-400">Quantity</span><span className="text-right font-bold">{l.listing_qty_kg} kg</span>
              <span className="text-stone-400">Price</span><span className="text-right font-bold">₹{l.price_per_kg}/kg</span>
              <span className="text-stone-400">Quality score</span><span className="text-right font-bold">{l.score ?? '—'}/100</span>
              <span className="text-stone-400">Adulteration risk</span><span className="text-right"><Badge status={l.adulteration_risk || 'low'}>{l.adulteration_risk || 'low'}</Badge></span>
            </div>
            <Link to={`/batch/${l.batch_id}`} className="mt-4 flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-xs font-bold text-honey-700 ring-1 ring-black/5 hover:bg-honey-100">
              <span className="font-mono">{l.batch_id}</span><span>trace →</span>
            </Link>
            <button className="mt-2 rounded-full bg-bee-800 py-2 text-sm font-bold text-white hover:bg-bee-700" onClick={() => alert(`Enquiry sent for ${l.batch_id} (${l.honey_type}) — demo: buyer interest recorded.`)}>📩 Send buyer enquiry</button>
          </Card>
        ))}
      </div>
      {!listings.length && <Empty message="No active listings." />}
    </div>
  );
}