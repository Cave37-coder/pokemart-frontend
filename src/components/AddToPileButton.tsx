"use client";
import { useState } from "react";

interface AddToPileButtonProps {
  productId: number;
  hasStock: boolean;
  size?: "sm" | "md";
}

export default function AddToPileButton({ productId, hasStock, size = "md" }: AddToPileButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
      const res = await fetch(`${API_URL}/api/cart/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (res.status === 401) { window.location.href = "/auth/login"; return; }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add");
      } else {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        // Dispatch event to update pile counter in nav
        window.dispatchEvent(new Event("pile-updated"));
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const pad = size === "sm" ? "6px" : "10px";
  const fSize = size === "sm" ? "11px" : "13px";

  if (!hasStock) return (
    <button disabled style={{ width:"100%", background:"#1e1e2a", color:"#555", border:"1px solid #2a2a3a", borderRadius:"6px", padding:pad, fontSize:fSize, fontWeight:600, cursor:"not-allowed" }}>
      Out of Stock
    </button>
  );

  return (
    <div>
      <button
        onClick={handleAdd}
        disabled={loading}
        style={{
          width:"100%",
          background: added ? "#10B981" : loading ? "#cc5522" : "#ff6b35",
          color:"#fff", border:"none", borderRadius:"6px",
          padding:pad, fontSize:fSize, fontWeight:600, cursor:"pointer",
          transition:"background 0.2s",
        }}>
        {loading ? "Adding..." : added ? "Added to Pile!" : "Add to my Pile"}
      </button>
      {error && <div style={{ color:"#EF4444", fontSize:"10px", marginTop:"4px" }}>{error}</div>}
    </div>
  );
}
