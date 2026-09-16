'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, SessionExpiredError } from '@/lib/api';
import { buildPullSheetHtml, openPullSheet, type PullSheetRow } from '@/lib/pullSheet';
import {
  API_BASE, normalizeEraName, loadChecks, saveChecks, ensureChecklistData,
  isChecklistCacheReady, getProgress, fmt, eraToSlug,
} from '@/lib/checklistShared';

import {
  SETS, SET_INDEX, ERA_COLORS, TIER_COLORS, TIER_LABELS_FE, ERA_ORDER, RSYM,
  TIER_VARIANT_SCOPE, TIER_NUMBERED_ONLY, MASTER_SET_CHASE_RARITIES, FULL_VARIANTS,
  BALL_VARIANTS, PATTERN_VARIANTS,
} from '@/lib/checklistData';
import type { Variant, Card, SetData, SetMeta } from '@/lib/checklistData';

// Rotating palette for the "Select All" rarity pills (Michael, 2026-09-16
// round 3) -- purely cosmetic so a set with many rarity tiers stays visually
// distinguishable; the count of pills is dynamic per set, so this is sized
// generously and just cycles if a set somehow has more tiers than colors.
const SELECT_GROUP_COLORS = ['#2196f3', '#7c4dff', '#ffd700', '#ec4899', '#22c55e', '#f97316', '#06b6d4', '#a855f7'];

