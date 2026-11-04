'use client';
// My Collection Value -- every set the customer has ticked cards in, what they paid, and
// how current value compares. Michael, 2026-11-04.
//  * Price paid = what the customer typed on the card ("+ Paid"); optional.
//  * Start value = the site price at the moment the card was ticked.
//  * Current = today's live site price (same source as Browse Cards).
//  * Gain/loss per card = current - (price paid if entered, else start value).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { ensureChecklistData, ensureLivePrices, getLivePrice } from '@/lib/checklistShared';
import { SETS } from '@/lib/checklistData';
import type { Variant } from '@/lib/checklistData';

type Row = { card_set: string; card_key: string; value_when_added: number | null; price_paid: number | null };
type Agg = {
  storage: string; code: string; sub: boolean; name: string;
  cards: number; paid: number; paidCards: number; start: number; startCards: number;
  current: number; delta: number; deltaCards: number; missingStart: Row[];
};

const PIKA = '30C-PIKA';
const money = (n: number) => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n));
const col = (n: number) => (n > 0 ? '#22c55e' : n < 0 ? '#f87171' : '#aaa');

function resolve(storage: string, key: string): { v: Variant | null; code: string } {
  const code = storage === PIKA ? '30C' : storage;
  const set = SETS[code];
  if (!set) return { v: null, code };
  const cards = storage === PIKA
    ? set.cards.filter(c => c.rarity === 'Pikachu Rare').map((c, i) => ({ ...c, num: `${String(i + 1).padStart(2, '0')}/30` }))
    : set.cards;
  for (const c of cards) {
    for (const v of c.variants) if (c.num + '_' + v.vc === key) return { v, code };
  }
  return { v: null, code };
}

