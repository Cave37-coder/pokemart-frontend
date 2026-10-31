"use client";
// Staff Calendar (2026-10-31). Michael: "can't you add to site, under staff?"
// Add / edit / delete event and Gengar Games days without Django admin.
// Same data as Admin -> Orders -> Calendar events (pokemart-api
// CalendarEvent). Days with "blocks collection" ticked are closed on the
// checkout collection-day picker; "public" ones show on /calendar.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";

interface CalEvent {
  id: number; title: string; kind: string; kind_display: string;
  start_date: string; end_date: string | null; start_time: string | null; end_time: string | null;
  venue: string; details: string; blocks_collection: boolean; public: boolean;
}
type Draft = Omit<CalEvent, "id" | "kind_display">;

const KINDS: [string, string, string][] = [
  ["event", "Event (away)", "#7c2d12"],
  ["gengar", "Gengar Games", "#4c1d95"],
  ["closed", "Closed / unavailable", "#374151"],
];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const EMPTY: Draft = { title: "", kind: "event", start_date: today(), end_date: null, start_time: null, end_time: null, venue: "", details: "", blocks_collection: true, public: true };
const PRESETS: { label: string; draft: Partial<Draft> }[] = [
  { label: "👻 Gengar Games day", draft: { title: "Gengar Games", kind: "gengar", venue: "Gengar Games, Benoni", start_time: "10:00" } },
  { label: "🎪 Event", draft: { kind: "event" } },
  { label: "🚫 Day off", draft: { title: "Unavailable", kind: "closed", public: false } },
];

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const btnDanger: React.CSSProperties = { ...btn, color: "#EF4444", borderColor: "#7a2a2a" };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 11, color: "#a0a0b0", display: "block", marginBottom: 4 };

const day = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = (iso: string) => day(iso).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const hm = (t: string | null) => (t ? t.slice(0, 5) : "");

function EventForm({ initial, onSaved, onCancel }: { initial: Draft & { id?: number }; onSaved: () => void; onCancel: () => void; }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!d.title.trim()) { setErr("Please give it a title."); return; }
    setSaving(true); setErr("");
    try {
      const body = { ...d, end_date: d.end_date || null, start_time: d.start_time || null, end_time: d.end_time || null };
      const res = await authFetch(d.id ? `/api/calendar/admin/${d.id}/` : "/api/calendar/admin/", {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(Object.entries(j).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" · ") || "Save failed.");
        return;
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof SessionExpiredError ? "Session expired. Please log in again." : "Save failed.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ ...card, borderColor: "#ff6b35" }}>
      {!d.id && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {PRESETS.map((p) => <button key={p.label} style={btn} onClick={() => setD((x) => ({ ...x, ...p.draft }))}>{p.label}</button>)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Title</label>
          <input style={inp} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Collect-a-Con" />
        </div>
        <div>
          <label style={lbl}>Kind</label>
          <select style={inp} value={d.kind} onChange={(e) => set("kind", e.target.value)}>
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Venue (optional)</label>
          <input style={inp} value={d.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Gengar Games, Benoni" />
        </div>
        <div>
          <label style={lbl}>Start date</label>
          <input type="date" style={inp} value={d.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>End date (blank = one day)</label>
          <input type="date" style={inp} value={d.end_date || ""} min={d.start_date} onChange={(e) => set("end_date", e.target.value || null)} />
        </div>
        <div>
          <label style={lbl}>Start time (optional)</label>
          <input type="time" style={inp} value={hm(d.start_time)} onChange={(e) => set("start_time", e.target.value || null)} />
        </div>
        <div>
          <label style={lbl}>End time (blank = till late)</label>
          <input type="time" style={inp} value={hm(d.end_time)} onChange={(e) => set("end_time", e.target.value || null)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Details for customers (optional)</label>
          <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={d.details} onChange={(e) => set("details", e.target.value)} placeholder="e.g. Come say hi! League Challenge from 10:00." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, fontSize: 13, color: "#ddd" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={d.blocks_collection} onChange={(e) => set("blocks_collection", e.target.checked)} /> No collections these day(s)
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={d.public} onChange={(e) => set("public", e.target.checked)} /> Show on website calendar
        </label>
      </div>
      {err && <div style={{ color: "#EF4444", fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : d.id ? "Save changes" : "Add to calendar"}</button>
        <button style={btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function StaffCalendarPage() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<(Draft & { id?: number }) | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      setIsStaff(!!(user && (user.is_staff || user.is_superuser)));
    } catch { setIsStaff(false); }
  }, []);

  const load = useCallback(() => {
    authFetch(`/api/calendar/admin/${showPast ? "?past=1" : ""}`)
      .then((r) => r.json())
      .then((d) => { setEvents(Array.isArray(d) ? d : []); setError(""); })
      .catch((e) => setError(e instanceof SessionExpiredError ? "Session expired. Please log in again." : "Failed to load the calendar."));
  }, [showPast]);
  useEffect(() => { if (isStaff) load(); }, [isStaff, load]);

  const remove = async (ev: CalEvent) => {
    if (!window.confirm(`Delete "${ev.title}" on ${fmt(ev.start_date)}?`)) return;
    const res = await authFetch(`/api/calendar/admin/${ev.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) load(); else setError("Delete failed.");
  };

  if (isStaff === null) return null;
  if (!isStaff) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ color: "#a0a0b0", marginBottom: 16 }}>Staff access only.</div>
        <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "32px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>📅 Calendar</h1>
          {!editing && <button style={btnPrimary} onClick={() => setEditing({ ...EMPTY, start_date: today() })}>+ Add date</button>}
        </div>
        <p style={{ color: "#a0a0b0", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
          Events, Gengar Games days and days off. Days marked &quot;no collections&quot; are closed on the checkout collection-day picker straight away.
          {" "}<Link href="/calendar" style={{ color: "#ff6b35" }}>View public calendar →</Link>
        </p>

        {editing && (
          <div style={{ marginBottom: 20 }}>
            <EventForm key={editing.id ?? "new"} initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
          </div>
        )}

        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#ccc", marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past dates too
        </label>

        {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {!events ? (
          <div style={{ color: "#555", fontSize: 13 }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ ...card, color: "#a0a0b0", fontSize: 13 }}>Nothing on the calendar. Collections are open every day.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((ev) => {
              const k = KINDS.find(([kk]) => kk === ev.kind);
              const multi = ev.end_date && ev.end_date !== ev.start_date;
              return (
                <div key={ev.id} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ color: "#fff", fontSize: 14 }}>{ev.title}</strong>
                      <span style={{ background: k?.[2] ?? "#333", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{ev.kind_display}</span>
                      {ev.blocks_collection && <span style={{ color: "#EF9F27", fontSize: 11 }}>No collections</span>}
                      {!ev.public && <span style={{ color: "#777", fontSize: 11 }}>Hidden from website</span>}
                    </div>
                    <div style={{ color: "#ff6b35", fontSize: 13, marginTop: 4 }}>
                      {fmt(ev.start_date)}{multi ? ` – ${fmt(ev.end_date!)}` : ""}
                      {ev.start_time ? ` · ${hm(ev.start_time)}${ev.end_time ? `–${hm(ev.end_time)}` : " till late"}` : ""}
                    </div>
                    {ev.venue && <div style={{ color: "#a0a0b0", fontSize: 12, marginTop: 2 }}>{ev.venue}</div>}
                    {ev.details && <div style={{ color: "#777", fontSize: 12, marginTop: 4, whiteSpace: "pre-line" }}>{ev.details}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={btn} onClick={() => { setEditing({ ...ev }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                    <button style={btnDanger} onClick={() => remove(ev)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
