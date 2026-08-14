'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, SessionExpiredError } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pokemart-api-production.up.railway.app';

import {
  SETS, SET_INDEX, ERA_COLORS, TIER_COLORS, TIER_LABELS_FE, ERA_ORDER, RSYM,
} from '@/lib/checklistData';
import type { Variant, Card, SetData, SetMeta } from '@/lib/checklistData';

// Michael, 2026-08-08: the Era table (products/models.py) has legacy
// duplicate rows per era and inconsistent naming -- some end in "Era"
// ("Sword & Shield Era"), some don't ("HG&SS"), and this page's own labels
// don't consistently match either convention. Normalizing both sides before
// comparing (trim, lowercase, drop a trailing " era") means a saved logo_url
// shows up regardless of which of the duplicate rows or naming style it was
// set on, instead of requiring a byte-for-byte string match.
function normalizeEraName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+era$/, '').replace(/\s+/g, ' ');
}

// Checklist progress now lives in the customer's account (ChecklistEntry
// rows on the backend), not the browser -- localStorage['pb_cl_'+code] used
// to be the only copy, which meant it vanished the moment a customer's
// login token went stale or they opened the site on a different device.
//
// checklistCache is a simple in-memory mirror of the account's checked
// cards, fetched once per page load via ensureChecklistData() and kept in
// sync as the customer ticks boxes. loadChecks/saveChecks keep their old
// names and signatures so the rest of this file (Overview's getProgress,
// Checklist's initial state, the toggle handler) didn't need to change.
let checklistCache: Record<string, Record<string, boolean>> = {};
let checklistCacheReady = false;

function loadChecks(code: string): Record<string, boolean> {
  return checklistCache[code] || {};
}
function saveChecks(code: string, checks: Record<string, boolean>) {
  checklistCache[code] = checks;
}

// One-time upload of any pre-existing localStorage checklist data into the
// account, so nobody's progress from before this change appears to vanish.
// Safe to call more than once -- the backend ignores duplicates, and this
// only ever runs once per browser thanks to the 'pb_cl_migrated' flag.
async function migrateLocalChecklistData(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('pb_cl_migrated')) return;
  const entries: { card_set: string; card_key: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('pb_cl_') || k === 'pb_cl_migrated') continue;
    try {
      const local = JSON.parse(localStorage.getItem(k) || '{}');
      const code = k.slice('pb_cl_'.length);
      Object.keys(local).forEach(key => { if (local[key]) entries.push({ card_set: code, card_key: key }); });
    } catch {}
  }
  try {
    if (entries.length > 0) {
      await authFetch('/api/checklists/import/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
    }
    localStorage.setItem('pb_cl_migrated', '1');
  } catch {
    // Session wasn't valid enough to migrate right now -- try again next visit.
  }
}

// Fetches every checked card for the logged-in customer, once per page load.
// Guests (no access_token) just get an empty checklist -- toggling prompts
// them to log in, same pattern as My Pile.
async function ensureChecklistData(): Promise<void> {
  if (checklistCacheReady) return;
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) { checklistCacheReady = true; return; }

  await migrateLocalChecklistData();

  try {
    const res = await authFetch('/api/checklists/entries/');
    const data: Record<string, string[]> = await res.json();
    const grouped: Record<string, Record<string, boolean>> = {};
    Object.keys(data).forEach(code => {
      grouped[code] = {};
      data[code].forEach(key => { grouped[code][key] = true; });
    });
    checklistCache = grouped;
  } catch {
    checklistCache = {};
  }
  checklistCacheReady = true;
}
function getProgress(code: string) {
  const set = SETS[code]; if (!set) return { owned: 0, total: 0, pct: 0, collectionZar: 0 };
  const checks = loadChecks(code);
  let owned = 0, total = 0, collectionZar = 0;
  set.cards.forEach(c => c.variants.forEach(v => {
    total++;
    if (checks[c.num + '_' + v.vc]) { owned++; collectionZar += v.zar; }
  }));
  return { owned, total, pct: total ? Math.round(owned / total * 100) : 0, collectionZar };
}

