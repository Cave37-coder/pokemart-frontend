'use client';
import { useState } from "react";
import { Card, authFetch, SessionExpiredError } from "@/lib/api";
import { trackAddToCart } from "@/lib/analytics";

export default function AddToPileButton({ card }: { card: Card }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const addToPile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/cart/add/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: card.id, quantity: 1 }),
      });
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("pile-updated"));
        trackAddToCart({
          item_id: card.sku || String(card.id),
          item_name: card.name,
          item_category: card.card_set?.code,
          price: parseFloat(card.price),
          quantity: 1,
        });
        setTimeout(() => setAdded(false), 2000);
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setError(data.error || "Failed to add — please try again.");
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setSessionExpired(true);
        setError("Your session expired — please log in again.");
      } else {
        setError("Network error — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (sessionExpired) {
    return (
      <div style={{ marginBottom: "20px" }}>
        <a href="/auth/login" style={{
          display: "block", width: "100%", boxSizing: "border-box", textAlign: "center",
          background: "#ff6b35", color: "#fff", border: "none", borderRadius: "12px",
          padding: "16px", fontSize: "16px", fontWeight: 700, textDecoration: "none",
        }}>
          Log in to add
        </a>
        <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <button
        onClick={addToPile}
        disabled={!card.in_stock || loading}
        style={{
          width: "100%",
          background: added ? "#4ade80" : card.in_stock ? "#ff6b35" : "#2a2a3a",
          color: "#fff", border: "none", borderRadius: "12px",
          padding: "16px", fontSize: "16px", fontWeight: 700,
          cursor: card.in_stock ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {added ? "Added to your Pile!" : loading ? "Adding..." : card.in_stock ? "Add to my Pile!" : "Out of Stock"}
      </button>
      {error && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{error}</div>}
    </div>
  );
}
