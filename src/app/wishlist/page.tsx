"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authFetch, api } from "@/lib/api";
import type { Card } from "@/lib/api";

const inputStyle = {
  width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a",
  borderRadius: "8px", padding: "10px 14px", color: "#fff",
  fontSize: "14px", boxSizing: "border-box" as const,
};

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

function CardRow({ card, actionLabel, onAction }: { card: Card; actionLabel: string; onAction: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px", padding: "10px",
      background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "10px", marginBottom: "10px",
    }}>
      <img
        src={card.image_small_url || card.image_url || "/placeholder-card.png"}
        alt={card.name}
        style={{ width: "44px", height: "60px", objectFit: "contain", borderRadius: "4px", background: "#0e0e16" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.name}
        </div>
        <div style={{ color: "#a0a0b0", fontSize: "12px" }}>
          {card.card_set?.name || ""} {card.price ? `• R${parseFloat(card.price).toFixed(2)}` : ""}
        </div>
      </div>
      <button
        onClick={onAction}
        style={{
          background: "transparent", border: "1px solid #2a2a3a", color: "#ff6b35",
          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);

  const loadWishlist = useCallback(async () => {
    try {
      const res = await authFetch("/api/auth/wishlist/");
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.products || []);
      }
    } catch {
      // authFetch throws SessionExpiredError if not logged in
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { router.push("/auth/login"); return; }
    loadWishlist();
  }, [loadWishlist, router]);

  const toggle = async (productId: number) => {
    try {
      await authFetch("/api/auth/wishlist/toggle/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      loadWishlist();
    } catch {
      // ignore -- next load will reflect real state either way
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get("/api/products/", { params: { search: query, in_stock: "true" } });
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const wishlistIds = new Set(wishlist.map((c) => c.id));

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: 0 }}>My Wishlist</h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "6px" }}>
            Cards you want — visible to other trainers if your{" "}
            <a href="/profile" style={{ color: "#ff6b35" }}>Community Profile</a> is public.
          </p>
        </div>

        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
            Add a card
          </p>
          <form onSubmit={search} style={{ display: "flex", gap: "8px", marginBottom: results.length ? "16px" : 0 }}>
            <input
              style={inputStyle}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by card name, set, artist…"
            />
            <button
              type="submit"
              style={{
                background: "#ff6b35", color: "#fff", border: "none", borderRadius: "8px",
                padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {searching ? "…" : "Search"}
            </button>
          </form>
          {results.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              actionLabel={wishlistIds.has(card.id) ? "✓ On wishlist" : "+ Add"}
              onAction={() => toggle(card.id)}
            />
          ))}
        </div>

        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
            My List ({wishlist.length})
          </p>
          {loading ? (
            <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
          ) : wishlist.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>Nothing here yet — search above to add cards.</p>
          ) : (
            wishlist.map((card) => (
              <CardRow key={card.id} card={card} actionLabel="Remove" onAction={() => toggle(card.id)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
