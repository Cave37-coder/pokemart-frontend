'use client';
import { useState } from "react";
import { Card } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export default function AddToPileButton({ card }: { card: Card }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const addToPile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cart/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: card.id, quantity: 1 }),
      });
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("pile-updated"));
        setTimeout(() => setAdded(false), 2000);
      }
    } catch (e) {
      console.error("Failed to add to pile", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={addToPile}
      disabled={!card.in_stock || loading}
      style={{
        width: "100%",
        background: added ? "#4ade80" : card.in_stock ? "#ff6b35" : "#2a2a3a",
        color: "#fff", border: "none", borderRadius: "12px",
        padding: "16px", fontSize: "16px", fontWeight: 700,
        cursor: card.in_stock ? "pointer" : "not-allowed",
        marginBottom: "20px", transition: "background 0.2s",
      }}
    >
      {added ? "Added to your Pile!" : loading ? "Adding..." : card.in_stock ? "Add to my Pile!" : "Out of Stock"}
    </button>
  );
}
