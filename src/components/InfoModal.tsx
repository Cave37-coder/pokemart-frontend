"use client";
import { useState, useEffect } from "react";

export default function InfoModal() {
  const [show, setShow] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pb_info_seen") !== "1") {
      setShow(true);
    }
  }, []);

  const close = () => {
    if (dontShow) localStorage.setItem("pb_info_seen", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ff6b35", margin: 0 }}>Welcome to PokeBulk SA 👋</h2>
          <button onClick={() => setShow(false)} style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Conditions */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#ff6b35", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Card Conditions</h3>
          <div style={{ display: "grid", gap: "6px" }}>
            {([
              { cond: "NM", label: "Near Mint", desc: "Pack fresh, no visible wear", color: "#22c55e", price: "Full price" },
              { cond: "LP", label: "Lightly Played", desc: "Minor scratches or edge wear", color: "#eab308", price: "80% of NM" },
              { cond: "MP", label: "Moderately Played", desc: "Noticeable wear, still presentable", color: "#f97316", price: "60% of NM" },
              { cond: "HP", label: "Heavily Played", desc: "Significant wear, creases possible", color: "#ef4444", price: "35% of NM" },
              { cond: "DMG", label: "Damaged", desc: "Major damage, playable only", color: "#7f1d1d", price: "20% of NM" },
            ] as const).map(({ cond, label, desc, color, price }) => (
              <div key={cond} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#12121a", borderRadius: "6px", padding: "8px 12px" }}>
                <span style={{ background: color, color: "#fff", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "8px", minWidth: "36px", textAlign: "center" }}>{cond}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#ddd" }}>{label}</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>{desc}</div>
                </div>
                <span style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap" }}>{price}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#555", marginTop: "8px" }}>Played cards appear with a yellow tint next to their NM copy. Only shown when in stock.</p>
        </div>

        {/* Variants */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#ff6b35", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Card Variants</h3>
          <div style={{ display: "grid", gap: "6px" }}>
            {([
              { badge: "N", label: "Normal", desc: "Standard non-foil card", bg: "#e8e8e8", fg: "#333" },
              { badge: "H", label: "Holo", desc: "Holographic foil on artwork", bg: "#ffd700", fg: "#333" },
              { badge: "RH", label: "Reverse Holo", desc: "Foil on card border, not artwork", bg: "#c084fc", fg: "#fff" },
              { badge: "PB", label: "Pokéball", desc: "Special Pokéball stamp variant", bg: "#ef4444", fg: "#fff" },
            ] as const).map(({ badge, label, desc, bg, fg }) => (
              <div key={badge} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#12121a", borderRadius: "6px", padding: "8px 12px" }}>
                <span style={{ background: bg, color: fg, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "8px", minWidth: "36px", textAlign: "center" }}>{badge}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#ddd" }}>{label}</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: "20px", background: "#12121a", borderRadius: "8px", padding: "12px 14px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#ff6b35", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Pricing</h3>
          <p style={{ fontSize: "12px", color: "#aaa", margin: 0, lineHeight: 1.6 }}>
            All prices are based on <strong style={{ color: "#ddd" }}>TCGCSV market prices</strong> converted to ZAR.
            Prices are updated regularly. Contact us at <strong style={{ color: "#ff6b35" }}>enquiries@pokebulk.co.za</strong> for bulk order discounts.
          </p>
        </div>

        {/* How to order */}
        <div style={{ marginBottom: "24px", background: "#12121a", borderRadius: "8px", padding: "12px 14px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#ff6b35", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>How to Order</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              "Browse & add cards to your Pile 🃏",
              "Go to Checkout — choose delivery or collection",
              "Pay via PayFast, EFT, or Cash on Collection",
              "We pack & ship or you collect from Kempton Park",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ background: "#ff6b35", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "8px", minWidth: "20px", textAlign: "center" }}>{i + 1}</span>
                <span style={{ fontSize: "12px", color: "#aaa" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#666", cursor: "pointer" }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} style={{ accentColor: "#ff6b35" }} />
            Don&apos;t show again
          </label>
          <button onClick={close} style={{ background: "#ff6b35", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            Start Shopping!
          </button>
        </div>

      </div>
    </div>
  );
}
