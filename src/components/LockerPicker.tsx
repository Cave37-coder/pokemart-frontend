"use client";
import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export interface PickedLocker { name: string; address: string; code: string; }
interface Hit { code: string; name: string; address: string; town: string; postal: string; type: string; }

// Pudo locker / kiosk picker (2026-10-28). Search by name, suburb, town or code; picking one saves the
// locker CODE as well as the name/address, which is what automatic Pudo bookings need. If the search is
// unavailable, or the customer's locker isn't listed, they can still type the details by hand (no code —
// staff then pick the locker before booking).
export default function LockerPicker({
  value, onChange, inputStyle, dark = true,
}: {
  value: PickedLocker;
  onChange: (v: PickedLocker) => void;
  inputStyle?: React.CSSProperties;
  dark?: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const muted = dark ? "#a0a0b0" : "#666";
  const text = dark ? "#fff" : "#111";
  const inp: React.CSSProperties = inputStyle || {
    width: "100%", background: dark ? "#12121a" : "#fff", border: "1px solid #2a2a3a", borderRadius: 8,
    padding: "9px 12px", color: text, fontSize: 13, boxSizing: "border-box",
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setBusy(true); setErr("");
      try {
        const res = await fetch(`${API_URL}/api/pudo/lockers/?q=${encodeURIComponent(q.trim())}`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setErr("Locker search is unavailable right now — you can type the details instead."); setManual(true); setHits([]); }
        else setHits(d.results || []);
      } catch { setErr("Locker search is unavailable right now — you can type the details instead."); setManual(true); }
      finally { setBusy(false); }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const picked = !!value.code && !!value.name;

  if (picked && !manual) {
    return (
      <div style={{ border: "1px solid #2e7d32", background: dark ? "rgba(46,125,50,.12)" : "#f0fff0", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ color: text, fontWeight: 700, fontSize: 13 }}>✓ {value.name} <span style={{ color: muted, fontWeight: 400 }}>({value.code})</span></div>
        <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>{value.address}</div>
        <button type="button" onClick={() => onChange({ name: "", address: "", code: "" })}
          style={{ marginTop: 8, background: "none", border: "1px solid #2a2a3a", color: muted, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
          Change locker
        </button>
      </div>
    );
  }

  return (
    <div>
      {!manual && (
        <>
          <input style={inp} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your Pudo locker or kiosk — e.g. Birchleigh, Sandton City, CG54" />
          {busy && <div style={{ color: muted, fontSize: 11, marginTop: 6 }}>Searching…</div>}
          {hits.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 240, overflowY: "auto", border: "1px solid #2a2a3a", borderRadius: 8 }}>
              {hits.map(h => (
                <button type="button" key={h.code}
                  onClick={() => { onChange({ name: h.name, address: h.address, code: h.code }); setQ(""); setHits([]); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: dark ? "#12121a" : "#fff", border: "none", borderBottom: "1px solid #2a2a3a", padding: "8px 12px", cursor: "pointer" }}>
                  <div style={{ color: text, fontSize: 13, fontWeight: 600 }}>{h.name} <span style={{ color: muted, fontWeight: 400 }}>({h.code}{h.type ? ` · ${h.type}` : ""})</span></div>
                  <div style={{ color: muted, fontSize: 11 }}>{h.address}</div>
                </button>
              ))}
            </div>
          )}
          {!busy && q.trim().length >= 2 && hits.length === 0 && !err && (
            <div style={{ color: muted, fontSize: 11, marginTop: 6 }}>No match — try the suburb, town or part of the name.</div>
          )}
        </>
      )}
      {err && <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 6 }}>{err}</div>}
      {manual && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 4 }}>Locker / Kiosk name</label>
            <input style={inp} value={value.name} onChange={e => onChange({ name: e.target.value, address: value.address, code: "" })} placeholder="e.g. Birchleigh North Mall" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 4 }}>Locker / Kiosk address</label>
            <input style={inp} value={value.address} onChange={e => onChange({ name: value.name, address: e.target.value, code: "" })} placeholder="e.g. Mooifontein Rd, Birchleigh North" />
          </div>
        </div>
      )}
      <button type="button" onClick={() => setManual(m => !m)}
        style={{ marginTop: 8, background: "none", border: "none", color: "#ff6b35", fontSize: 11, cursor: "pointer", padding: 0 }}>
        {manual ? "← Back to locker search" : "Can't find it? Type the details instead"}
      </button>
    </div>
  );
}
