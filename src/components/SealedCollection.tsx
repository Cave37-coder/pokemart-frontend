'use client';
// Sealed Collection (ETBs, booster boxes, tins...). Michael, 2026-11-04. Tracked on its own, separate from cards.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { Banner } from '@/components/CollectionHome';

type Item = { id: number; accessory_id: number; name: string; image_url: string; quantity: number; price: number; value_when_added: number | null; price_paid: number | null };
type Data = { count: number; value: number; paid: number; gain_loss: number; items: Item[] };
type Found = { id: number; name: string; image_url: string; price: number };

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
        <div style={{ fontSize: 13, color: '#999' }}>Booster boxes, ETBs, tins and other sealed product. Counted on its own, separate from your cards.</div>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 6, minHeight: 32 }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: '#ccc', margin: '4px 0' }}>{money(it.price)}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <button onClick={() => setQty(it, it.quantity - 1)} style={qtyBtn} title={it.quantity === 1 ? 'Remove' : 'Less'}>{it.quantity === 1 ? '🗑' : '−'}</button>
                    <span style={{ fontSize: 13, minWidth: 18, color: '#ddd' }}>{it.quantity}</span>
                    <button onClick={() => setQty(it, it.quantity + 1)} style={qtyBtn}>+</button>
                  </div>
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
  const [results, setResults] = useState<Found[]>([]);
  const [flash, setFlash] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      authFetch(`/api/sealed-collection/search/?q=${encodeURIComponent(q.trim())}`)
        .then(r => (r.ok ? r.json() : [])).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = async (f: Found) => {
    const r = await authFetch('/api/sealed-collection/items/', { method: 'POST', headers: hdr, body: JSON.stringify({ accessory_id: f.id, quantity: 1 }) });
    if (r.ok) {
      setFlash(x => ({ ...x, [f.id]: true }));
      setTimeout(() => setFlash(x => ({ ...x, [f.id]: false })), 1200);
      onAdded();
    }
  };

  return (
    <div style={{ ...box, padding: 14, marginBottom: 16 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sealed product (e.g. Ascended Heroes Elite Trainer Box)…"
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14, marginBottom: 10 }} />
      {results.length === 0 && <div style={{ color: '#777', fontSize: 12 }}>No sealed product found.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxHeight: 460, overflowY: 'auto' }}>
        {results.map(f => (
          <button key={f.id} onClick={() => add(f)}
            style={{ background: flash[f.id] ? '#12301c' : '#1a1a24', border: `1px solid ${flash[f.id] ? '#22c55e' : '#2a2a3a'}`, borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ddd', textAlign: 'center' }}>
            {f.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={f.image_url} alt={f.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
              : <div style={{ aspectRatio: '1/1', background: '#222' }} />}
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700 }}>{flash[f.id] ? '✓ Added' : `+ ${money(f.price)}`}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
