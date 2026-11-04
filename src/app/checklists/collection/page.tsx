'use client';
// One custom collection: its cards (qty, price paid, gain/loss) + an "Add cards" panel
// (simple search, or pick a set and see every card in it). Michael, 2026-11-04.
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { API_BASE } from '@/lib/checklistShared';

type Item = {
  id: number; product_id: number; name: string; number: string; variant: string; set_code: string; set_name: string;
  image_url: string; quantity: number; price: number; value_when_added: number | null; price_paid: number | null;
};
type Detail = { id: number; name: string; cards: number; value: number; paid: number; gain_loss: number; items: Item[] };
type Prod = {
  id: number; name: string; number: string; variant_override: string; price: string | number;
  image_small_url?: string; image_url?: string; card_set?: { code: string; name: string } | null;
};
type SetOpt = { code: string; name: string; release_date?: string };

const money = (n: number) => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const box: React.CSSProperties = { background: '#14141c', border: '1px solid #262636', borderRadius: 12 };
const VLABEL: Record<string, string> = { N: 'Normal', H: 'Holo', RH: 'Reverse Holo', CH: 'Cosmos Holo', PB: 'Poké Ball', MB: 'Master Ball', DB: 'Dusk Ball', LB: 'Love Ball', FB: 'Friend Ball', QB: 'Quick Ball', TR: 'Team Rocket' };

