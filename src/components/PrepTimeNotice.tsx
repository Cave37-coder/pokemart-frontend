"use client";
// Order preparation time notice (2026-10-30). Michael: "pull a order
// preparation time from the database and have it on the landing page and
// check out page, updated daily, so it allows customers to have a realistic
// expectation". The number comes from GET /api/prep-time/ (pokemart-api
// orders/prep_time.py -- recalculated daily from real order history plus
// the current queue; Michael can override it in Django admin for events).
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface PrepTime {
  low_days: number;
  high_days: number;
  label: string;
  message: string;
  open_orders: number;
  updated_at: string | null;
}

function usePrepTime() {
  const [data, setData] = useState<PrepTime | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/api/prep-time/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.label) setData(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return data;
}

/** Landing page strip. Renders nothing until the figure has loaded. */
export function PrepTimeBanner() {
  const pt = usePrepTime();
  if (!pt) return null;
  return (
    <div style={{ background:"#12121a", borderBottom:"1px solid #2a2a3a", padding:"14px 2rem" }}>
      <div style={{ maxWidth:"900px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", flexWrap:"wrap", textAlign:"center", fontSize:"14px", color:"#a0a0b0" }}>
        <span style={{ fontSize:"18px" }}>⏱️</span>
        <span>
          Current order preparation time:{" "}
          <strong style={{ color:"#ff6b35" }}>{pt.label}</strong>
          {" "}· we&apos;ll message you as soon as your order is ready.
        </span>
        {pt.message && <span style={{ width:"100%", color:"#EF9F27", fontSize:"13px" }}>{pt.message}</span>}
      </div>
    </div>
  );
}

/** Checkout notice, worded for collection vs Pudo delivery. */
export function PrepTimeCheckout({ courier }: { courier: boolean }) {
  const pt = usePrepTime();
  if (!pt) return null;
  return (
    <div style={{ background:"#ff6b3512", border:"1px solid #ff6b3540", borderRadius:8, padding:"10px 12px", marginTop:12, fontSize:12, color:"#a0a0b0", lineHeight:1.6 }}>
      <div style={{ color:"#fff", fontWeight:600, marginBottom:2 }}>
        ⏱️ Preparation time: <span style={{ color:"#ff6b35" }}>{pt.label}</span>
      </div>
      {courier
        ? <>Your parcel goes to Pudo once it&apos;s packed. Pudo delivery time is on top of this.</>
        : <>We&apos;ll message you when your order is ready for collection. Please give us 24 hours&apos; notice before you come.</>}
      {pt.message && <div style={{ color:"#EF9F27", marginTop:4 }}>{pt.message}</div>}
    </div>
  );
}
