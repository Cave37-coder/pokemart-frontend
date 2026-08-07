"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface Accessory {
  id: number;
  sku: string;
  name: string;
  category: string;
  manufacturer: string;
  description: string;
  image_url: string;
  price: string;
  stock: number;
  in_stock: boolean;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "sleeves", label: "Card Sleeves" },
  { value: "deck_boxes", label: "Deck Boxes" },
  { value: "storage_tins", label: "Card Storage Tins" },
  { value: "life_counters", label: "Life Counters" },
  { value: "playmats", label: "Playmats" },
  { value: "protective_pages", label: "Protective Pages" },
  { value: "storage_albums", label: "Storage Albums" },
  { value: "collectible_storage", label: "Collectible Storage" },
  { value: "supply_bundles", label: "Supply Bundles" },
  { value: "supplies", label: "Supplies" },
  { value: "other", label: "Other" },
];

export default function AccessoriesPage() {
  const [items, setItems] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("search", q);
    fetch(`${API_URL}/api/accessories/?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(data.results || data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category, q]);

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: 0 }}>Accessories</h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "6px" }}>
            Sleeves, deck boxes, playmats, storage &amp; more — only showing what&apos;s currently in stock.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accessories…"
            style={{
              flex: "1 1 220px", background: "#1a1a2e", border: "1px solid #2a2a3a",
              borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box",
            }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: "8px",
              padding: "10px 14px", color: "#fff", fontSize: "14px",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
            <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
              No accessories in stock right now — check back soon!
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            {items.map((a) => (
              <div key={a.id} style={{
                background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px",
                padding: "16px", display: "flex", flexDirection: "column", gap: "10px",
              }}>
                <div style={{
                  width: "100%", aspectRatio: "1", background: "#0e0e16", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ color: "#333", fontSize: "32px" }}>🎴</span>
                  )}
                </div>
                <div>
                  <div style={{ color: "#fff", fontSize: "13px", fontWeight: 600, lineHeight: 1.3 }}>{a.name}</div>
                  {a.manufacturer && <div style={{ color: "#a0a0b0", fontSize: "11px", marginTop: "2px" }}>{a.manufacturer}</div>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                  <span style={{ color: "#ff6b35", fontSize: "16px", fontWeight: 700 }}>R{parseFloat(a.price).toFixed(2)}</span>
                  <span style={{ color: "#66cc66", fontSize: "11px", fontWeight: 600 }}>{a.stock} in stock</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
