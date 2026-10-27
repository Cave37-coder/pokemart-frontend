"use client";
// Store credit balance + history on the customer's profile (2026-10-27).
// Credit comes from selling cards/products to PokeBulk (buying invoice paid
// out as store credit) and is used at checkout or in store. Hidden entirely
// for customers who have never had any credit.
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface CreditRow {
  id: number; date: string; amount: string; kind: string; kind_display: string;
  reference: string; order_id: number | null; balance_after: string;
}

export default function StoreCreditPanel({ sectionStyle }: { sectionStyle: React.CSSProperties }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/api/auth/store-credit/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBalance(parseFloat(d.balance) || 0);
        setRows(d.transactions || []);
      })
      .catch(() => {});
  }, []);

  if (balance === null || (balance === 0 && rows.length === 0)) return null;

  return (
    <div style={sectionStyle}>
      <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>
        Store Credit
      </p>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>R {balance.toFixed(2)}</div>
        <div style={{ fontSize: 12, color: "#a0a0b0" }}>Use it at checkout or in store. Unused credit stays on your account.</div>
      </div>
      {rows.length > 0 && (
        <>
          <button onClick={() => setOpen((o) => !o)}
            style={{ marginTop: 12, background: "none", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
            {open ? "Hide history" : `Show history (${rows.length})`}
          </button>
          {open && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((r) => {
                const amt = parseFloat(r.amount);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, borderBottom: "1px solid #2a2a3a", paddingBottom: 6 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#ddd" }}>{r.kind_display}{r.reference && <span style={{ color: "#888" }}> · {r.reference}</span>}</div>
                      <div style={{ color: "#555", fontSize: 11 }}>{new Date(r.date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ color: amt >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>{amt >= 0 ? "+" : "-"}R {Math.abs(amt).toFixed(2)}</div>
                      <div style={{ color: "#555", fontSize: 11 }}>balance R {parseFloat(r.balance_after).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