export default function PortfolioPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { router.push('/auth/login'); return; }
    authFetch('/api/checklists/portfolio/').then(r => (r.ok ? r.json() : [])).then(setRows).catch(() => setRows([]));
  }, [router]);

  useEffect(() => {
    if (!rows) return;
    const codes = Array.from(new Set(rows.map(r => (r.card_set === PIKA ? '30C' : r.card_set))));
    ensureChecklistData().then(() => ensureLivePrices(codes)).then(() => setReady(true));
  }, [rows]);

  const aggs = useMemo<Agg[]>(() => {
    if (!rows || !ready) return [];
    const by: Record<string, Agg> = {};
    rows.forEach(r => {
      const { v, code } = resolve(r.card_set, r.card_key);
      if (!v) return;
      const a = (by[r.card_set] ||= {
        storage: r.card_set, code, sub: r.card_set === PIKA,
        name: (SETS[code]?.name || code) + (r.card_set === PIKA ? ' — Chase Pikachu' : ''),
        cards: 0, paid: 0, paidCards: 0, start: 0, startCards: 0, current: 0, delta: 0, deltaCards: 0, missingStart: [],
      });
      const cur = getLivePrice(v.pid, v.vc, v.zar);
      a.cards++; a.current += cur;
      if (r.price_paid != null) { a.paid += r.price_paid; a.paidCards++; }
      if (r.value_when_added != null) { a.start += r.value_when_added; a.startCards++; }
      else a.missingStart.push(r);
      const base = r.price_paid ?? r.value_when_added;
      if (base != null) { a.delta += cur - base; a.deltaCards++; }
    });
    return Object.values(by).sort((x, y) => y.current - x.current);
  }, [rows, ready]);

  const tot = aggs.reduce((t, a) => ({
    cards: t.cards + a.cards, paid: t.paid + a.paid, start: t.start + a.start,
    current: t.current + a.current, delta: t.delta + a.delta, deltaCards: t.deltaCards + a.deltaCards,
    missing: t.missing + a.missingStart.length,
  }), { cards: 0, paid: 0, start: 0, current: 0, delta: 0, deltaCards: 0, missing: 0 });

  // Cards ticked before value tracking existed have no start value -- let the customer stamp today's price on them.
  const stampToday = async () => {
    if (!rows) return;
    setBusy(true);
    const updates: Row[] = [];
    for (const r of rows) {
      if (r.value_when_added != null) continue;
      const { v } = resolve(r.card_set, r.card_key);
      if (!v) continue;
      const cur = getLivePrice(v.pid, v.vc, v.zar);
      if (cur <= 0) continue;
      updates.push({ ...r, value_when_added: cur });
    }
    await Promise.all(updates.map(u => authFetch('/api/checklists/entry-meta/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_set: u.card_set, card_key: u.card_key, value_when_added: u.value_when_added }),
    }).catch(() => null)));
    setRows(prev => (prev || []).map(r => updates.find(u => u.card_set === r.card_set && u.card_key === r.card_key) || r));
    setBusy(false);
  };

  const th: React.CSSProperties = { textAlign: 'right', padding: '8px 10px', color: '#888', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { textAlign: 'right', padding: '10px', fontSize: 14, whiteSpace: 'nowrap' };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px', color: '#eee' }}>
      <Link href="/checklists" style={{ color: '#ff6b35', fontSize: 13, textDecoration: 'none' }}>← My Collection</Link>
      <h1 style={{ fontSize: 26, margin: '8px 0 4px' }}>My Collection Value</h1>
      <p style={{ color: '#999', fontSize: 13, marginTop: 0 }}>
        Tap <b>+ Paid</b> on any card you&apos;ve ticked to record what you paid. Gain/loss compares today&apos;s price with what you paid, or with the price on the day you ticked it if you didn&apos;t enter one.
      </p>

      {!rows || !ready ? (
        <p style={{ color: '#888' }}>Loading…</p>
      ) : aggs.length === 0 ? (
        <p style={{ color: '#888' }}>No cards ticked yet. Open a set and tick the cards you own.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
            {[
              ['Cards owned', String(tot.cards), '#eee'],
              ['Price paid', tot.paid > 0 ? money(tot.paid) : '—', '#eee'],
              ['Current value', money(tot.current), '#eee'],
              ['Gain / loss', tot.deltaCards ? signed(tot.delta) : '—', col(tot.delta)],
            ].map(([k, v, c]) => (
              <div key={k} style={{ flex: '1 1 150px', background: '#14141c', border: '1px solid #262636', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#888' }}>{k}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {tot.missing > 0 && (
            <div style={{ background: '#1c1a10', border: '1px solid #4a4220', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#e8d48a', marginBottom: 12 }}>
              {tot.missing} card{tot.missing === 1 ? '' : 's'} ticked before tracking began have no starting value.{' '}
              <button onClick={stampToday} disabled={busy}
                style={{ marginLeft: 6, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                {busy ? 'Saving…' : "Use today's price as their starting value"}
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto', background: '#14141c', border: '1px solid #262636', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262636' }}>
                  <th style={{ ...th, textAlign: 'left' }}>Set</th>
                  <th style={th}>Cards</th>
                  <th style={th}>Price paid</th>
                  <th style={th}>Start value</th>
                  <th style={th}>Current value</th>
                  <th style={th}>Gain / loss</th>
                </tr>
              </thead>
              <tbody>
                {aggs.map(a => (
                  <tr key={a.storage} style={{ borderBottom: '1px solid #1e1e2a' }}>
                    <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>
                      <Link href={`/checklists?set=${a.code}${a.sub ? '&sub=pikachu' : ''}`} style={{ color: '#ff6b35', textDecoration: 'none', fontWeight: 600 }}>{a.name}</Link>
                    </td>
                    <td style={td}>{a.cards}</td>
                    <td style={td} title={a.paidCards ? `${a.paidCards} of ${a.cards} cards have a price paid` : ''}>
                      {a.paidCards ? money(a.paid) : '—'}{a.paidCards > 0 && a.paidCards < a.cards ? '*' : ''}
                    </td>
                    <td style={td}>{a.startCards ? money(a.start) : '—'}</td>
                    <td style={td}>{money(a.current)}</td>
                    <td style={{ ...td, fontWeight: 700, color: col(a.delta) }}>{a.deltaCards ? signed(a.delta) : '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#191924', fontWeight: 700 }}>
                  <td style={{ ...td, textAlign: 'left' }}>Total</td>
                  <td style={td}>{tot.cards}</td>
                  <td style={td}>{tot.paid > 0 ? money(tot.paid) : '—'}</td>
                  <td style={td}>{tot.start > 0 ? money(tot.start) : '—'}</td>
                  <td style={td}>{money(tot.current)}</td>
                  <td style={{ ...td, color: col(tot.delta) }}>{tot.deltaCards ? signed(tot.delta) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: '#777', fontSize: 11, marginTop: 8 }}>
            * only some cards in this set have a price paid. Prices are PokéBulk site prices in rand, updated daily from the TCG market.
          </p>
        </>
      )}
    </div>
  );
}
