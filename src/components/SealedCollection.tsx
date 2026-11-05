'use client';
// Sealed Collection (ETBs, booster boxes, tins...). Michael, 2026-11-04. Tracked on its own, separate from cards.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { Banner } from '@/components/CollectionHome';
import AddToPileButton from '@/components/AddToPileButton';

type Item = { id: number; product_id: number; name: string; set_name?: string; type?: string; in_stock?: boolean; image_url: string; quantity: number; price: number; value_when_added: number | null; price_paid: number | null };
type Data = { count: number; value: number; paid: number; gain_loss: number; items: Item[] };
type Found = { id: number; name: string; set_name?: string; image_url: string; price: number };

const money = (n: number) => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const box: React.CSSProperties = { background: '#14141c', border: '1px solid #262636', borderRadius: 12 };
const qtyBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 6, border: '1px solid #2a2a3a', background: '#1e1e2a', color: '#fff', cursor: 'pointer', lineHeight: 1 };
const hdr = { 'Content-Type': 'application/json' };

export default function SealedCollection() {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [adding, setAdding] = useState(false);
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  const load = useCallback(() => {
    if (!localStorage.getItem('access_token')) { setD({ count: 0, value: 0, paid: 0, gain_loss: 0, items: [] }); return; }
    authFetch('/api/sealed-collection/').then(r => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const setQty = async (it: Item, q: number) => {
    await authFetch(`/api/sealed-collection/items/${it.id}/`, { method: 'PATCH', headers: hdr, body: JSON.stringify({ quantity: q }) });
    load();
  };
  const setPaid = async (it: Item) => {
    const input = window.prompt('Price you paid per item (R). Leave blank to clear:', it.price_paid != null ? String(it.price_paid) : '');
    if (input === null) return;
    const clean = input.replace(/[^0-9.,]/g, '').replace(',', '.');
    await authFetch(`/api/sealed-collection/items/${it.id}/`, { method: 'PATCH', headers: hdr, body: JSON.stringify({ price_paid: clean === '' ? null : parseFloat(clean) }) });
    load();
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Banner label={`Sealed Collection — ${d?.count ?? 0} item${d?.count === 1 ? '' : 's'}`}
        t={d ? { cards: d.count, value: d.value, paid: d.paid, gain_loss: d.gain_loss } : null} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: '#999' }}>Booster boxes, ETBs, tins and other sealed product. Counted on its own, separate from your cards. Items we have in stock show an Add to pile button.</div>
        <button onClick={() => (loggedIn ? setAdding(a => !a) : router.push('/auth/login'))}
          style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>
          {adding ? 'Done adding' : '+ Add sealed'}
        </button>
      </div>
      {adding && <AddSealed onAdded={load} />}
      {!d ? <div style={{ color: '#666', textAlign: 'center' }}>Loading…</div>
        : d.items.length === 0 ? <div style={{ color: '#777', textAlign: 'center', padding: 30 }}>{loggedIn ? 'No sealed product yet — tap “+ Add sealed”.' : 'Log in to track your sealed collection.'}</div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            {d.items.map(it => {
              const base = it.price_paid ?? it.value_when_added;
              const delta = base != null ? (it.price - base) * it.quantity : null;
              return (
                <div key={it.id} style={{ ...box, padding: 8, textAlign: 'center' }}>
                  {it.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={it.image_url} alt={it.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: 6 }} />
                    : <div style={{ aspectRatio: '1/1', background: '#1e1e2a', borderRadius: 6 }} />}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 6 }}>{it.name}</div>
                  {it.set_name && <div style={{ fontSize: 10, color: '#888', minHeight: 14 }}>{it.set_name}</div>}
                  <div style={{ fontSize: 12, color: '#ccc', margin: '4px 0' }}>{money(it.price)}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <button onClick={() => setQty(it, it.quantity - 1)} style={qtyBtn} title={it.quantity === 1 ? 'Remove' : 'Less'}>{it.quantity === 1 ? '🗑' : '−'}</button>
                    <span style={{ fontSize: 13, minWidth: 18, color: '#ddd' }}>{it.quantity}</span>
                    <button onClick={() => setQty(it, it.quantity + 1)} style={qtyBtn}>+</button>
                  </div>
                  {it.in_stock && <div style={{ margin: '4px 0' }}><AddToPileButton productId={it.product_id} hasStock size="sm" price={it.price} name={it.name} /></div>}
                  <button onClick={() => setPaid(it)} style={{ fontSize: 10, color: '#9ad', background: 'transparent', border: '1px dashed #345', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                    {it.price_paid != null ? `Paid ${money(it.price_paid)}` : '+ Paid'}
                  </button>
                  {delta != null && <div style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? '#22c55e' : '#f87171', marginTop: 3 }}>{delta >= 0 ? '+' : '−'}{money(Math.abs(delta))}</div>}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function AddSealed({ onAdded }: { onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [setName, setSetName] = useState('');
  const [sets, setSets] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [results, setResults] = useState<Found[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<Record<number, boolean>>({});

  useEffect(() => {
    authFetch('/api/sealed-collection/sets/').then(r => (r.ok ? r.json() : [])).then(setSets).catch(() => setSets([]));
    authFetch('/api/sealed/facets/').then(r => (r.ok ? r.json() : { types: [] })).then(d => setTypes((d.types || []).map((t: { name: string }) => t.name))).catch(() => setTypes([]));
  }, []);

  // Typing searches by name; picking a set shows every sealed product in it (same as the card collections).
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (setName) qs.set('set', setName);
      if (type) qs.set('type', type);
      if (q.trim() && !setName) qs.set('q', q.trim());
      authFetch(`/api/sealed-collection/search/?${qs.toString()}`)
        .then(r => (r.ok ? r.json() : [])).then(setResults).catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, setName, type]);

  const add = async (f: Found) => {
    const r = await authFetch('/api/sealed-collection/items/', { method: 'POST', headers: hdr, body: JSON.stringify({ product_id: f.id, quantity: 1 }) });
    if (r.ok) {
      setFlash(x => ({ ...x, [f.id]: true }));
      setTimeout(() => setFlash(x => ({ ...x, [f.id]: false })), 1200);
      onAdded();
    }
  };

  return (
    <div style={{ ...box, padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input value={q} onChange={e => { setQ(e.target.value); if (e.target.value) setSetName(''); }}
          placeholder="Search sealed (e.g. Elite Trainer Box, Booster Bundle)…"
          style={{ flex: '1 1 240px', padding: '10px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }} />
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ flex: '1 1 180px', padding: '10px 12px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }}>
          <option value="">All product types</option>
          {types.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={setName} onChange={e => { setSetName(e.target.value); setQ(''); }}
          style={{ flex: '1 1 220px', padding: '10px 12px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }}>
          <option value="">…or browse a whole set</option>
          {sets.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {loading && <div style={{ color: '#777', fontSize: 12 }}>Searching…</div>}
      {!loading && results.length === 0 && (
        <div style={{ color: '#777', fontSize: 12 }}>
          No sealed product found.{sets.length === 0 ? ' The sealed catalogue has not been loaded yet.' : ''}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxHeight: 560, overflowY: 'auto' }}>
        {results.map(f => (
          <button key={f.id} onClick={() => add(f)} title="Add to sealed collection"
            style={{ background: flash[f.id] ? '#12301c' : '#1a1a24', border: `1px solid ${flash[f.id] ? '#22c55e' : '#2a2a3a'}`, borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ddd', textAlign: 'center' }}>
            {f.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={f.image_url} alt={f.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
              : <div style={{ aspectRatio: '1/1', background: '#222' }} />}
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{f.name}</div>
            {f.set_name && <div style={{ fontSize: 10, color: '#888' }}>{f.set_name}</div>}
            <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700 }}>{flash[f.id] ? '✓ Added' : `+ ${money(f.price)}`}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
