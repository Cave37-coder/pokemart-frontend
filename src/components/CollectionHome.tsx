'use client';
// Collectr-style landing page for "My Collection" (Michael, 2026-11-04).
// Four tabs, each tracked SEPARATELY -- nothing is shared between them, so every figure is a true one:
//   Sets (set checklists) | PokeDex (Pokedex collection) | My Pokemon (single-species pages) | Collections (custom lists)
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { SET_INDEX, ERA_ORDER } from '@/lib/checklistData';
import { API_BASE, getProgress, ensureLivePrices, getLivePrice } from '@/lib/checklistShared';
import { SETS } from '@/lib/checklistData';
import SealedCollection from '@/components/SealedCollection';

type Tab = 'sets' | 'pokedex' | 'mypokemon' | 'collections' | 'sealed';
const TABS: { key: Tab; label: string }[] = [
  { key: 'sets', label: 'Sets' },
  { key: 'pokedex', label: 'PokeDex' },
  { key: 'mypokemon', label: 'My Pokémon' },
  { key: 'collections', label: 'Collections' },
  { key: 'sealed', label: 'Sealed' },
];
const money = (n: number) => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const card: React.CSSProperties = { background: '#14141c', border: '1px solid #262636', borderRadius: 12 };

type SetLogo = { logo_url: string; release_date?: string };
type Coll = { id: number; name: string; cards: number; value: number; paid: number; gain_loss: number };

export default function CollectionHome({ onOpen }: { onOpen: (code: string) => void }) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab: Tab = (TABS.find(t => t.key === sp.get('tab'))?.key) || 'sets';
  const setTab = (t: Tab) => router.replace(t === 'sets' ? '/checklists' : `/checklists?tab=${t}`);

  return (
    <div style={{ padding: '16px 20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 20px' }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 999, flexWrap: 'wrap', justifyContent: 'center' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 999, border: tab === t.key ? '1px solid #ff6b35' : '1px solid transparent',
                background: tab === t.key ? '#2a1a12' : 'transparent', color: tab === t.key ? '#ff6b35' : '#a0a0b0',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{t.label}</button>
          ))}
        </div>
      </div>
      {tab === 'sets' && <SetsTab onOpen={onOpen} />}
      {tab === 'pokedex' && <PokedexTab />}
      {tab === 'mypokemon' && <MyPokemonTab />}
      {tab === 'collections' && <CollectionsTab />}
      {tab === 'sealed' && <SealedCollection />}
    </div>
  );
}

// ── Money banner (top of every tab; each tab shows ITS OWN totals, never a mix) ──
type Totals = { cards: number; value: number; paid: number; gain_loss: number };
const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n));

export function Banner({ label, t, noPaid }: { label: string; t: Totals | null; noPaid?: boolean }) {
  const hasGain = !!t && (t.paid > 0 || t.gain_loss !== 0);
  const cell = (k: string, v: string, c = '#fff') => (
    <div style={{ flex: '1 1 150px', background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#888' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
    </div>
  );
  return (
    <div style={{ ...card, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {cell('Total invested', t && t.paid > 0 ? money(t.paid) : '—')}
        {cell('Current value', t ? money(t.value) : '…')}
        {cell('Gain / loss', hasGain && t ? signed(t.gain_loss) : '—', !hasGain || !t ? '#fff' : t.gain_loss >= 0 ? '#22c55e' : '#f87171')}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
        Invested = what you entered as price paid{noPaid ? ' (not tracked here yet)' : ''}. Gain/loss compares today’s price with what you paid, or with the price on the day you added the card.
      </div>
    </div>
  );
}

type Summary = Record<'pokedex' | 'mypokemon' | 'collections' | 'sealed', Totals>;
function useSummary(): Summary | null {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('access_token')) { const z = { cards: 0, value: 0, paid: 0, gain_loss: 0 }; setS({ pokedex: z, mypokemon: z, collections: z, sealed: z }); return; }
    authFetch('/api/collection-summary/').then(r => (r.ok ? r.json() : null)).then(setS).catch(() => setS(null));
  }, []);
  return s;
}

// Sets totals come from the static checklist data + live prices, same as the tiles.
function useSetsTotals(tick: number): Totals | null {
  const [rows, setRows] = useState<{ card_set: string; card_key: string; value_when_added: number | null; price_paid: number | null }[] | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('access_token')) { setRows([]); return; }
    authFetch('/api/checklists/portfolio/').then(r => (r.ok ? r.json() : [])).then(setRows).catch(() => setRows([]));
  }, []);
  return useMemo(() => {
    if (!rows) return null;
    let value = 0;
    SET_INDEX.forEach(s => { value += getProgress(s.code).collectionZar; });
    let paid = 0, gain = 0;
    rows.forEach(r => {
      const code = r.card_set === '30C-PIKA' ? '30C' : r.card_set;
      const set = SETS[code]; if (!set) return;
      const cards = r.card_set === '30C-PIKA'
        ? set.cards.filter(c => c.rarity === 'Pikachu Rare').map((c, i) => ({ ...c, num: `${String(i + 1).padStart(2, '0')}/30` }))
        : set.cards;
      for (const c of cards) {
        const v = c.variants.find(v => c.num + '_' + v.vc === r.card_key);
        if (!v) continue;
        const cur = getLivePrice(v.pid, v.vc, v.zar);
        if (r.price_paid != null) paid += r.price_paid;
        const base = r.price_paid ?? r.value_when_added;
        if (base != null) gain += cur - base;
        break;
      }
    });
    return { cards: 0, value, paid, gain_loss: gain };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tick]);
}

