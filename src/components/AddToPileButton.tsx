"use client";
import { useState } from "react";
import { authFetch, SessionExpiredError } from "@/lib/api";

interface AddToPileButtonProps {
  productId: number;
  hasStock: boolean;
  size?: "sm" | "md";
  // Optional extras for GA4 event richness — pass these in from the card
  // page if available (price/name), otherwise the event still fires fine
  // with just productId.
  price?: number;
  name?: string;
}

// window.gtag is typed globally in src/lib/analytics.ts — no need to
// redeclare it here. (Two conflicting declarations of the same global,
// one here and one there, is what broke the last build.)

export default function AddToPileButton({ productId, hasStock, size = "md", price, name }: AddToPileButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleAdd = async () => {
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
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setError(data.error || "Failed to add");
      } else {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        // Dispatch event to update pile counter in nav
        window.dispatchEvent(new Event("pile-updated"));

        // GA4: this was missing entirely — fire add_to_cart so the funnel
        // (view_item -> add_to_cart -> begin_checkout -> purchase) has a
        // real middle step instead of skipping straight to checkout.
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "add_to_cart", {
            currency: "ZAR",
            value: price ?? 0,
            items: [
              {
                item_id: String(productId),
                item_name: name ?? String(productId),
                price: price ?? 0,
                quantity: 1,
              },
            ],
          });
        }
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setSessionExpired(true);
        setError("Your session expired — please log in again.");
      } else {
        setError("Network error");
      }
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

  if (sessionExpired) return (
    <div>
      <a href="/auth/login" style={{
        display:"block", width:"100%", boxSizing:"border-box", textAlign:"center",
        background:"#ff6b35", color:"#fff", border:"none", borderRadius:"6px",
        padding:pad, fontSize:fSize, fontWeight:600, textDecoration:"none",
      }}>
        Log in to add
      </a>
      <div style={{ color:"#EF4444", fontSize:"10px", marginTop:"4px" }}>{error}</div>
    </div>
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