function CollectionInner() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [d, setD] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    authFetch(`/api/custom-collections/${id}/`).then(async r => {
      if (r.status === 404) { setMissing(true); return; }
      if (r.ok) setD(await r.json());
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { router.push('/auth/login'); return; }
    load();
  }, [router, load]);

  const jsonHdr = { 'Content-Type': 'application/json' };
  const rename = async () => {
    const n = window.prompt('Rename collection:', d?.name || '');
    if (!n || !n.trim()) return;
    await authFetch(`/api/custom-collections/${id}/`, { method: 'PATCH', headers: jsonHdr, body: JSON.stringify({ name: n }) });
    load();
  };
  const del = async () => {
    if (!window.confirm(`Delete "${d?.name}" and everything in it?`)) return;
    await authFetch(`/api/custom-collections/${id}/`, { method: 'DELETE' });
    router.push('/checklists?tab=collections');
  };
  const setQty = async (it: Item, q: number) => {
    await authFetch(`/api/custom-collections/${id}/items/${it.id}/`, { method: 'PATCH', headers: jsonHdr, body: JSON.stringify({ quantity: q }) });
    load();
  };
  const setPaid = async (it: Item) => {
    const input = window.prompt('Price you paid per card (R). Leave blank to clear:', it.price_paid != null ? String(it.price_paid) : '');
    if (input === null) return;
    const clean = input.replace(/[^0-9.,]/g, '').replace(',', '.');
    await authFetch(`/api/custom-collections/${id}/items/${it.id}/`, { method: 'PATCH', headers: jsonHdr, body: JSON.stringify({ price_paid: clean === '' ? null : parseFloat(clean) }) });
    load();
  };

  if (!id || missing) return <div style={{ padding: 40, color: '#999' }}>Collection not found. <Link href="/checklists?tab=collections" style={{ color: '#ff6b35' }}>Back</Link></div>;
  if (!d) return <div style={{ padding: 40, color: '#666' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 60px', color: '#e0e0e0' }}>
      <Link href="/checklists?tab=collections" style={{ color: '#ff6b35', fontSize: 13, textDecoration: 'none' }}>← Collections</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '8px 0 14px' }}>
        <h1 style={{ fontSize: 24, margin: 0, color: '#fff', flex: '1 1 auto' }}>{d.name}</h1>
        <button onClick={() => setAdding(a => !a)} style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>{adding ? 'Done adding' : '+ Add cards'}</button>
        <button onClick={rename} style={{ background: '#1e1e2a', color: '#ccc', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Rename</button>
        <button onClick={del} style={{ background: '#1e1e2a', color: '#f87171', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Delete</button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {([['Cards', String(d.cards), '#fff'], ['Price paid', d.paid > 0 ? money(d.paid) : '—', '#fff'], ['Current value', money(d.value), '#fff'],
          ['Gain / loss', d.paid > 0 || d.gain_loss !== 0 ? (d.gain_loss >= 0 ? '+' : '−') + money(Math.abs(d.gain_loss)) : '—', d.gain_loss >= 0 ? '#22c55e' : '#f87171']] as [string, string, string][]).map(([k, v, c]) => (
          <div key={k} style={{ ...box, flex: '1 1 140px', padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#888' }}>{k}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {adding && <AddCards collectionId={d.id} onAdded={load} />}

      {d.items.length === 0 ? (
        <div style={{ color: '#777', textAlign: 'center', padding: 30 }}>Nothing here yet — tap “+ Add cards”.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {d.items.map(it => {
            const base = it.price_paid ?? it.value_when_added;
            const delta = base != null ? (it.price - base) * it.quantity : null;
            return (
              <div key={it.id} style={{ ...box, padding: 8, textAlign: 'center' }}>
                {it.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={it.image_url} alt={it.name} style={{ width: '100%', borderRadius: 6, aspectRatio: '5/7', objectFit: 'contain' }} />
                  : <div style={{ aspectRatio: '5/7', background: '#1e1e2a', borderRadius: 6 }} />}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 6 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{it.set_name} · {it.number} · {VLABEL[it.variant] || it.variant}</div>
                <div style={{ fontSize: 12, color: '#ccc', margin: '4px 0' }}>{money(it.price)}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <button onClick={() => setQty(it, it.quantity - 1)} style={qtyBtn} title={it.quantity === 1 ? 'Remove' : 'Less'}>{it.quantity === 1 ? '🗑' : '−'}</button>
                  <span style={{ fontSize: 13, minWidth: 18 }}>{it.quantity}</span>
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

const qtyBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 6, border: '1px solid #2a2a3a', background: '#1e1e2a', color: '#fff', cursor: 'pointer', lineHeight: 1 };

function AddCards({ collectionId, onAdded }: { collectionId: number; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [setCode, setSetCode] = useState('');
  const [sets, setSets] = useState<SetOpt[]>([]);
  const [results, setResults] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/sets/`).then(r => r.json()).then(data => {
      const list: SetOpt[] = (data.results || data).slice();
      list.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
      setSets(list);
    }).catch(() => {});
  }, []);

  // Search (typing) or browse a whole set (picking one). Picking a set clears the search text and vice versa.
  useEffect(() => {
    const term = q.trim();
    if (!setCode && term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = setCode
          ? `${API_BASE}/api/products/?card_set=${encodeURIComponent(setCode)}&page_size=400&ordering=card_number`
          : `${API_BASE}/api/products/?search=${encodeURIComponent(term)}&page_size=40`;
        const data = await (await fetch(url)).json();
        setResults(data.results || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, setCode]);

  const add = async (p: Prod) => {
    const r = await authFetch(`/api/custom-collections/${collectionId}/items/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: p.id, quantity: 1 }),
    });
    if (r.ok) {
      setFlash(f => ({ ...f, [p.id]: true }));
      setTimeout(() => setFlash(f => ({ ...f, [p.id]: false })), 1200);
      onAdded();
    }
  };

  return (
    <div style={{ ...box, padding: 14, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input value={q} onChange={e => { setQ(e.target.value); if (e.target.value) setSetCode(''); }} placeholder="Search cards (e.g. Charizard, Pikachu 25)…"
          style={{ flex: '1 1 240px', padding: '10px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }} />
        <select value={setCode} onChange={e => { setSetCode(e.target.value); setQ(''); }}
          style={{ flex: '1 1 220px', padding: '10px 12px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }}>
          <option value="">…or browse a whole set</option>
          {sets.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
        </select>
      </div>
      {loading && <div style={{ color: '#777', fontSize: 12 }}>Searching…</div>}
      {!loading && results.length === 0 && (q.trim().length >= 2 || setCode) && <div style={{ color: '#777', fontSize: 12 }}>No cards found.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
        {results.map(p => (
          <button key={p.id} onClick={() => add(p)} title="Add to collection"
            style={{ background: flash[p.id] ? '#12301c' : '#1a1a24', border: `1px solid ${flash[p.id] ? '#22c55e' : '#2a2a3a'}`, borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ddd', textAlign: 'center' }}>
            {(p.image_small_url || p.image_url)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.image_small_url || p.image_url} alt={p.name} style={{ width: '100%', aspectRatio: '5/7', objectFit: 'contain', borderRadius: 4 }} />
              : <div style={{ aspectRatio: '5/7', background: '#222' }} />}
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{p.name}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{p.card_set?.code} · {p.number} · {VLABEL[p.variant_override] || p.variant_override || 'Normal'}</div>
            <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700 }}>{flash[p.id] ? '✓ Added' : `+ ${money(Number(p.price) || 0)}`}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CollectionPage() {
  return <Suspense fallback={<div style={{ padding: 40, color: '#666' }}>Loading…</div>}><CollectionInner /></Suspense>;
}