// ── CSV export (Michael, 2026-09-02: Checklists CSV export -- a full list
// with highlighted/owned status, and a "needed" pull list of just what's
// missing). Reuses the same full variant names as the pull sheet / invoice
// (orders/views.py VARIANT_LABEL_FULL) so what a customer exports reads
// the same as what staff see when picking the order -- the bare vc code
// (e.g. "RH") on its own means nothing outside this codebase.
const VARIANT_LABEL_FULL: Record<string, string> = {
  N: 'Normal', H: 'Holo', RH: 'Reverse Holo',
  PB: 'Poke Ball', MB: 'Master Ball', LB: 'Love Ball',
  FB: 'Friend Ball', QB: 'Quick Ball', UB: 'Ultra Ball',
  DB: 'Dusk Ball', TR: 'Team Rocket', SE: 'Secret',
  PBP: 'PB Pattern', MBP: 'MB Pattern',
  CC: 'Code Card', TT: 'Trick or Trade', 'HR-EX': 'Illustration Rare',
  EX: 'Double Rare', GX: 'GX', V: 'V', VMAX: 'VMAX', VSTAR: 'VSTAR',
  RR: 'Rainbow Rare', RAD: 'Radiant',
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}
// preRows (Michael, 2026-09-02: "the csv gives no customer details, no
// context of what set") -- optional metadata rows (Customer / Set) written
// before the header row, so an exported file is self-explanatory once it's
// out of the browser and sitting in someone's Downloads folder.
function downloadCsv(filename: string, header: string[], rows: string[][], preRows: string[][] = []) {
  const csv = [...preRows, header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  // Leading BOM so Excel opens the accented characters in card names correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// escapeHtml / splitIntoColumns / PullSheetRow / buildPullSheetHtml /
// openPullSheet all moved to @/lib/pullSheet (2026-09-11) so the new
// /staff/bundles Bundle Opportunities page can reuse the exact same
// printable pull-sheet look -- see that module for the full history/
// reasoning behind the layout. Imported at the top of this file.

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
// Card-image-forward set tile, shared by the search-results list on the home
// screen and (via the same visual language) the era drill-down page. Not the
// era-page's own set list -- that one lives in app/checklists/[era]/page.tsx
// and needs its own data fetching -- but kept here so a search match looks
// and feels the same as opening it via its era.
function SetSearchCard({ s, color, logos, myCompletions, onOpen }: {
  s: SetMeta; color: string;
  logos: Record<string, { logo_url: string; symbol_url: string; release_date?: string }>;
  myCompletions: Record<string, string>;
  onOpen: (code: string) => void;
}) {
  const prog = getProgress(s.code);
  const completedTier = myCompletions[s.code];
  const tierColor = completedTier ? (TIER_COLORS[completedTier] || color) : null;
  return (
    <div onClick={() => onOpen(s.code)}
      style={{
        background: '#1e1e2a',
        border: `${tierColor ? 2 : 1}px solid ${tierColor || (prog.owned > 0 ? color : '#2a2a3a')}`,
        boxShadow: tierColor ? `0 0 0 1px ${tierColor}40` : undefined,
        borderRadius: '10px', padding: '10px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
      <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#12121a', borderRadius: '7px', overflow: 'hidden' }}>
        {logos[s.code]?.logo_url ? (
          <img src={logos[s.code].logo_url} alt={s.name} style={{ maxHeight: '80%', maxWidth: '85%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: '10px', color: '#555', fontWeight: 700 }}>{s.code}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#e0e0e0', lineHeight: 1.3 }}>{s.name}</div>
        <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>{s.code} · {s.cards} cards</div>
      </div>
      {tierColor && (
        <div title={`${TIER_LABELS_FE[completedTier] || completedTier} complete`} style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '13px', lineHeight: 1 }}>🏆</div>
      )}
      {prog.owned > 0 && (
        <div style={{ height: '3px', background: '#12121a', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog.pct}%`, background: tierColor || color, borderRadius: '2px' }} />
        </div>
      )}
    </div>
  );
}

// ── ERA HOME (My Collection landing page) ──────────────────────────────────
// Rebuilt 2026-09-16 per Michael: "I want to change 'My Collection' page
// structure, people are using mostly on their phones, so i want it to show
// up as images ... Even if it means running more pages to achieve the look!"
// -- replaces the old collapsible-accordion Overview with a mobile-first
// drill-down: this screen is now JUST full-width era logo cards (level 1 of
// 3, matching his reference screenshots' home screen), each one tapping
// through to /checklists/[era] (level 2 -- that page lists sets, with real
// logo images and progress bars). Opening a specific set still goes to the
// existing, feature-rich Checklist screen below (leaderboard, exports,
// image grid with the "Caught" badges) via ?set=code -- unchanged, per
// Michael's call to keep that screen as-is rather than rebuild it too.
function EraHome({ onOpen }: { onOpen: (code: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [, forceUpdate] = useState(0);
  const [logos, setLogos] = useState<Record<string, { logo_url: string; symbol_url: string; release_date?: string }>>({});

  // Michael, 2026-08-08: "replace the simple Era labels with the actual Era
  // Logo" -- keyed by era NAME (not code) since that's what ERA_ORDER/the
  // static SETS data already use as the era key everywhere in this file.
  // Blank/missing logo_url (Michael hasn't pasted one in for that era yet)
  // just falls back to the existing coloured text pill, so this is safe to
  // ship before every era has a logo filled in via admin.
  const [eraLogos, setEraLogos] = useState<Record<string, string>>({});
  // Michael, 2026-09-16: "the era symbols... so we can add them to the page
  // for era selection" -- a new, separate small ICON per era (Era.symbol_url,
  // parallel to CardSet.symbol_url), distinct from the wider wordmark
  // logo_url above. The compact home cards read better with the small icon,
  // so eraBadge() below prefers a symbol and only falls back to the logo
  // (then the plain coloured text pill) when no symbol is set for that era.
  const [eraSymbols, setEraSymbols] = useState<Record<string, string>>({});
  // Michael, 2026-09-02: "we need to fix the images for the era's, evn if
  // we just go back to simple name labels" -- a dead/broken logo_url (404,
  // wrong R2 path, etc.) was rendering the browser's broken-image icon
  // instead of falling back to the coloured text pill below. Tracking which
  // URLs actually failed to load lets eraBadge() treat "failed" the same
  // as "never set" and fall back cleanly. Shared between logos and symbols
  // -- either kind of broken URL should fail over the same way.
  const [failedEraLogos, setFailedEraLogos] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch(`${API_BASE}/api/eras/`)
      .then(r => r.json())
      .then(data => {
        const logoMap: Record<string, string> = {};
        const symbolMap: Record<string, string> = {};
        // Michael, 2026-08-08: the Era table has legacy duplicate rows per
        // era (multiple codes, same conceptual era) and inconsistent naming
        // -- some end in "Era", some don't ("Sword & Shield Era" vs this
        // page's own "Sword & Shield" label). An exact-string match silently
        // failed for most of them even with a valid logo_url saved, so this
        // normalizes both sides (trim, lowercase, drop a trailing " Era")
        // before comparing instead of requiring a byte-for-byte match.
        (data.results || []).forEach((e: { name: string; logo_url: string; symbol_url?: string }) => {
          if (e.logo_url) logoMap[normalizeEraName(e.name)] = e.logo_url;
          if (e.symbol_url) symbolMap[normalizeEraName(e.name)] = e.symbol_url;
        });
        setEraLogos(logoMap);
        setEraSymbols(symbolMap);
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

  // "Special - X" eras (Trick or Trade, Prize Pack, and any future one-off
  // product line like McDonald's/Rumble/POP) don't belong to any single
  // generation -- gathered under one shared "Special Sets" card at the
  // bottom of the era list rather than each getting its own top-level era
  // card. Genuine era-tied side products (Trainer Gallery, Galarian
  // Gallery, Champion's Path, etc.) are NOT part of this -- those keep
  // living as siblings inside their real era, per Michael's call on
  // 2026-07-30.
  const MAIN_ERAS = ERA_ORDER.filter(e => !e.startsWith('Special - '));
  const SPECIAL_ERAS = ERA_ORDER.filter(e => e.startsWith('Special - '));
  const hasSpecial = SPECIAL_ERAS.some(e => SET_INDEX.some(s => s.era === e));

  // Renders the era's actual logo when one's been set via admin, otherwise
  // falls back to the original coloured text pill -- same visual slot
  // either way so nothing else about the layout needs to change per-era.
  const eraBadge = (label: string, color: string, big = false) => {
    const symbolUrl = eraSymbols[normalizeEraName(label)];
    const logoUrl = eraLogos[normalizeEraName(label)];
    const imgUrl = (symbolUrl && !failedEraLogos.has(symbolUrl)) ? symbolUrl
      : (logoUrl && !failedEraLogos.has(logoUrl)) ? logoUrl
      : null;
    if (imgUrl) {
      return <img src={imgUrl} alt={label} title={label} style={{ height: big ? '46px' : '20px', maxWidth: big ? '80%' : '120px', objectFit: 'contain' }}
        onError={() => setFailedEraLogos(prev => new Set(prev).add(imgUrl))} />;
    }
    return (
      <div style={{ background: color, color: '#fff', fontSize: big ? '18px' : '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: big ? '10px 20px' : '3px 10px', borderRadius: '6px' }}>{label}</div>
    );
  };

  // Search spans every set across every era (not just era names) -- typing
  // "Celebrations" or a set code should surface that set directly, without
  // making the customer figure out which era card to tap through first.
  const searchMatches = query.trim()
    ? SET_INDEX.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const eraCard = (era: string, color: string, count: number, special = false) => (
    <div key={era}
      onClick={() => (special ? router.push('/checklists/special') : router.push(`/checklists/${eraToSlug(era)}`))}
      style={{
        background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '14px',
        padding: '22px 16px', cursor: 'pointer', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        transition: 'transform 0.12s ease, border-color 0.12s ease',
      }}
      className="pb-era-card">
      <div style={{ minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {eraBadge(special ? 'Special Sets' : era, color, true)}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{special ? 'Special Sets' : era}</div>
      <div style={{ fontSize: '11px', color: '#555' }}>{count} set{count === 1 ? '' : 's'}</div>
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search any set..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '10px', color: '#fff', fontSize: '15px' }} />
      </div>

      {query.trim() ? (
        // ── Search results -- flat, image-forward set cards regardless of era ──
        <div>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>{searchMatches.length} set{searchMatches.length === 1 ? '' : 's'} match &quot;{query}&quot;</div>
          {searchMatches.length === 0 ? (
            <div style={{ color: '#555', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>No sets found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '10px' }}>
              {searchMatches.map(s => (
                <SetSearchCard key={s.code} s={s} color={ERA_COLORS[s.era] || '#ff6b35'} logos={logos} myCompletions={myCompletions} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Level 1 of the drill-down: one big full-width (stacks 2-up on
              wider screens) tappable card per era -- tap through to
              /checklists/[era] for that era's sets. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px', marginBottom: '20px' }}>
            {MAIN_ERAS.map(era => {
              const count = SET_INDEX.filter(s => s.era === era).length;
              if (!count) return null;
              return eraCard(era, ERA_COLORS[era] || '#555', count);
            })}
            {hasSpecial && eraCard('__special__', '#37474F', SPECIAL_ERAS.reduce((n, e) => n + SET_INDEX.filter(s => s.era === e).length, 0), true)}
          </div>

          {wallEvents.length > 0 && (
            <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '12px 14px' }}>
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
        </>
      )}

      <style>{`
        .pb-era-card:hover { border-color: #ff6b35 !important; transform: translateY(-2px); }
      `}</style>
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
  const [emailingPullList, setEmailingPullList] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; email: string; username: string } | null>(null);

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

  // Michael, 2026-09-16: "when going to set, open default Grid screen!" --
  // the image-forward grid is now the first thing a customer sees on a set;
  // List is still there as a toggle for anyone who prefers the dense text
  // layout (or wants to print it).
  const [viewMode, setViewMode] = useState<'list'|'grid'>('grid');
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
        { key: 'full_master', label: 'Full Master' },
      ];
  // The "everything, unfiltered" tier -- same tier the top stats bar has
  // always scored against (see topTierKey below). Used as the default
  // selection so opening a set doesn't immediately hide cards/variants;
  // narrowing down to Broke Base/Base Set/etc is an explicit tab click.
  // NOTE: Master Set is no longer the top of the ladder as of the
  // rarity-based tier split (Michael, 2026-09-11) -- it now trades
  // Pokeball/Masterball requirements for Illustration Rares, so it's no
  // longer a strict superset of everything else. Full Master is.
  const fullTierKey = isSimpleSet ? 'complete_set' : 'full_master';
  const [lbTier, setLbTier] = useState(fullTierKey);
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

  useEffect(() => { setLbTier(fullTierKey); }, [code]);

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
  const topTierKey = fullTierKey;
  const topTier = myTierProgress?.[topTierKey];
  const ownedDisplay = topTier ? topTier.owned : ownedVariants;
  const totalDisplay = topTier ? topTier.required : totalVariants;
  const pct = topTier ? topTier.pct : (totalDisplay ? Math.round(ownedDisplay / totalDisplay * 100) : 0);
  const eraColor = ERA_COLORS[set.era] || '#ff6b35';
  const sorted = [...set.cards].sort((a, b) => (parseInt(a.num) || 9999) - (parseInt(b.num) || 9999));

  // Michael, 2026-09-11: "the checklists are broken up into different
  // types, can we make the type selectable and the screen then reflects
  // that selection. Only showing the cards required to complete 'Base
  // Set'" -- reuses the tier tab selection above (lbTier) to also scope
  // the card grid/list, not just the leaderboard. Broke Base/Base
  // Set/Special Set Base are gated by NUMBERED cards only (card_number <=
  // the set's total_cards -- Michael, 2026-09-11, after live-testing:
  // "cards under 088 are numbered, the rest ... are unnumbered"), not by
  // rarity. Master Set admits numbered cards PLUS unnumbered cards whose
  // rarity is an Illustration Rare/Special Illustration Rare ("Master
  // Set ... all illustration Rares"). Full Master admits every card. Each
  // remaining card only shows the variant chips that tier actually counts
  // (e.g. no Pokeball/Masterball chips outside Special Set Base/Full
  // Master). Mirrors products/completion.py's compute_set_completion()
  // exactly (see TIER_VARIANT_SCOPE/TIER_NUMBERED_ONLY/MASTER_SET_CHASE_RARITIES).
  const isNumberedCard = (num: string) => {
    const [n, total] = num.split('/').map(s => parseInt(s, 10));
    return !isNaN(n) && !isNaN(total) && n <= total;
  };
  const tierScope = new Set(TIER_VARIANT_SCOPE[lbTier] || FULL_VARIANTS);
  const tierNumberedOnly = TIER_NUMBERED_ONLY[lbTier] ?? false;
  const tierFilteredSorted = sorted
    .filter(card => {
      if (tierNumberedOnly) return isNumberedCard(card.num);
      if (lbTier === 'master_set') return isNumberedCard(card.num) || MASTER_SET_CHASE_RARITIES.includes(card.rarity);
      return true; // full_master / complete_set -- every card
    })
    .map(card => ({ ...card, variants: card.variants.filter(v => tierScope.has(v.vc)) }))
    .filter(card => card.variants.length > 0);

  // "Select All" bulk actions (Michael, 2026-09-16 -- his reference app's
  // Select All row: check / lightning-bolt / star icons). Adapted for
  // PokeBulk's multi-variant cards -- a Pokedex-style app has one print per
  // card; here a card can have Normal/Holo/Reverse Holo/etc side by side --
  // per Michael's call: check = every card's Normal print, lightning = every
  // Reverse Holo, star = whichever print of each card is the "chase" one.
  // Michael, 2026-09-16 (round 2): "the toggle 'Select All' must also
  // Deselect if pushed again" -- so this is a real toggle, not a one-way
  // mark: if every targeted card is already owned, pressing again clears
  // all of them; otherwise it marks whatever's still missing owned. Scoped
  // to whichever tier tab is currently selected, same set of cards the
  // button's own "is everything already selected" check reads from.
  // Michael, 2026-09-16 (round 4): each group can now target MORE THAN ONE
  // print per card (e.g. "Commons & Holos" must mark both the N and the H
  // print of a card that has both, not just its preferred one) -- pickers
  // return Variant[] instead of a single Variant|null. A group only counts
  // as "fully owned" when every variant it targets, for every card it
  // targets, is checked.
  const isAllPickerOwned = useCallback((vcPicker: (card: Card) => Variant[]): boolean => {
    let sawAny = false;
    for (const card of tierFilteredSorted) {
      const vs = vcPicker(card);
      if (vs.length === 0) continue;
      sawAny = true;
      for (const v of vs) {
        if (!checks[card.num + '_' + v.vc]) return false;
      }
    }
    return sawAny;
  }, [tierFilteredSorted, checks]);

  const toggleAllByPicker = useCallback((vcPicker: (card: Card) => Variant[]) => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    const targets: string[] = [];
    tierFilteredSorted.forEach(card => {
      vcPicker(card).forEach(v => targets.push(card.num + '_' + v.vc));
    });
    if (targets.length === 0) return;
    const deselecting = targets.every(key => checks[key]);
    const changed: string[] = [];
    setChecks(prev => {
      const next = { ...prev };
      targets.forEach(key => {
        if (deselecting) {
          if (next[key]) { delete next[key]; changed.push(key); }
        } else {
          if (!next[key]) { next[key] = true; changed.push(key); }
        }
      });
      saveChecks(code, next);
      return next;
    });
    // Fire-and-forget, same one-POST-per-card pattern `toggle` already uses
    // for a single card -- just for many at once, so a batch of 100+ can't
    // block the UI. An occasional dropped request just needs a re-tap.
    changed.forEach(key => {
      authFetch('/api/checklists/toggle/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_set: code, card_key: key }),
      }).catch(() => {});
    });
  }, [code, router, tierFilteredSorted, checks]);

  // Michael, 2026-09-16 (round 3): "Select all is broken down to Commons
  // and Holo's / Rev Holo's / EX - Double Rares / Illustration Rares...
  // our breakdown of the set types, is the ultimate dictator of which
  // Select all does! You can even put EX's before Rev Holo's". Round 4,
  // same day, after live-testing round 3's "one group per rarity actually
  // present" version ("The Rarity issue is bad!" -> too many buttons, one
  // per rarity tier including Illustration/Ultra/Special-Illustration/Mega
  // Hyper Rare): "So Broke set all Commons and Holo's / Base Set all
  // Commons and Holo's All Ex's All Rev Holo's -- No cards outside of the
  // Set card number! / Master Set all cards including cards outside Set
  // Card Number" -- the GROUP BREAKDOWN itself now differs per tier tab,
  // it's not just "whatever rarities happen to be in scope":
  //   - Broke Base: one group, any numbered card's single N/H print (Broke
  //     Base only ever requires ONE print per card regardless of rarity --
  //     see products/completion.py _broke_base_progress).
  //   - Base Set / Special Set Base: exactly Commons & Holos, EX's (Double
  //     Rare), Reverse Holos -- plus Poke Balls on Special Set Base only,
  //     the one tier that actually requires ball variants. No separate
  //     button per higher chase rarity (Illustration Rare etc) even if one
  //     happens to be numbered in this set -- those get ticked by hand.
  //   - Master Set / Full Master / Complete Set: one "All Cards" group --
  //     the whole point of these tiers is "everything", numbered or not.
  // Numbered-only scoping for Broke Base/Base Set/Special Set Base already
  // comes from TIER_NUMBERED_ONLY feeding tierFilteredSorted above -- no
  // change needed there, this is purely about which SELECT ALL BUTTONS
  // appear. Each group's picker now returns every variant it should mark
  // for a card (not just one), so e.g. Commons & Holos correctly requires
  // BOTH a card's N and H print when both exist, matching how
  // completion.py actually scores the tier.
  const BASE_RARITIES = new Set(['Common', 'Uncommon', 'Rare', 'Holo Rare']);
  const EX_RARITIES = new Set(['Double Rare']);
  const BALL_VARIANT_SET = new Set(BALL_VARIANTS);
  // Michael, 2026-09-16 (round 5): "we need to enforce the same criteria to
  // 'Select All' buttons? also include the special variants to sets that
  // have them ie ASC, Black Bolt, White Flair, Prismatic Evolutions" -- ASC
  // already has one of these (Energy Symbol Holo, vc "ESH"), and the newer
  // SV-era sets he named are getting their own exclusive parallel prints as
  // they get catalogued. Rather than hardcode ASC/ESH (or guess at whatever
  // Black Bolt/White Flair/Prismatic Evolutions end up calling theirs), this
  // reads off PATTERN_VARIANTS -- the SAME list checklistData.ts/
  // completion.py already use to decide which prints are "special/chase
  // parallel" vs a normal print -- so the day a new pattern code gets added
  // there (one line, same as ESH was) every tier's Select All picks it up
  // automatically as its own "Special Variants" button, no further frontend
  // changes needed for whichever set introduces it.
  const PATTERN_VARIANT_SET = new Set(PATTERN_VARIANTS);
  const selectAllGroups = useMemo(() => {
    type SelectGroup = { key: string; label: string; icon: string; picker: (card: Card) => Variant[] };
    const groups: SelectGroup[] = [];
    const has = (pred: (c: Card) => boolean) => tierFilteredSorted.some(pred);
    const hasPattern = has(c => c.variants.some(v => PATTERN_VARIANT_SET.has(v.vc)));

    if (lbTier === 'broke_base') {
      if (has(() => true)) {
        groups.push({
          key: '__all__', label: 'Commons & Holos', icon: '●',
          picker: card => {
            const v = card.variants.find(v => v.vc === 'N') || card.variants.find(v => v.vc === 'H');
            return v ? [v] : [];
          },
        });
      }
      return groups;
    }

    if (lbTier === 'master_set') {
      // Michael: "Master Set all cards including cards outside Set Card
      // Number" -- stays one bucket, no breakdown. (Master Set's own
      // variant scope is N/H/RH only -- see MASTER_SET_VARIANTS -- so
      // there's nothing pattern-specific to split out here today anyway.)
      if (has(() => true)) {
        groups.push({ key: '__all__', label: 'All Cards', icon: '★', picker: card => card.variants });
      }
      return groups;
    }

    if (lbTier === 'full_master' || lbTier === 'complete_set') {
      // "Every card, every rarity, every variant" -- but if this set has a
      // special/pattern parallel (ASC's Energy Symbol Holo etc), split it
      // into its own button so it can be targeted on its own, same as
      // Reverse Holos/Poke Balls get their own button below instead of
      // being buried inside one giant catch-all.
      if (hasPattern) {
        if (has(() => true)) {
          groups.push({
            key: '__core__', label: 'Core Cards', icon: '★',
            picker: card => card.variants.filter(v => !PATTERN_VARIANT_SET.has(v.vc)),
          });
        }
        groups.push({
          key: '__pattern__', label: 'Special Variants', icon: '✨',
          picker: card => card.variants.filter(v => PATTERN_VARIANT_SET.has(v.vc)),
        });
      } else if (has(() => true)) {
        groups.push({ key: '__all__', label: 'All Cards', icon: '★', picker: card => card.variants });
      }
      return groups;
    }

    // base_set / special_set_base
    if (has(c => BASE_RARITIES.has(c.rarity))) {
      groups.push({
        key: '__base__', label: 'Commons & Holos', icon: '●',
        picker: card => (BASE_RARITIES.has(card.rarity) ? card.variants.filter(v => v.vc === 'N' || v.vc === 'H') : []),
      });
    }
    if (has(c => EX_RARITIES.has(c.rarity))) {
      groups.push({
        key: '__ex__', label: "EX's", icon: RSYM['Double Rare'] || '★★',
        picker: card => (EX_RARITIES.has(card.rarity) ? card.variants.filter(v => v.vc !== 'RH') : []),
      });
    }
    if (has(c => c.variants.some(v => v.vc === 'RH'))) {
      groups.push({
        key: '__rh__', label: 'Reverse Holos', icon: '⚡',
        picker: card => card.variants.filter(v => v.vc === 'RH'),
      });
    }
    if (lbTier === 'special_set_base' && has(c => c.variants.some(v => BALL_VARIANT_SET.has(v.vc)))) {
      groups.push({
        key: '__balls__', label: 'Poke Balls', icon: '⬤',
        picker: card => card.variants.filter(v => BALL_VARIANT_SET.has(v.vc)),
      });
    }
    // Future-proofing (see comment above PATTERN_VARIANT_SET): if a special
    // variant ever gets added to Base Set/Special Set Base's own variant
    // scope for some set, it surfaces here automatically too.
    if (hasPattern) {
      groups.push({
        key: '__pattern__', label: 'Special Variants', icon: '✨',
        picker: card => card.variants.filter(v => PATTERN_VARIANT_SET.has(v.vc)),
      });
    }

    return groups;
  }, [tierFilteredSorted, lbTier]);

  // ── CSV export handlers ──────────────────────────────────────────────
  // Resolves the logged-in customer's display name + email once (cached in
  // `profile` state) for the "Customer:" line on exports/print sheets.
  // Guests (no token) fall back to "Guest" rather than hitting the API.
  const getCustomerInfo = async (): Promise<{ name: string; email: string }> => {
    const token = localStorage.getItem('access_token');
    if (!token) return { name: 'Guest', email: '' };
    if (profile) {
      return { name: `${profile.first_name} ${profile.last_name}`.trim() || profile.username, email: profile.email || '' };
    }
    try {
      const res = await authFetch('/api/auth/profile/');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        return { name: `${data.first_name} ${data.last_name}`.trim() || data.username, email: data.email || '' };
      }
    } catch {}
    return { name: 'Guest', email: '' };
  };

  // Michael, 2026-09-11: "Can we add the option to print the different sets
  // out ... print out the Broke set, Base Set" -- these exports used to
  // always walk `sorted` (every card in the set, full variant scope),
  // ignoring whatever tier tab was selected -- so "Print" from the Base Set
  // tab and "Print" from Full Master produced the exact same CSV/pull
  // sheet. Switched to `tierFilteredSorted`, the same tier-scoped list
  // already driving the on-screen grid (see its own comment above), so
  // every export -- CSV, Full List, Needed List -- matches whichever tier
  // is currently selected. Filenames/titles below now say which tier too,
  // so two exports for the same set don't look identical or overwrite each
  // other on disk.
  const tierLabel = TIER_LABELS_FE[lbTier] || lbTier;

  const exportFullListCsv = async () => {
    const { name, email } = await getCustomerInfo();
    const rows: string[][] = [];
    tierFilteredSorted.forEach(card => {
      card.variants.forEach(v => {
        const key = card.num + '_' + v.vc;
        rows.push([card.num, card.name, card.rarity, VARIANT_LABEL_FULL[v.vc] || v.vc, checks[key] ? 'Yes' : 'No']);
      });
    });
    const meta = [['Customer', email ? `${name} (${email})` : name], ['Set', `${set.name} (${code})`], ['Tier', tierLabel], []];
    const tierSlug = lbTier.replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`${code}_${tierSlug}_collection.csv`, ['Card #', 'Name', 'Rarity', 'Variant', 'Highlighted'], rows, meta);
  };

  const buildFullRows = (): PullSheetRow[] => {
    const rows: PullSheetRow[] = [];
    tierFilteredSorted.forEach(card => {
      card.variants.forEach(v => {
        const key = card.num + '_' + v.vc;
        rows.push({ num: card.num, name: card.name, variant: VARIANT_LABEL_FULL[v.vc] || v.vc, highlighted: !!checks[key] });
      });
    });
    return rows;
  };

  const buildNeededRows = (): PullSheetRow[] => {
    const rows: PullSheetRow[] = [];
    tierFilteredSorted.forEach(card => {
      card.variants.forEach(v => {
        const key = card.num + '_' + v.vc;
        if (!checks[key]) rows.push({ num: card.num, name: card.name, variant: VARIANT_LABEL_FULL[v.vc] || v.vc });
      });
    });
    return rows;
  };

  // openPullSheet now imported from @/lib/pullSheet (2026-09-11).

  // Opens the branded, landscape, multi-column pull sheet (see
  // buildPullSheetHtml above) in a new tab -- Michael, 2026-09-02: "must it
  // be changed to pdf to match My Pull Sheets?" -- so it matches the staff
  // Pull Sheet look and can be saved as a PDF via the browser's own Print
  // dialog, same as every other printable page on the site.
  const printNeededPullSheet = async () => {
    const needed = buildNeededRows();
    if (needed.length === 0) { alert("You're not missing anything from this set!"); return; }
    const { name, email } = await getCustomerInfo();
    openPullSheet(buildPullSheetHtml({ title: `Needed List — ${tierLabel}`, setName: set.name, setCode: code, customerName: name, customerEmail: email, rows: needed, showHighlighted: false }));
  };

  // Same pull sheet, but the WHOLE set with a Have/Missing column instead of
  // just what's missing -- Michael, 2026-09-02: "make all printable, I want
  // people to have something presentable".
  const printFullListPullSheet = async () => {
    const all = buildFullRows();
    const { name, email } = await getCustomerInfo();
    openPullSheet(buildPullSheetHtml({ title: `Full List — ${tierLabel}`, setName: set.name, setCode: code, customerName: name, customerEmail: email, rows: all, showHighlighted: true }));
  };

  const emailNeededList = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    const needed = buildNeededRows();
    if (needed.length === 0) { alert("You're not missing anything from this set!"); return; }
    setEmailingPullList(true);
    try {
      const res = await authFetch('/api/checklists/email-pull-list/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_set: code, set_name: set.name, rows: needed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        alert(err.error || 'Could not email the pull list — please try again.');
        return;
      }
      alert(`Your needed list for ${set.name} was emailed to Poke Bulk.`);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        router.push('/auth/login');
      } else {
        alert('Network error — could not email the pull list.');
      }
    } finally {
      setEmailingPullList(false);
    }
  };

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
        <button onClick={exportFullListCsv} style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>⬇ Full List CSV</button>
        <button onClick={printFullListPullSheet} style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>🖨 Full List Pull Sheet</button>
        <button onClick={printNeededPullSheet} style={{ background: '#1e1e2a', color: '#a0a0b0', border: '1px solid #2a2a3a', padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>🖨 Needed List Pull Sheet</button>
        <button onClick={emailNeededList} disabled={emailingPullList} style={{ background: 'transparent', color: eraColor, border: `1px solid ${eraColor}`, padding: '7px 13px', borderRadius: '7px', fontSize: '12px', cursor: emailingPullList ? 'default' : 'pointer', opacity: emailingPullList ? 0.6 : 1 }}>{emailingPullList ? 'Emailing…' : '✉ Email Needed List to Poke Bulk'}</button>
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
          Want to appear here? Set a display name and enable collection sharing in your <a href="/profile" style={{ color: eraColor }}>Profile</a>.
        </div>
      </div>

      {/* Legend + filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#555', flex: 1 }}>● C &nbsp;◆ UC &nbsp;★ R &nbsp;★H Holo &nbsp;★★ DR &nbsp;★i IR &nbsp;◇◇ UR &nbsp;★◇ SIR &nbsp;◈ MHR</span>
        {tierTabs.length > 1 && (
          <span style={{ fontSize: '11px', color: '#777' }}>
            Showing cards for:{' '}
            <span style={{ color: TIER_COLORS[lbTier] || eraColor, fontWeight: 700 }}>
              {TIER_LABELS_FE[lbTier] || lbTier}
            </span>
            {/* Michael, 2026-09-11: the "change in Leaderboard tabs above"
                part only makes sense on screen -- printed via the plain
                Print button (which prints whatever tier is currently
                selected here), it read like a broken instruction on paper.
                data-no-print hides just that clause when printing; the
                tier name itself stays so a printed sheet is still clearly
                labelled which list it is. */}
            <span data-no-print style={{ color: '#444' }}> — change in Leaderboard tabs above</span>
          </span>
        )}
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
      <>
        {/* "Select All" bulk row -- one pill per rarity tier actually present
            in this set (per Michael, 2026-09-16 round 3: "our breakdown of
            the set types, is the ultimate dictator of which Select all
            does!"), built by selectAllGroups above, plus a cross-cutting
            Reverse Holo pill. Each pill fills in solid the moment every
            targeted card is already owned, and tapping it again clears all
            of them (round 2: "the toggle 'Select All' must also Deselect if
            pushed again"). Logged-out visitors get sent to login, same as
            tapping any other checkbox. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#777', fontWeight: 600 }}>Select All:</span>
          {selectAllGroups.map(({ key, label, icon, picker }, i) => {
            const color = SELECT_GROUP_COLORS[i % SELECT_GROUP_COLORS.length];
            const active = isAllPickerOwned(picker);
            return (
              <button key={key} onClick={() => toggleAllByPicker(picker)}
                title={`${active ? 'Deselect' : 'Mark'} every ${label}${active ? '' : ' owned'}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 11px', borderRadius: '999px',
                  background: active ? color : '#1e1e2a',
                  border: `1.5px solid ${color}`, color: active ? '#12121a' : color,
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                <span style={{ fontSize: '12px' }}>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {tierFilteredSorted.map(card => {
            const allOwned = card.variants.every(v => checks[card.num + '_' + v.vc]);
            const noneOwned = card.variants.every(v => !checks[card.num + '_' + v.vc]);
            if (filter === 'missing' && allOwned) return null;
            if (filter === 'owned' && noneOwned) return null;
            const imgUrl = card.variants.reduce((found: string, v) => found || cardImages[v.pid] || '', '');
            // Tapping the card image itself still quick-catches its base
            // (Normal) print -- falls back to the card's first variant for
            // the rare case a card has no plain Normal print at all.
            const baseVariant = card.variants.find(v => v.vc === 'N') || card.variants[0];
            const baseKey = card.num + '_' + baseVariant.vc;
            return (
              <div key={card.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Card image */}
                <div style={{ position: 'relative', width: '100%' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={card.name} loading="lazy"
                      onClick={() => toggle(baseKey, baseVariant.zar)}
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
                        transition: 'opacity 0.2s', display: 'block', cursor: 'pointer' }} />
                  ) : (
                    <div onClick={() => toggle(baseKey, baseVariant.zar)}
                      style={{ width: '100%', paddingBottom: '140%', background: '#1e1e2a', borderRadius: '8px',
                      border: '1px solid #2a2a3a', position: 'relative', cursor: 'pointer' }}>
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        fontSize: '10px', color: '#555', textAlign: 'center', padding: '4px', width: '100%' }}>{card.name}</span>
                    </div>
                  )}
                  {code === 'PRIZEPACK' && (
                    <img
                      src="https://images.pokebulk.co.za/sets/symbols/prizepack_stamp.png"
                      alt="Play! Pokemon stamp"
                      style={{ position: 'absolute', top: '4px', left: '4px', width: '20px', height: '14px',
                        objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                    />
                  )}
                  {/* Variant chips overlaid directly on the card art --
                      Michael, 2026-09-16: "instead of having the selector
                      under card, have it on the card, so when you select
                      that variant, it turns into 'Caught'". Replaces both
                      the old below-image chip row AND the separate corner
                      checkmark badges -- each print's own chip now doubles
                      as its Caught indicator (same green as the Pokedex
                      page's Catch button), so there's one on-card control
                      per print instead of a control plus a separate status
                      dot. e.stopPropagation() keeps a chip tap from also
                      firing the image's own tap-to-catch above it. */}
                  <div style={{ position: 'absolute', left: '3px', right: '3px', bottom: '3px', display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap', zIndex: 5 }}>
                    {card.variants.map(v => {
                      const key = card.num + '_' + v.vc;
                      const owned = !!checks[key];
                      const vcColor: Record<string, string> = {
                        N: '#a0a0b0', RH: '#ff6b35', H: '#ffd700', ESH: '#1D9E75',
                        PB: '#e040fb', MB: '#7c4dff', LB: '#00bcd4',
                        FB: '#4caf50', QB: '#f44336', UB: '#2196f3',
                        DB: '#795548', TR: '#607d8b', SE: '#ff9800',
                        'HR-EX': '#e91e63',
                        EX: '#eab308', GX: '#3b82f6', V: '#9ca3af', VMAX: '#f43f5e',
                        VSTAR: '#f59e0b', RR: '#ec4899', RAD: '#f97316',
                      };
                      const col = vcColor[v.vc] || '#a0a0b0';
                      // Buy affordance (2026-08-12, Michael: "went customer
                      // goes to 'Grid View' please add the buy button for
                      // available stock!") -- now a tiny "+" inside the same
                      // chip instead of a separate button underneath, with
                      // its own stopPropagation so tapping it adds to the
                      // pile instead of toggling owned.
                      const canBuy = !owned && inStock.has(`${v.pid}_${v.vc}`);
                      return (
                        <div key={v.vc}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(key, v.zar); }}
                          title={owned ? `Caught -- ${v.vc} (tap to un-mark)` : `Mark ${v.vc} owned`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer',
                            background: owned ? '#16a34a' : 'rgba(10,10,16,0.82)',
                            border: `1.5px solid ${owned ? '#22c55e' : col}`,
                            borderRadius: '8px', padding: '2px 5px 2px 6px',
                            boxShadow: owned ? '0 0 0 1px #12121a' : undefined,
                          }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: owned ? '#eafff1' : col }}>{owned ? '✓' : v.vc}</span>
                            <span style={{ fontSize: '6px', color: owned ? '#c8f7d8' : '#888' }}>
                              {owned ? 'Caught' : (canBuy ? 'Buy' : (v.zar > 0 ? 'R' + v.zar.toFixed(0) : ''))}
                            </span>
                          </div>
                          {canBuy && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); buyCard(v.pid, v.vc, key, v.zar, card.name); }}
                              disabled={buying.has(key)}
                              title="Add to pile"
                              style={{ fontSize: '10px', fontWeight: 800, color: '#ff6b35', background: 'transparent', border: 'none', padding: 0, lineHeight: 1, cursor: buying.has(key) ? 'default' : 'pointer', opacity: buying.has(key) ? 0.5 : 1 }}>
                              {buying.has(key) ? '…' : '+'}
                            </button>
                          )}
                          {code === 'PRIZEPACK' && v.vc === 'H' && (
                            <span style={{ fontSize: '7px', color: '#CECBF6' }} title="Cosmos Holo">✦</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Card name */}
                <div style={{ fontSize: '9px', color: '#666', textAlign: 'center', margin: '3px 0 4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {card.num.split('/')[0]} · {card.name}
                </div>
              </div>
            );
          })}
        </div>
      </>
      )}

      {/* Card LIST view */}
      {viewMode === 'list' && (
      <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2px 5px' }}>
          {tierFilteredSorted.map(card => {
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
                        'HR-EX': '#e91e63',
                        EX: '#eab308', GX: '#3b82f6', V: '#9ca3af', VMAX: '#f43f5e',
                        VSTAR: '#f59e0b', RR: '#ec4899', RAD: '#f97316',
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
  const [ready, setReady] = useState(isChecklistCacheReady());

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
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>My Collection</h1>
          <p style={{ fontSize: '13px', color: '#555' }}>Track your collection across all 146 sets. Log in to save your progress to your account.</p>
        </div>
        {!ready ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Loading your collection progress...</div>
        ) : activeSet ? (
          <Checklist code={activeSet} onBack={closeSet} />
        ) : (
          <EraHome onOpen={openSet} />
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
