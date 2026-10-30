"use client";
// Checkout collection date picker (2026-10-30). Michael's rules live in the
// API (orders/schedule.py): earliest = 2 days or the prep time, whichever is
// longer; event / Gengar Games days closed; weekday 18:15-20:30, weekend
// 10:00-16:00. Or "No Rush". Anything sooner -> WhatsApp before ordering.
import { useEffect, useState } from "react";
import { CollectionCalendar, fetchCollectionCalendar, fmtDay, parseDay } from "@/lib/collectionCalendar";

export interface CollectionChoice { date: string; noRush: boolean; }

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CollectionDatePicker({ value, onChange }: { value: CollectionChoice; onChange: (v: CollectionChoice) => void; }) {
  const [cal, setCal] = useState<CollectionCalendar | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchCollectionCalendar().then((c) => (c ? setCal(c) : setFailed(true))); }, []);

  if (failed) return <div style={{ fontSize: 12, color: "#a0a0b0" }}>Couldn&apos;t load collection dates. Tick No Rush below, or WhatsApp us on 074 488 6919 to arrange a day.</div>;
  if (!cal) return <div style={{ fontSize: 12, color: "#555" }}>Loading collection dates…</div>;

  // Pad the first week so columns line up Mon..Sun.
  const firstDow = (parseDay(cal.days[0].date).getDay() + 6) % 7;
  const cells: (typeof cal.days[number] | null)[] = [...Array(firstDow).fill(null), ...cal.days];
  const selected = cal.days.find((d) => d.date === value.date);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, opacity: value.noRush ? 0.4 : 1 }}>
        {WEEKDAYS.map((w) => <div key={w} style={{ fontSize: 10, color: "#555", textAlign: "center", paddingBottom: 2 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`pad${i}`} />;
          const dt = parseDay(d.date);
          const isSel = !value.noRush && value.date === d.date;
          const isEvent = !d.open && d.reason && d.reason !== "too_soon";
          return (
            <button key={d.date} type="button" disabled={!d.open || value.noRush}
              title={d.open ? `Collect ${d.hours}` : isEvent ? `Closed: ${d.reason}` : "Too soon. WhatsApp us if you need it earlier"}
              onClick={() => onChange({ date: d.date, noRush: false })}
              style={{
                padding: "6px 0", borderRadius: 6, fontSize: 12, lineHeight: 1.2,
                cursor: d.open && !value.noRush ? "pointer" : "not-allowed",
                background: isSel ? "#ff6b35" : d.open ? "#12121a" : "transparent",
                border: `1px solid ${isSel ? "#ff6b35" : d.open ? "#2a2a3a" : "transparent"}`,
                color: isSel ? "#fff" : d.open ? "#ddd" : isEvent ? "#7a4a4a" : "#444",
                textDecoration: isEvent ? "line-through" : "none",
              }}>
              {dt.getDate() === 1 || i === firstDow ? <div style={{ fontSize: 9, color: isSel ? "#fff" : "#777" }}>{dt.toLocaleDateString("en-ZA", { month: "short" })}</div> : null}
              {dt.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "#a0a0b0", marginTop: 10, lineHeight: 1.6 }}>
        {selected && !value.noRush
          ? <>Collecting <strong style={{ color: "#fff" }}>{fmtDay(selected.date, { weekday: "long", day: "numeric", month: "long" })}</strong>, {selected.hours}</>
          : <>Weekdays {cal.hours.weekday} · Weekends {cal.hours.weekend}. Crossed-out days are event days.</>}
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, cursor: "pointer", fontSize: 13, color: "#ddd" }}>
        <input type="checkbox" checked={value.noRush} onChange={(e) => onChange({ date: e.target.checked ? "" : value.date, noRush: e.target.checked })} style={{ marginTop: 3 }} />
        <span><strong>No Rush</strong>: I&apos;m flexible. Let me know when it&apos;s ready and I&apos;ll collect when it suits us both.</span>
      </label>

      <div style={{ fontSize: 11, color: "#777", marginTop: 10 }}>
        Need it before {fmtDay(cal.earliest)}?{" "}
        <a href={cal.whatsapp_link} target="_blank" rel="noreferrer" style={{ color: "#25D366", fontWeight: 600 }}>WhatsApp Michael on {cal.whatsapp}</a> before placing your order.
      </div>
    </div>
  );
}
