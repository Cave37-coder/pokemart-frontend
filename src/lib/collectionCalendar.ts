// Collection calendar (2026-10-30) -- shared fetch + types for the checkout
// date picker and the public /calendar page. Data: GET /api/collection-calendar/
// (pokemart-api orders/schedule.py).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export interface CollectionDay { date: string; open: boolean; hours: string; reason: string; }
export interface CalendarEvent {
  id: number; title: string; kind: string; kind_display: string;
  start_date: string; end_date: string; start_time: string | null; end_time: string | null;
  venue: string; details: string; blocks_collection: boolean;
}
export interface CollectionCalendar {
  earliest: string; days: CollectionDay[];
  hours: { weekday: string; weekend: string };
  whatsapp: string; whatsapp_link: string;
  events: CalendarEvent[];
}

export async function fetchCollectionCalendar(): Promise<CollectionCalendar | null> {
  try {
    const r = await fetch(`${API_URL}/api/collection-calendar/`, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// "2026-11-03" -> Date at local midnight (avoids the UTC off-by-one of new Date("YYYY-MM-DD")).
export const parseDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  parseDay(iso).toLocaleDateString("en-ZA", opts);
export const eventDates = (e: CalendarEvent) =>
  e.start_date === e.end_date ? fmtDay(e.start_date, { weekday: "long", day: "numeric", month: "long" })
    : `${fmtDay(e.start_date)} – ${fmtDay(e.end_date)}`;
