// checklistShared.ts -- extracted 2026-09-16 from app/checklists/page.tsx so the
// new mobile-first drill-down pages (era home -> era detail -> set detail,
// Michael: "I want to change 'My Collection' page structure, people are using
// mostly on their phones, so i want it to show up as images ... Even if it
// means running more pages") can all read/write the SAME in-memory checklist
// cache instead of each page defining its own module-level `checklistCache`
// singleton (which would silently desync progress bars between pages -- the
// era list showing one % while the set page you just came from shows
// another, for the exact same account). Anything that touches
// checklistCache/loadChecks/saveChecks/ensureChecklistData/getProgress now
// lives here once; app/checklists/page.tsx and app/checklists/[era]/page.tsx
// both import from this module.
import { authFetch } from '@/lib/api';
import { SETS } from '@/lib/checklistData';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pokemart-api-production.up.railway.app';

// Michael, 2026-08-08: the Era table (products/models.py) has legacy
// duplicate rows per era and inconsistent naming -- some end in "Era"
// ("Sword & Shield Era"), some don't ("HG&SS"), and this page's own labels
// don't consistently match either convention. Normalizing both sides before
// comparing (trim, lowercase, drop a trailing " era") means a saved logo_url
// shows up regardless of which of the duplicate rows or naming style it was
// set on, instead of requiring a byte-for-byte string match.
export function normalizeEraName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+era$/, '').replace(/\s+/g, ' ');
}

// Checklist progress lives in the customer's account (ChecklistEntry rows on
// the backend), not the browser -- checklistCache is a simple in-memory
// mirror of the account's checked cards, fetched once per page load via
// ensureChecklistData() and kept in sync as the customer ticks boxes.
let checklistCache: Record<string, Record<string, boolean>> = {};
let checklistCacheReady = false;

export function isChecklistCacheReady(): boolean {
  return checklistCacheReady;
}

export function loadChecks(code: string): Record<string, boolean> {
  return checklistCache[code] || {};
}
export function saveChecks(code: string, checks: Record<string, boolean>) {
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

// Fetches every checked card for the logged-in customer, once per page load
// (shared across whichever checklist page -- home/era/set -- mounts first).
// Guests (no access_token) just get an empty checklist -- toggling prompts
// them to log in, same pattern as My Pile.
export async function ensureChecklistData(): Promise<void> {
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

export function getProgress(code: string) {
  const set = SETS[code]; if (!set) return { owned: 0, total: 0, pct: 0, collectionZar: 0 };
  const checks = loadChecks(code);
  let owned = 0, total = 0, collectionZar = 0;
  set.cards.forEach(c => c.variants.forEach(v => {
    total++;
    if (checks[c.num + '_' + v.vc]) { owned++; collectionZar += v.zar; }
  }));
  return { owned, total, pct: total ? Math.round(owned / total * 100) : 0, collectionZar };
}

export function fmt(zar: number) { return 'R ' + zar.toFixed(2); }

// ── Era <-> URL slug ─────────────────────────────────────────────────────
// New 2026-09-16, for the /checklists/[era] drill-down route. Slugs are
// derived from the era NAME (the same string ERA_ORDER/SETS use as the era
// key everywhere else in this codebase) so no new id scheme has to be kept
// in sync with it -- lowercase, "&" -> "and", anything else non-alnum -> "-".
export function eraToSlug(era: string): string {
  return era
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Reverse lookup -- given a slug from the URL, find the matching era name out
// of a candidate list (normally ERA_ORDER). Returns null if nothing matches
// (a bad/hand-edited URL), so the page can fall back to the home screen.
export function eraFromSlug(slug: string, candidates: string[]): string | null {
  const target = slug.toLowerCase();
  return candidates.find(e => eraToSlug(e) === target) || null;
}
