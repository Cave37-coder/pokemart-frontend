"use client";
// Public calendar (2026-10-30): where Michael will be (events, Gengar Games
// days) and the collection hours. Events are added in Django admin
// (Orders -> Calendar events); days marked "blocks collection" are closed
// for collection at checkout automatically.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CollectionCalendar, eventDates, fetchCollectionCalendar } from "@/lib/collectionCalendar";

const KIND_ICON: Record<string, string> = { event: "🎪", gengar: "👻", closed: "🚫" };

export default function CalendarPage() {
  const [cal, setCal] = useState<CollectionCalendar | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { fetchCollectionCalendar().then((c) => { setCal(c); setLoaded(true); }); }, []);

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: "0 1.5rem" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Calendar</h1>
      <p style={{ color: "#a0a0b0", fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>
        Where to find us at events and Gengar Games, plus the days we&apos;re away and can&apos;t do collections.
      </p>

      <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div style={{ fontWeight: 700, color: "#ff6b35", marginBottom: 8 }}>📍 Collection hours: Birchleigh North, Kempton Park</div>
        <div style={{ color: "#a0a0b0", fontSize: 14, lineHeight: 1.9 }}>
          Mon – Fri: {cal?.hours.weekday ?? "18:15–20:30"}<br />
          Sat – Sun: {cal?.hours.weekend ?? "10:00–16:00"}<br />
          <span style={{ fontSize: 13 }}>Pick your collection day at checkout. Need it sooner? <a href={cal?.whatsapp_link ?? "https://wa.me/27744886919"} target="_blank" rel="noreferrer" style={{ color: "#25D366" }}>WhatsApp {cal?.whatsapp ?? "074 488 6919"}</a> before ordering.</span>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>Coming up</h2>
      {!loaded ? (
        <div style={{ color: "#555", fontSize: 14 }}>Loading…</div>
      ) : !cal || cal.events.length === 0 ? (
        <div style={{ color: "#a0a0b0", fontSize: 14 }}>Nothing on the calendar right now. Collections are open as normal.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cal.events.map((e) => (
            <div key={e.id} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14 }}>
              <div style={{ fontSize: 26, flexShrink: 0 }}>{KIND_ICON[e.kind] ?? "📅"}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{e.title}</div>
                <div style={{ color: "#ff6b35", fontSize: 13, marginTop: 2 }}>
                  {eventDates(e)}{e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}
                </div>
                {e.venue && <div style={{ color: "#a0a0b0", fontSize: 13, marginTop: 2 }}>{e.venue}</div>}
                {e.details && <div style={{ color: "#a0a0b0", fontSize: 13, marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-line" }}>{e.details}</div>}
                {e.blocks_collection && <div style={{ color: "#EF9F27", fontSize: 12, marginTop: 6 }}>No collections from home on {e.start_date === e.end_date ? "this day" : "these days"}.</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <Link href="/cards" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>← Back to the cards</Link>
      </div>
    </div>
  );
}