// ── Sets ────────────────────────────────────────────────────────────────
function SetsTab({ onOpen }: { onOpen: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const [era, setEra] = useState('all');
  const [logos, setLogos] = useState<Record<string, SetLogo>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/sets/`).then(r => r.json()).then(data => {
      const m: Record<string, SetLogo> = {};
      (data.results || data).forEach((s: { code: string; logo_url: string; release_date?: string }) => { m[s.code] = { logo_url: s.logo_url, release_date: s.release_date }; });
      setLogos(m);
    }).catch(() => {});
  }, []);

  // Live prices only for sets the customer actually has cards in (keeps this page light).
  useEffect(() => {
    const codes = SET_INDEX.filter(s => getProgress(s.code).owned > 0).map(s => s.code);
    if (codes.length) ensureLivePrices(codes).then(() => setTick(t => t + 1));
  }, []);

  const eras = useMemo(() => ERA_ORDER.filter(e => SET_INDEX.some(s => s.era === e)), []);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SET_INDEX
      .filter(s => (era === 'all' || s.era === era) && (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)))
      .map(s => ({ s, p: getProgress(s.code) }))
      .sort((a, b) => {
        const dA = logos[a.s.code]?.release_date, dB = logos[b.s.code]?.release_date;
        if (dA && dB) return dB.localeCompare(dA);
        if (dA) return -1; if (dB) return 1;
        return a.s.code.localeCompare(b.s.code);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, era, logos, tick]);

  const owned = SET_INDEX.reduce((t, s) => t + getProgress(s.code).owned, 0);
  const value = SET_INDEX.reduce((t, s) => t + getProgress(s.code).collectionZar, 0);
  const setsTotals = useSetsTotals(tick);

  return (
    <div key={tick}>
      <Banner label={`Sets — ${owned.toLocaleString()} cards ticked`} t={setsTotals} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by sets…"
          style={{ flex: '1 1 220px', padding: '10px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }} />
        <select value={era} onChange={e => setEra(e.target.value)}
          style={{ padding: '10px 12px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }}>
          <option value="all">All eras</option>
          {eras.map(e => <option key={e} value={e}>{e.replace('Special - ', 'Special: ')}</option>)}
        </select>
        <Link href="/checklists/portfolio" style={{ padding: '10px 14px', background: '#14241a', border: '1px solid #1f5a33', borderRadius: 10, color: '#7ee2a0', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
          📈 Value &amp; gain/loss
        </Link>
      </div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        Sets only: <b style={{ color: '#ddd' }}>{owned.toLocaleString()}</b> cards ticked · <b style={{ color: '#ddd' }}>{money(value)}</b> value. Pokédex, My Pokémon and Collections are counted separately.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {rows.map(({ s, p }) => {
          const logo = logos[s.code];
          return (
            <button key={s.code} onClick={() => onOpen(s.code)}
              style={{ ...card, padding: 0, cursor: 'pointer', textAlign: 'center', overflow: 'hidden', color: '#e0e0e0' }}>
              <div style={{ position: 'relative', height: 120, background: '#e9e9ee22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logo?.logo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logo.logo_url} alt={s.name} style={{ maxWidth: '88%', maxHeight: '86%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 18, fontWeight: 800, color: '#ff6b35' }}>{s.code}</span>}
                {logo?.release_date && (
                  <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, background: '#000a', color: '#ccc', borderRadius: 6, padding: '2px 6px' }}>
                    {new Date(logo.release_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <div style={{ position: 'absolute', left: 0, bottom: 0, height: 5, width: '100%', background: '#2a2a3a' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: '#ff6b35' }} />
                </div>
              </div>
              <div style={{ padding: '10px 8px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', minHeight: 34 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>Progress: {p.owned} / {p.total}</div>
                <div style={{ fontSize: 12, color: '#999' }}>Total value: {money(p.collectionZar)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PokeDex ─────────────────────────────────────────────────────────────
function PokedexTab() {
  const sum = useSummary();
  const [d, setD] = useState<{ species_collected?: number; collection_value?: number } | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('access_token')) { setD({}); return; }
    authFetch('/api/pokedex/my-collection/').then(r => (r.ok ? r.json() : {})).then(setD).catch(() => setD({}));
  }, []);
  return (<>
    <Banner label="PokeDex" t={sum?.pokedex ?? null} noPaid />
    <HubCard href="/pokedex" title="PokeDex" cta="Open my PokeDex"
      blurb="One card per Pokémon, across all 1025. Counted on its own — ticking cards in Sets or Collections never changes it.">
      {d && <Stats items={[['Pokémon collected', `${d.species_collected ?? 0} / 1025`]]} />}
    </HubCard>
  </>);
}

// ── My Pokémon ──────────────────────────────────────────────────────────
function MyPokemonTab() {
  const sum = useSummary();
  return (<>
    <Banner label="My Pokémon" t={sum?.mypokemon ?? null} noPaid />
    <HubCard href="/collections" title="My Pokémon" cta="Open My Pokémon"
      blurb="Pick a Pokémon and track every card of it start to finish, on its own page. Separate from your PokeDex, Sets and Collections." />
  </>);
}

function HubCard({ href, title, blurb, cta, children }: { href: string; title: string; blurb: string; cta: string; children?: React.ReactNode }) {
  return (
    <div style={{ ...card, maxWidth: 640, margin: '10px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>{blurb}</div>
      {children}
      <Link href={href} style={{ display: 'inline-block', marginTop: 16, background: '#ff6b35', color: '#fff', padding: '10px 22px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>{cta} →</Link>
    </div>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 10, padding: '10px 16px', minWidth: 140 }}>
          <div style={{ fontSize: 11, color: '#888' }}>{k}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Custom collections ──────────────────────────────────────────────────
function CollectionsTab() {
  const router = useRouter();
  const [list, setList] = useState<Coll[] | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  const sum = useSummary();

  useEffect(() => {
    if (!loggedIn) { setList([]); return; }
    authFetch('/api/custom-collections/').then(r => (r.ok ? r.json() : [])).then(setList).catch(() => setList([]));
  }, [loggedIn]);

  const create = async () => {
    if (!loggedIn) { router.push('/auth/login'); return; }
    if (!name.trim()) return;
    setErr('');
    const r = await authFetch('/api/custom-collections/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Could not create'); return; }
    router.push(`/checklists/collection?id=${j.id}`);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Banner label="All your custom collections" t={sum?.collections ?? null} />
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
          Make your own collection — a binder, a trade pile, a favourite-art list — with any cards you like. Counted on its own, separate from Sets, PokeDex and My Pokémon.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} maxLength={60} placeholder="Name your new collection…"
            style={{ flex: '1 1 220px', padding: '10px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 10, color: '#fff', fontSize: 14 }} />
          <button onClick={create} style={{ background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>+ Create</button>
        </div>
        {err && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{err}</div>}
      </div>
      {!list ? <div style={{ color: '#666', textAlign: 'center' }}>Loading…</div>
        : list.length === 0 ? <div style={{ color: '#777', textAlign: 'center', padding: 30 }}>{loggedIn ? 'No collections yet — create your first one above.' : 'Log in to create collections.'}</div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {list.map(c => (
              <Link key={c.id} href={`/checklists/collection?id=${c.id}`} style={{ ...card, padding: 16, textDecoration: 'none', color: '#e0e0e0' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{c.cards} card{c.cards === 1 ? '' : 's'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>Value: {money(c.value)}</div>
                {c.paid > 0 && <div style={{ fontSize: 12, color: '#999' }}>Paid: {money(c.paid)}</div>}
                {(c.paid > 0 || c.gain_loss !== 0) && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.gain_loss >= 0 ? '#22c55e' : '#f87171' }}>
                    {c.gain_loss >= 0 ? '+' : '−'}{money(Math.abs(c.gain_loss))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