function fmt(zar: number) { return 'R ' + zar.toFixed(2); }

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ onOpen }: { onOpen: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const [eraFilter, setEraFilter] = useState('');
  // Collapsible era sections -- closed by default so the landing page reads
  // like pkmn.gg's sidebar (pick a category, see just that category) rather
  // than a single scroll past 149 set tiles. A search or era-filter always
  // forces matching sections open regardless of this state, so results are
  // never hidden behind a collapsed header.
  const [expandedEras, setExpandedEras] = useState<Set<string>>(new Set());
  const toggleEra = (era: string) => setExpandedEras(prev => {
    const next = new Set(prev);
    if (next.has(era)) next.delete(era); else next.add(era);
    return next;
  });
  const [, forceUpdate] = useState(0);
  const [logos, setLogos] = useState<Record<string, { logo_url: string; symbol_url: string; release_date?: string }>>({});

  // Michael, 2026-08-08: "replace the simple Era labels with the actual Era
  // Logo" -- keyed by era NAME (not code) since that's what ERA_ORDER/the
  // static SETS data already use as the era key everywhere in this file.
  // Blank/missing logo_url (Michael hasn't pasted one in for that era yet)
  // just falls back to the existing coloured text pill, so this is safe to
  // ship before every era has a logo filled in via admin.
  const [eraLogos, setEraLogos] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch(`${API_BASE}/api/eras/`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        // Michael, 2026-08-08: the Era table has legacy duplicate rows per
        // era (multiple codes, same conceptual era) and inconsistent naming
        // -- some end in "Era", some don't ("Sword & Shield Era" vs this
        // page's own "Sword & Shield" label). An exact-string match silently
        // failed for most of them even with a valid logo_url saved, so this
        // normalizes both sides (trim, lowercase, drop a trailing " Era")
        // before comparing instead of requiring a byte-for-byte match.
        (data.results || []).forEach((e: { name: string; logo_url: string }) => {
          if (e.logo_url) map[normalizeEraName(e.name)] = e.logo_url;
        });
        setEraLogos(map);
      })
      .catch(() => {});
  }, []);

  // Wall of Honour -- site-wide feed of completion events (Checklist Phase 1).
  // Public endpoint, no set filter -- last 100 events, we only show the most
  // recent handful as a compact widget on the landing page.
  const [wallEvents, setWallEvents] = useState<{ display_name: string; avatar: string | null; set_code: string; set_name: string; logo_url: string; tier: string; tier_label: string; completed_at: string }[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/checklists/wall-of-honour/`)
      .then(r => r.json())
      .then(data => setWallEvents((data.events || []).slice(0, 8)))
      .catch(() => setWallEvents([]));
  }, []);

  // This customer's own highest-completed tier per set (Michael, 2026-08-01:
  // "highlight on Checklist page the same way if customer completes the
  // set") -- one bulk call, {code: tier}, reusing the same SetCompletionEvent
  // data the Wall of Honour already trusts rather than re-deriving tier
  // completion from the giant SETS blob client-side.
  const [myCompletions, setMyCompletions] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === 'undefined' || !localStorage.getItem('access_token')) return;
    authFetch('/api/checklists/my-completions/')
      .then(r => (r.ok ? r.json() : {}))
      .then(data => setMyCompletions(data || {}))
      .catch(() => setMyCompletions({}));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/sets/`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, { logo_url: string; symbol_url: string; release_date?: string }> = {};
        (data.results || data).forEach((s: { code: string; logo_url: string; symbol_url: string; release_date?: string }) => {
          map[s.code] = { logo_url: s.logo_url, symbol_url: s.symbol_url, release_date: s.release_date };
        });
        setLogos(map);
      })
      .catch(() => {});
  }, []);
  useEffect(() => { forceUpdate(n => n + 1); }, []);

  const filtered = SET_INDEX.filter(s => {
    if (eraFilter && s.era !== eraFilter) return false;
    if (query && !s.name.toLowerCase().includes(query.toLowerCase()) && !s.code.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const byEra: Record<string, SetMeta[]> = {};
  filtered.forEach(s => { if (!byEra[s.era]) byEra[s.era] = []; byEra[s.era].push(s); });

  // "Special - X" eras (Trick or Trade, Prize Pack, and any future one-off
  // product line like McDonald's/Rumble/POP) don't belong to any single
  // generation, so instead of each getting its own top-level section next
  // to real eras like "Sword & Shield", they're gathered under one shared
  // "Special Sets" shelf at the bottom -- still sub-labeled by product line
  // so they stay distinguishable. Genuine era-tied side products (Trainer
  // Gallery, Galarian Gallery, Champion's Path, etc.) are NOT part of this
  // -- those keep living as siblings inside their real era section, per
  // Michael's call on 2026-07-30.
  const MAIN_ERAS = ERA_ORDER.filter(e => !e.startsWith('Special - '));
  const SPECIAL_ERAS = ERA_ORDER.filter(e => e.startsWith('Special - '));

  const renderGrid = (sets: SetMeta[], color: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: '7px' }}>
      {sets.slice().sort((a,b) => {
        const dA = logos[a.code]?.release_date;
        const dB = logos[b.code]?.release_date;
        if (dA && dB) return dB.localeCompare(dA);
        if (dA) return -1;
        if (dB) return 1;
        return a.code.localeCompare(b.code);
      }).map(s => {
        const prog = getProgress(s.code);
        const logoCode = s.code;
        // Michael, 2026-08-01: "highlight on Checklist page the same way if
        // customer completes the set" -- same tier colours as Wall of
        // Honour, so a glance at the grid shows exactly which sets (and
        // which tier) you've already conquered, not just which ones you've
        // merely started.
        const completedTier = myCompletions[s.code];
        const tierColor = completedTier ? (TIER_COLORS[completedTier] || color) : null;
        const tileColor = tierColor || color;
        return (
          <div key={s.code} onClick={() => onOpen(s.code)}
            style={{
              background: '#1e1e2a',
              border: `${tierColor ? 2 : 1}px solid ${tierColor || (prog.owned > 0 ? color : '#2a2a3a')}`,
              boxShadow: tierColor ? `0 0 0 1px ${tierColor}40` : undefined,
              borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}>
            {logos[logoCode]?.logo_url && (
              <img src={logos[logoCode].logo_url} alt="" style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', height: '52px', opacity: 0.12, pointerEvents: 'none', maxWidth: '110px', objectFit: 'contain' }} />
            )}
            {tierColor && (
              <div title={`${TIER_LABELS_FE[completedTier] || completedTier} complete`} style={{
                position: 'absolute', top: '8px', right: '8px', fontSize: '13px', lineHeight: 1,
              }}>🏆</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              {logos[logoCode]?.symbol_url && (
                <img src={logos[logoCode].symbol_url} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain', opacity: 0.8 }} />
              )}
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: prog.owned > 0 ? tileColor : '#555' }}>{s.code}</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e0e0e0', lineHeight: 1.3, marginBottom: '4px' }}>{s.name}</div>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '3px' }}>{s.cards} cards · {fmt(s.set_zar)} full set</div>
            {tierColor && (
              <div style={{
                display: 'inline-block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.03em', color: tierColor, background: `${tierColor}20`,
                padding: '1px 6px', borderRadius: '4px', marginBottom: '3px',
              }}>{TIER_LABELS_FE[completedTier] || completedTier} complete</div>
            )}
            {prog.owned > 0 && (
              <>
                <div style={{ height: '3px', background: '#12121a', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${prog.pct}%`, background: color, borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '3px' }}>
                  <span>{prog.pct}% complete</span>
                  <span style={{ color: '#ff6b35' }}>{fmt(prog.collectionZar)}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const hasSpecial = SPECIAL_ERAS.some(e => byEra[e]?.length);
  // A search or explicit era-filter always wins over the manual
  // collapsed/expanded state -- otherwise typing into the search box could
  // "find" a set whose section is still visually collapsed.
  const isOpen = (era: string) => !!query || !!eraFilter || expandedEras.has(era);

  // Renders the era's actual logo when one's been set via admin, otherwise
  // falls back to the original coloured text pill -- same visual slot
  // either way so nothing else about the layout needs to change per-era.
  const eraBadge = (label: string, color: string) => {
    const logoUrl = eraLogos[normalizeEraName(label)];
    if (logoUrl) {
      return <img src={logoUrl} alt={label} title={label} style={{ height: '20px', maxWidth: '120px', objectFit: 'contain' }} />;
    }
    return (
      <div style={{ background: color, color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px' }}>{label}</div>
    );
  };

  const sectionHeader = (label: string, color: string, count: number, era: string, style: Record<string, string | number> = {}) => (
    <div onClick={() => toggleEra(era)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', marginBottom: isOpen(era) ? '8px' : '0px', ...style }}>
      {eraBadge(label, color)}
      <span style={{ fontSize: '11px', color: '#555' }}>{count} set{count === 1 ? '' : 's'}</span>
      <span style={{ fontSize: '10px', color: '#555', transform: isOpen(era) ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sets..."
          style={{ flex: 1, minWidth: '180px', padding: '8px 12px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
        <select value={eraFilter} onChange={e => setEraFilter(e.target.value)}
          style={{ padding: '8px 10px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#a0a0b0', fontSize: '13px' }}>
          <option value="">All eras</option>
          {ERA_ORDER.filter(e => byEra[e]).map(e => (
            <option key={e} value={e}>{e.startsWith('Special - ') ? 'Special Sets: ' + e.replace('Special - ', '') : e}</option>
          ))}
        </select>
        <span style={{ fontSize: '12px', color: '#555' }}>{filtered.length} sets</span>
      </div>

      {/* Era menu (left) + Wall of Honour (right) side by side on wide
          screens -- wraps to stacked on narrow ones via flexWrap. Only the
          clickable headers live here; the actual set-tile grids render
          full-width further down once an era is expanded, since a grid of
          set tiles crammed into a narrow sidebar column would be useless. */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: '0 0 260px', minWidth: '240px' }}>
          {MAIN_ERAS.map(era => {
            const sets = byEra[era]; if (!sets?.length) return null;
            const color = ERA_COLORS[era] || '#555';
            return <div key={era} style={{ marginBottom: '8px' }}>{sectionHeader(era, color, sets.length, era)}</div>;
          })}
          {hasSpecial && (
            <div style={{ marginBottom: '8px' }}>
              {sectionHeader('Special Sets', '#37474F', SPECIAL_ERAS.reduce((n, e) => n + (byEra[e]?.length || 0), 0), '__special__')}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
          {wallEvents.length > 0 && (
            <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#a0a0b0', marginBottom: '8px' }}>🏆 Wall of Honour</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                {wallEvents.map((e, i) => {
                  const tierColor = TIER_COLORS[e.tier] || '#ff6b35';
                  return (
                    <div key={i} onClick={() => onOpen(e.set_code)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#12121a', border: '1px solid #2a2a3a', borderLeft: `3px solid ${tierColor}`, borderRadius: '7px', padding: '7px 12px 7px 9px', cursor: 'pointer' }}>
                      {e.avatar ? (
                        <img src={e.avatar} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2a2a3a', display: 'inline-block' }} />
                      )}
                      {e.logo_url && <img src={e.logo_url} alt="" style={{ height: '14px', maxWidth: '50px', objectFit: 'contain' }} />}
                      <span style={{ fontSize: '12px', color: '#e0e0e0' }}>
                        <strong>{e.display_name}</strong> completed{' '}
                        <span style={{
                          color: tierColor, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase',
                          letterSpacing: '0.03em', background: `${tierColor}20`, padding: '1px 6px', borderRadius: '4px',
                        }}>{e.tier_label}</span>
                        {' '}of {e.set_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded era set-tile grids, full width */}
      {MAIN_ERAS.map(era => {
        const sets = byEra[era]; if (!sets?.length || !isOpen(era)) return null;
        const color = ERA_COLORS[era] || '#555';
        return (
          <div key={era} style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '8px' }}>{eraBadge(era, color)}</div>
            {renderGrid(sets, color)}
          </div>
        );
      })}

      {hasSpecial && (!!query || !!eraFilter || expandedEras.has('__special__')) && SPECIAL_ERAS.map(era => {
        const sets = byEra[era]; if (!sets?.length) return null;
        const color = ERA_COLORS[era] || '#555';
        const label = era.replace('Special - ', '');
        return (
          <div key={era} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#a0a0b0', marginBottom: '6px' }}>{label}</div>
            {renderGrid(sets, color)}
          </div>
        );
      })}
    </div>
  );
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
function Checklist({ code, onBack }: { code: string; onBack: () => void }) {
  const router = useRouter();
  const set = SETS[code];
  const [checks, setChecks] = useState<Record<string, boolean>>(() => loadChecks(code));
  const [logoUrl, setLogoUrl] = useState('');
  const [symbolUrl, setSymbolUrl] = useState('');
  const [buying, setBuying] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_BASE}/api/sets/`)
      .then(r => r.json())
      .then(data => {
        const found = (data.results || data).find((s: { code: string; logo_url: string; symbol_url: string }) => s.code === code);
        if (found) { setLogoUrl(found.logo_url || ''); setSymbolUrl(found.symbol_url || ''); }
      })
      .catch(() => {});
  }, [code]);
  // BUG FIXED 2026-08-01 #3: this used to be a separate call to
  // /api/checklists/stock-check/, which -- like pidToId before it -- can
  // only report stock per bare TCGCSV pid, not per exact variant. Since a
  // card's N/H/RH prints share one pid, an out-of-stock RH could still show
  // a Buy button just because its sibling N variant had stock. The product
  // fetch below already carries accurate per-row stock/in_stock, so inStock
  // is now built from that directly (same `${pid}_${variant}` keying as
  // pidToId) instead of a second, coarser network call.
  const [inStock, setInStock] = useState<Set<string>>(new Set());
  const [stockLoaded, setStockLoaded] = useState(false);
  const [filter, setFilter] = useState<'all'|'missing'|'owned'>('all');

  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const [cardImages, setCardImages] = useState<Record<number, string>>({});
  // Keyed by `${pid}_${variant}`, not bare pid -- see the note where this is
  // populated below for why pid alone isn't unique per card.
  const [pidToId, setPidToId] = useState<Record<string, number>>({});

  // ── Leaderboard (Checklist Phase 1: Compare & Compete) ──────────────────
  // A set is "simple" (single Complete Set tier) when no card in it has more
  // than one checkable variant -- same rule as the backend's is_simple_set()
  // in products/completion.py. The static SETS data here only ever contains
  // tracked/checkable variant codes to begin with, so this client-side check
  // reliably matches what the backend decides without needing an extra call.
  const isSimpleSet = set.cards.every(c => c.variants.length <= 1);
  const tierTabs: { key: string; label: string }[] = isSimpleSet
    ? [{ key: 'complete_set', label: 'Complete Set' }]
    : [
        { key: 'broke_base', label: 'Broke Base' },
        { key: 'base_set', label: 'Base Set' },
        { key: 'special_set_base', label: 'Special Set Base' },
        { key: 'master_set', label: 'Master Set' },
      ];
  const [lbTier, setLbTier] = useState(tierTabs[0].key);
  const [leaderboard, setLeaderboard] = useState<{ display_name: string; avatar: string | null; owned: number; required: number; pct: number; complete: boolean; completed_at: string | null; tiers_complete: string[] }[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  // Michael, 2026-08-01: "vague... i want to look at page and know it is
  // done, not have to click to find which is done, also add % to each set
  // type block". Pulls THIS user's own per-tier owned/required/pct/complete
  // for the set being viewed (reuses the existing /checklists/progress/
  // endpoint, same math as the leaderboard's "Complete" badge) so every tab
  // can show its own colour + % + done-state up front, no tab-clicking
  // required. null for logged-out visitors (endpoint requires auth) -- tabs
  // fall back to a plain tier-coloured outline with no %/fill in that case.
  const [myTierProgress, setMyTierProgress] = useState<Record<string, { owned: number; required: number; pct: number; complete: boolean }> | null>(null);

  useEffect(() => { setLbTier(tierTabs[0].key); }, [code]);

  useEffect(() => {
    setLbLoading(true);
    fetch(`${API_BASE}/api/checklists/leaderboard/?set=${code}&tier=${lbTier}`)
      .then(r => r.json())
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [code, lbTier]);

  useEffect(() => {
    setMyTierProgress(null);
    if (typeof window === 'undefined' || !localStorage.getItem('access_token')) return;
    authFetch(`/api/checklists/progress/?set=${code}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => setMyTierProgress(data?.tiers || null))
      .catch(() => setMyTierProgress(null));
  }, [code]);

  useEffect(() => {
    const fetchPage = (url: string, imgAcc: Record<number, string>, idAcc: Record<string, number>, stockAcc: Set<string>) => {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          (data.results || []).forEach((p: { pb_id: string; id: number; image_url: string; tcgplayer_id?: number; variant_override?: string; in_stock?: boolean }) => {
            // BUG FIXED 2026-08-01 (Michael: Buy button on checklist redirects
            // to a search page instead of adding to Pile): pidToId used to be
            // keyed by p.tcgplayer_id, which is blank ("") on essentially
            // every product in the catalog -- so this map ended up empty and
            // buyCard() always fell through to its "couldn't find this
            // product" search-page fallback. The checklist's own `pid` values
            // are actually the TCGCSV catalog number embedded in pb_id (e.g.
            // "TCGCSV-662164"), which was already being extracted correctly
            // for the image map two lines below -- just never reused here.
            const match = p.pb_id && p.pb_id.match(/TCGCSV-(\d+)/);
            if (p.image_url) {
              imgAcc[p.id] = p.image_url;
              if (match) imgAcc[parseInt(match[1], 10)] = p.image_url;
            }
            // BUG FIXED 2026-08-01 #2 (Michael: Buy on an in-stock variant
            // added a different, out-of-stock variant instead -- "Insufficient
            // stock" on a card that showed a Buy button): TCGCSV deliberately
            // shares ONE catalog number across a card's N/H/RH prints (see
            // fix_tcgcsv_product_id_links.py) -- confirmed live, Gloom's N and
            // RH rows both carry pid 662164. Keying pidToId by bare pid alone
            // meant whichever variant loaded last from this API page silently
            // won that slot, so buyCard() could resolve to a completely
            // different print than the one actually clicked. Fixed by keying
            // on (pid, variant) together, same shape as the checklist's own
            // checked-state key (card.num + '_' + v.vc) two screens up.
            const variant = p.variant_override || 'N';
            if (match) idAcc[`${parseInt(match[1], 10)}_${variant}`] = p.id;
            else if (p.tcgplayer_id) idAcc[`${p.tcgplayer_id}_${variant}`] = p.id;
            const stockPid = match ? parseInt(match[1], 10) : p.tcgplayer_id;
            if (stockPid && p.in_stock) stockAcc.add(`${stockPid}_${variant}`);
          });
          if (data.next) fetchPage(data.next, imgAcc, idAcc, stockAcc);
          else {
            setCardImages({ ...imgAcc });
            setPidToId({ ...idAcc });
            setInStock(stockAcc);
            setStockLoaded(true);
          }
        })
        .catch(() => setStockLoaded(true));
    };
    fetchPage(`${API_BASE}/api/products/?card_set=${code}&page_size=400`, {}, {}, new Set<string>());
  }, [code]);

  const buyCard = async (pid: number, vc: string, key: string, zar: number, cardName: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    const dbId = pidToId[`${pid}_${vc}`];
    if (!dbId) {
      // Fallback if this product wasn't in the loaded set page (shouldn't normally happen)
      window.location.href = `/cards?search=${encodeURIComponent(cardName)}&set_code=${code}`;
      return;
    }
    setBuying(prev => new Set(prev).add(key));
    try {
      const res = await authFetch('/api/cart/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: dbId, quantity: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        alert(err.error || 'Could not add to pile — it may be out of stock.');
        return;
      }
      window.dispatchEvent(new Event('pile-updated'));
      toggle(key, zar);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        router.push('/auth/login');
      } else {
        alert('Network error — could not add to pile.');
      }
    } finally {
      setBuying(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const toggle = useCallback((key: string, zar: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }

    // Flips the local checkbox state; calling this twice returns to the
    // original state, which is how we undo an optimistic update below if
    // it turns out it didn't actually save.
    const flip = () => setChecks(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = true;
      saveChecks(code, next);
      return next;
    });

    flip(); // optimistic -- the checkbox responds instantly
    authFetch('/api/checklists/toggle/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_set: code, card_key: key }),
    }).catch(() => {
      // Genuinely couldn't save (session really did expire) -- flip back so
      // the checkbox reflects what's actually saved on the account.
      flip();
    });
  }, [code, router]);

  const resetSet = () => {
    if (!confirm('Reset all checks for ' + set.name + '?')) return;
    setChecks({});
    saveChecks(code, {});
    authFetch('/api/checklists/clear-set/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_set: code }),
    }).catch(() => {});
  };

  // Stats
  let totalVariants = 0, ownedVariants = 0;
  let setTotalZar = 0, collectionZar = 0;
  set.cards.forEach(c => {
    c.variants.forEach(v => {
      totalVariants++; setTotalZar += v.zar;
      if (checks[c.num + '_' + v.vc]) { ownedVariants++; collectionZar += v.zar; }
    });
  });
  // Michael, 2026-08-02: the top stat bar used to compute owned/missing/%
  // from raw local checkbox counts -- a THIRD method, different from the
  // four tier badges below it (Broke Base / Base Set / Special Set Base /
  // Master Set), which come from the server's authoritative
  // compute_user_set_completion() via /api/checklists/progress/. The two
  // could disagree on-screen (e.g. this bar said 82% while the Master Set
  // tab said 79% for the exact same set) -- that's the same "why doesn't
  // this ever hit 100%" bug that started the whole CRI investigation, just
  // showing up here as a mismatch instead of a stuck number. Now the top
  // bar mirrors the Master Set (or Complete Set, for simple sets) tier
  // exactly -- one source of truth. Falls back to the local count only when
  // logged out, since /progress/ requires auth.
  const topTierKey = isSimpleSet ? 'complete_set' : 'master_set';
  const topTier = myTierProgress?.[topTierKey];
  const ownedDisplay = topTier ? topTier.owned : ownedVariants;
  const totalDisplay = topTier ? topTier.required : totalVariants;
  const pct = topTier ? topTier.pct : (totalDisplay ? Math.round(ownedDisplay / totalDisplay * 100) : 0);
  const eraColor = ERA_COLORS[set.era] || '#ff6b35';
  const sorted = [...set.cards].sort((a, b) => (parseInt(a.num) || 9999) - (parseInt(b.num) || 9999));

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 14px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>← All Sets</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl && (
            <img src={logoUrl} alt={set.name} style={{ height: '36px', objectFit: 'contain', maxWidth: '120px' }} />
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {symbolUrl && <img src={symbolUrl} alt="" style={{ height: '16px', width: '16px', objectFit: 'contain' }} />}
              <div style={{ fontSize: '11px', color: eraColor, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{code} · {set.era}</div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{set.name}</div>
          </div>
        </div>
        <button onClick={() => setViewMode('list')} style={{ background: viewMode==='list' ? eraColor : '#1e1e2a', color: viewMode==='list' ? '#fff' : '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>☰ List</button>
        <button onClick={() => setViewMode('grid')} style={{ background: viewMode==='grid' ? eraColor : '#1e1e2a', color: viewMode==='grid' ? '#fff' : '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>⊞ Grid</button>
        <button onClick={() => window.print()} style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>🖨 Print</button>
        <button onClick={resetSet} style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>Reset</button>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: eraColor }}>{ownedDisplay}</div>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Cards owned</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#a0a0b0' }}>{totalDisplay - ownedDisplay}</div>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Missing</div>
        </div>
        <div style={{ width: '1px', height: '40px', background: '#2a2a3a' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ff6b35' }}>{fmt(collectionZar)}</div>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>My collection value</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#a0a0b0' }}>{fmt(setTotalZar)}</div>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Full set value</div>
        </div>
        <div style={{ flex: 1, minWidth: '100px' }}>
          <div style={{ height: '8px', background: '#12121a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: eraColor, borderRadius: '4px', transition: 'width .3s' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: eraColor }}>{pct}%</div>
          <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>Complete</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#a0a0b0' }}>🏆 Leaderboard</div>
          {tierTabs.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Michael, 2026-08-01: each tab now carries its own tier
                  colour, a ✓ + solid fill the moment MY progress hits that
                  tier's 100%, and a live % otherwise -- so completion is
                  readable at a glance without clicking through every tab.
                  Selection (which tab the leaderboard below is scoped to)
                  is shown as a ring, separate from the done/not-done fill. */}
              {tierTabs.map(t => {
                const tierColor = TIER_COLORS[t.key] || eraColor;
                const tp = myTierProgress?.[t.key];
                const isComplete = !!tp?.complete;
                const selected = lbTier === t.key;
                return (
                  <button key={t.key} onClick={() => setLbTier(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', fontSize: '11px', fontWeight: isComplete ? 700 : 500,
                      borderRadius: '5px', border: `1.5px solid ${tierColor}`,
                      background: isComplete ? tierColor : 'transparent',
                      color: isComplete ? '#12121a' : tierColor,
                      boxShadow: selected ? `0 0 0 2px ${tierColor}66` : 'none',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                    {isComplete && <span>✓</span>}
                    <span>{t.label}</span>
                    {tp && <span style={{ opacity: 0.85, fontWeight: 400 }}>· {tp.pct}%</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {lbLoading ? (
          <div style={{ fontSize: '12px', color: '#555' }}>Loading leaderboard…</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#555' }}>No one has completed this tier yet — be the first!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* "First to complete" -- rows are sorted by owned desc, then
                completed_at asc, so a complete row #1 is provably the
                earliest completion, not just the current top of the
                owned-count sort. Michael, 2026-08-01: "make it more
                competition worthy". */}
            {leaderboard.map((row, i) => (
              <div key={row.display_name + i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '18px', textAlign: 'center', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#555', fontWeight: 700 }}>{i + 1}</span>
                  {row.avatar ? (
                    <img src={row.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2a2a3a', display: 'inline-block' }} />
                  )}
                  <span style={{ color: '#e0e0e0', flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {row.display_name}
                    {i === 0 && row.complete && <span title="First to complete">👑</span>}
                  </span>
                  {/* Cross-tier ladder: one dot per tier this set tracks, lit
                      up in that tier's own colour once this person has hit
                      it -- so you can see their whole set progress at a
                      glance, not just the one tier currently selected. */}
                  <span style={{ display: 'flex', gap: '3px' }}>
                    {tierTabs.map(t => {
                      const hit = row.tiers_complete.includes(t.key);
                      const tc = TIER_COLORS[t.key] || eraColor;
                      return (
                        <span key={t.key} title={`${t.label}${hit ? ' -- complete' : ''}`} style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: hit ? tc : 'transparent',
                          border: `1px solid ${hit ? tc : '#333'}`,
                        }} />
                      );
                    })}
                  </span>
                  {row.complete ? (
                    <span style={{ color: '#66cc66', fontSize: '11px', whiteSpace: 'nowrap' }}>✓ Complete{row.completed_at ? ' · ' + new Date(row.completed_at).toLocaleDateString('en-ZA') : ''}</span>
                  ) : (
                    <span style={{ color: '#555', fontSize: '11px', whiteSpace: 'nowrap' }}>{row.owned}/{row.required} · {row.pct}%</span>
                  )}
                </div>
                {/* Mini visual progress bar per row (Michael: "maybe have
                    progress bars for all sets") -- same idea as the Overview
                    grid's tile bars, just scaled down for a leaderboard row. */}
                <div style={{ height: '4px', background: '#12121a', borderRadius: '2px', overflow: 'hidden', marginLeft: '28px' }}>
                  <div style={{ height: '100%', width: `${row.pct}%`, background: row.complete ? '#66cc66' : eraColor, borderRadius: '2px', transition: 'width .3s' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#444', marginTop: '10px' }}>
          Want to appear here? Set a display name and enable checklist sharing in your <a href="/profile" style={{ color: eraColor }}>Profile</a>.
        </div>
      </div>

      {/* Legend + filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#555', flex: 1 }}>● C &nbsp;◆ UC &nbsp;★ R &nbsp;★H Holo &nbsp;★★ DR &nbsp;★i IR &nbsp;◇◇ UR &nbsp;★◇ SIR &nbsp;◈ MHR</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all','missing','owned'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px', border: '1px solid', borderColor: filter===f ? eraColor : '#2a2a3a', background: filter===f ? eraColor : 'transparent', color: filter===f ? '#fff' : '#555', cursor: 'pointer' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {!stockLoaded && <span style={{ fontSize: '11px', color: '#555' }}>Loading stock...</span>}
      </div>

      {/* Card grid IMAGE view */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {sorted.map(card => {
            const allOwned = card.variants.every(v => checks[card.num + '_' + v.vc]);
            const noneOwned = card.variants.every(v => !checks[card.num + '_' + v.vc]);
            if (filter === 'missing' && allOwned) return null;
            if (filter === 'owned' && noneOwned) return null;
            const imgUrl = card.variants.reduce((found: string, v) => found || cardImages[v.pid] || '', '');
            return (
              <div key={card.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Card image */}
                <div style={{ position: 'relative', width: '100%' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={card.name} loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        const retries = parseInt(img.dataset.retries || '0', 10);
                        if (retries < 3) {
                          img.dataset.retries = String(retries + 1);
                          setTimeout(() => { img.src = imgUrl + '?retry=' + retries; }, 800 * (retries + 1));
                        }
                      }}
                      style={{ width: '100%', borderRadius: '8px', opacity: allOwned ? 0.35 : 1,
                        border: allOwned ? `2px solid ${eraColor}` : '2px solid transparent',
                        transition: 'opacity 0.2s', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', paddingBottom: '140%', background: '#1e1e2a', borderRadius: '8px',
                      border: '1px solid #2a2a3a', position: 'relative' }}>
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        fontSize: '10px', color: '#555', textAlign: 'center', padding: '4px', width: '100%' }}>{card.name}</span>
                    </div>
                  )}
                  {allOwned && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: eraColor,
                      borderRadius: '50%', width: '18px', height: '18px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>✓</div>
                  )}
                  {code === 'PRIZEPACK' && (
                    <img
                      src="https://images.pokebulk.co.za/sets/symbols/prizepack_stamp.png"
                      alt="Play! Pokemon stamp"
                      style={{ position: 'absolute', bottom: '4px', left: '4px', width: '20px', height: '14px',
                        objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                    />
                  )}
                </div>
                {/* Card name */}
                <div style={{ fontSize: '9px', color: '#666', textAlign: 'center', margin: '3px 0 4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {card.num.split('/')[0]} · {card.name}
                </div>
                {/* Variant checkboxes */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {card.variants.map(v => {
                    const key = card.num + '_' + v.vc;
                    const vcColor: Record<string, string> = {
                      N: '#a0a0b0', RH: '#ff6b35', H: '#ffd700', ESH: '#1D9E75',
                      PB: '#e040fb', MB: '#7c4dff', LB: '#00bcd4',
                      FB: '#4caf50', QB: '#f44336', UB: '#2196f3',
                      DB: '#795548', TR: '#607d8b', SE: '#ff9800',
                    };
                    const col = vcColor[v.vc] || '#a0a0b0';
                    // Buy button on Grid View (2026-08-12, Michael: "went
                    // customer goes to 'Grid View' please add the buy
                    // button for available stock!") -- same
                    // inStock/buying/buyCard wiring List View already uses,
                    // just laid out for the grid's smaller per-card footprint.
                    const canBuy = !checks[key] && inStock.has(`${v.pid}_${v.vc}`);
                    return (
                      <div key={v.vc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div onClick={() => toggle(key, v.zar)} style={{ position: 'relative', cursor: 'pointer' }}>
                          <div style={{
                            background: checks[key] ? col : '#1a1a2e',
                            border: `1px solid ${col}`,
                            borderRadius: '4px', padding: '2px 5px',
                            fontSize: '8px', fontWeight: 700, color: checks[key] ? '#fff' : col,
                            textTransform: 'uppercase', lineHeight: 1.2,
                          }}>{v.vc}</div>
                          {code === 'PRIZEPACK' && v.vc === 'H' && (
                            <span style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '7px', color: '#CECBF6' }} title="Cosmos Holo">✦</span>
                          )}
                        </div>
                        {canBuy ? (
                          <button
                            onClick={() => buyCard(v.pid, v.vc, key, v.zar, card.name)}
                            disabled={buying.has(key)}
                            style={{ fontSize: '7px', color: '#ff6b35', background: 'transparent', border: '1px solid #ff6b35', borderRadius: '3px', padding: '0px 3px', fontWeight: 700, lineHeight: 1.4, cursor: buying.has(key) ? 'default' : 'pointer', opacity: buying.has(key) ? 0.5 : 1 }}>
                            {buying.has(key) ? '…' : 'Buy'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '7px', color: '#444' }}>{v.zar > 0 ? 'R'+v.zar.toFixed(0) : ''}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Card LIST view */}
      {viewMode === 'list' && (
      <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2px 5px' }}>
          {sorted.map(card => {
            const allOwned = card.variants.every(v => checks[card.num + '_' + v.vc]);
            const noneOwned = card.variants.every(v => !checks[card.num + '_' + v.vc]);
            if (filter === 'missing' && allOwned) return null;
            if (filter === 'owned' && noneOwned) return null;
            const sym = RSYM[card.rarity] || '';
            return (
              <div key={card.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '3px', padding: '3px', borderRadius: '3px', opacity: allOwned ? 0.4 : 1 }}>
                <span style={{ fontSize: '9px', color: '#444', minWidth: '22px', flexShrink: 0, paddingTop: '2px' }}>{card.num.split('/')[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: allOwned ? '#555' : '#c0c0c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={card.name}>{card.name}</span>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {card.variants.map(v => {
                      const key = card.num + '_' + v.vc;
                      const vcColor: Record<string, string> = {
                        N: '#a0a0b0', RH: '#ff6b35', H: '#ffd700', ESH: '#1D9E75',
                        PB: '#e040fb', MB: '#7c4dff', LB: '#00bcd4',
                        FB: '#4caf50', QB: '#f44336', UB: '#2196f3',
                        DB: '#795548', TR: '#607d8b', SE: '#ff9800',
                      };
                      const col = vcColor[v.vc] || eraColor;
                      return (
                        <div key={v.vc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                          <div onClick={() => toggle(key, v.zar)} style={{
                            background: checks[key] ? col : 'transparent',
                            border: `1px solid ${checks[key] ? col : '#333'}`,
                            borderRadius: '3px', padding: '1px 4px',
                            fontSize: '7px', fontWeight: 700, color: checks[key] ? '#fff' : '#555',
                            textTransform: 'uppercase', lineHeight: 1.3, cursor: 'pointer',
                          }}>{v.vc}</div>
                          {!checks[key] && inStock.has(`${v.pid}_${v.vc}`) && (
                            <button
                              onClick={() => buyCard(v.pid, v.vc, key, v.zar, card.name)}
                              disabled={buying.has(key)}
                              style={{ fontSize: '7px', color: '#ff6b35', background: 'transparent', textDecoration: 'none', border: '1px solid #ff6b35', borderRadius: '3px', padding: '0px 3px', fontWeight: 700, lineHeight: 1.4, cursor: buying.has(key) ? 'default' : 'pointer', opacity: buying.has(key) ? 0.5 : 1 }}>
                              {buying.has(key) ? '…' : 'Buy'}
                            </button>
                          )}
                          {!inStock.has(`${v.pid}_${v.vc}`) && (
                            <span style={{ fontSize: '7px', color: '#333', lineHeight: 1.2 }}>{v.zar > 0 ? 'R'+v.zar.toFixed(0) : ''}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Poké<span style={{ color: '#ff6b35' }}>Bulk</span> SA</div>
            <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>Provided by PokéBulk SA — South Africa's Pokémon TCG Singles Specialists</div>
            <div style={{ fontSize: '9px', color: '#555' }}>Reg. No. 2024/615040/07 · 4 Heloise Street, Birchleigh North, Kempton Park</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ff6b35' }}>pokebulk.co.za</div>
            <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>For personal use only · © 2025</div>
          </div>
        </div>
      </div>
      )}

      <style>{`@media print {
        body { background: white !important; color: black !important; }
        nav, header, [data-no-print] { display: none !important; }
        * { background: transparent !important; color: black !important; border-color: #ddd !important; }
      }`}</style>
    </div>
  );
}

// Split out from the default export so useSearchParams() (which needs a
// Suspense boundary in the app router) doesn't force the whole page into
// a loading state on first paint.
//
// FIX 2026-08-01 (Michael: "When you go back after selecting something,
// the site takes you back to landing page, never back to where you
// were"): opening a set used to just flip a local `activeSet` piece of
// state -- the URL never changed, so the browser never recorded that step
// in history. Hitting Back skipped straight past the checklist you were
// looking at to whatever page you were on before you ever landed on
// /checklists. Fixed by driving activeSet from a `?set=` query param via
// the router instead of local state: opening/closing a set is now a real
// navigation (router.push), so it gets its own history entry and Back
// behaves the way you'd expect -- checklist -> overview -> wherever you
// came from.
function ChecklistsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSet = searchParams.get('set');
  // Guard against a stale/hand-edited ?set= that doesn't match a real set --
  // fall back to the Overview instead of handing Checklist a code it can't
  // resolve.
  const activeSet = requestedSet && SETS[requestedSet] ? requestedSet : null;
  const [ready, setReady] = useState(checklistCacheReady);

  useEffect(() => {
    ensureChecklistData().then(() => setReady(true));
  }, []);

  const openSet = (code: string) => router.push(`/checklists?set=${code}`);
  // Prefer a real "go back one step" over pushing a fresh /checklists entry
  // on top -- opening a set always comes from the Overview being on the
  // history stack right below it, so back() lands there directly instead
  // of stacking a redundant duplicate entry. Falls back to a plain push
  // only if this tab has no history to go back to (e.g. a ?set= link was
  // opened directly, not via clicking a set on the Overview).
  const closeSet = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/checklists');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#12121a', color: '#e0e0e0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Set Checklists</h1>
          <p style={{ fontSize: '13px', color: '#555' }}>Track your collection across all 146 sets. Log in to save your progress to your account.</p>
        </div>
        {!ready ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Loading your checklist progress...</div>
        ) : activeSet ? (
          <Checklist code={activeSet} onBack={closeSet} />
        ) : (
          <Overview onOpen={openSet} />
        )}
      </div>
    </div>
  );
}

export default function ChecklistsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#12121a' }} />}>
      <ChecklistsPageInner />
    </Suspense>
  );
}
