'use client';

import { useState } from "react";
import { Card } from "@/lib/api";

export default function AddToPileButton({ card }: { card: Card }) {
  const [added, setAdded] = useState(false);

  const addToPile = () => {
    const pile = JSON.parse(localStorage.getItem("pile") || "[]");
    const existing = pile.find((item: { id: number }) => item.id === card.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      pile.push({ id: card.id, pb_id: card.pb_id, name: card.name, price: card.price, image_url: card.image_url, quantity: 1 });
    }
    localStorage.setItem("pile", JSON.stringify(pile));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={addToPile}
      disabled={!card.in_stock}
      style={{
        width: "100%",
        background: added ? "#4ade80" : card.in_stock ? "#ff6b35" : "#2a2a3a",
        color: "#fff", border: "none", borderRadius: "12px",
        padding: "16px", fontSize: "16px", fontWeight: 700,
        cursor: card.in_stock ? "pointer" : "not-allowed",
        marginBottom: "20px", transition: "background 0.2s",
      }}
    >
      {added ? "Added to your Pile!" : card.in_stock ? "Add to my Pile!" : "Out of Stock"}
    </button>
  );
}
