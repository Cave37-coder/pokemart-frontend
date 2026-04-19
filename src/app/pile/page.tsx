'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

interface PileItem {
  id: number;
  pb_id: string;
  name: string;
  price: string;
  image_url: string;
  quantity: number;
}

export default function PilePage() {
  const [pile, setPile] = useState<PileItem[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("pile") || "[]");
    setPile(stored);
  }, []);

  const updateQuantity = (id: number, qty: number) => {
    const updated = qty <= 0
      ? pile.filter((item) => item.id !== id)
      : pile.map((item) => item.id === id ? { ...item, quantity: qty } : item);
    setPile(updated);
    localStorage.setItem("pile", JSON.stringify(updated));
  };

  const total = pile.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 2rem" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>My Pile</h1>
      <p style={{ color: "#a0a0b0", marginBottom: "32px" }}>{pile.length} item{pile.length !== 1 ? "s" : ""} in your pile</p>

      {pile.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "#1a1a24", borderRadius: "12px", border: "1px solid #2a2a3a" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🃏</div>
          <p style={{ color: "#a0a0b0", marginBottom: "20px" }}>Your pile is empty!</p>
          <Link href="/cards" style={{ background: "#ff6b35", color: "#fff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
            Browse Cards
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {pile.map((item) => (
              <div key={item.id} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ width: "60px", borderRadius: "6px" }} />
                ) : (
                  <div style={{ width: "60px", height: "80px", background: "#12121a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🃏</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>{item.name}</div>
                  <div style={{ color: "#a0a0b0", fontSize: "12px", marginBottom: "8px" }}>{item.pb_id}</div>
                  <div style={{ color: "#ff6b35", fontWeight: 700 }}>R {(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ background: "#2a2a3a", color: "#fff", border: "none", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px" }}>-</button>
                  <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 700 }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: "#2a2a3a", color: "#fff", border: "none", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px" }}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "18px", fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: "#ff6b35" }}>R {total.toFixed(2)}</span>
            </div>
            <button style={{ width: "100%", background: "#ff6b35", color: "#fff", border: "none", borderRadius: "10px", padding: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
              Proceed to Checkout
            </button>
            <Link href="/cards" style={{ display: "block", textAlign: "center", color: "#a0a0b0", textDecoration: "none", marginTop: "12px", fontSize: "14px" }}>
              Continue browsing
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
