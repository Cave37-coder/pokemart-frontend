"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface Bundle {
  id: number;
  name: string;
  price: string;
  stock: number;
  in_stock: boolean;
  image_url: string;
  image_small_url: string;
  description: string;
  card_set: {
    code: string;
    name: string;
    symbol_url: string;
    logo_url: string;
    era_name: string;
    release_date: string;
  };
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [era, setEra] = useState("");
  const [eras, setEras] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/products/?category_slug=bundles&page_size=200&ordering=card_set__release_date`)
      .then(r => r.json())
      .then(d => {
        const results = d.results || [];
        setBundles(results);
        const uniqueEras = [...new Set(results.map((b: Bundle) => b.card_set?.era_name).filter(Boolean))] as string[];
        setEras(uniqueEras);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = era ? bundles.filter(b => b.card_set?.era_name === era) : bundles;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
          Complete Set Bundles
        </h1>
        <p style={{ color: "#a0a0b0", fontSize: 15, margin: 0 }}>
          Get a complete set in one go — every card you need, sorted and ready.
        </p>
      </div>

      {/* Era filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        <button onClick={() => setEra("")} style={{
          background: era === "" ? "#ff6b35" : "#1a1a24",
          border: `1px solid ${era === "" ? "#ff6b35" : "#2a2a3a"}`,
          color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 13,
          cursor: "pointer", fontWeight: 600,
        }}>All Eras</button>
        {eras.map(e => (
          <button key={e} onClick={() => setEra(e)} style={{
            background: era === e ? "#ff6b35" : "#1a1a24",
            border: `1px solid ${era === e ? "#ff6b35" : "#2a2a3a"}`,
            color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 13,
            cursor: "pointer", fontWeight: 600,
          }}>{e}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: 60 }}>Loading bundles...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555", padding: 60 }}>No bundles available yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map(bundle => (
            <Link key={bundle.id} href={`/cards/${bundle.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12,
                overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#ff6b35")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a3a")}
              >
                {/* Set logo banner */}
                <div style={{
                  background: "#12121a", padding: "20px 16px", display: "flex",
                  alignItems: "center", justifyContent: "center", minHeight: 100,
                  position: "relative",
                }}>
                  {bundle.image_url || bundle.card_set?.logo_url ? (
                    <img
                      src={bundle.image_url || bundle.card_set?.logo_url}
                      alt={bundle.card_set?.name}
                      style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : bundle.card_set?.symbol_url ? (
                    <img
                      src={bundle.card_set.symbol_url}
                      alt={bundle.card_set.name}
                      style={{ height: 60, objectFit: "contain", opacity: 0.8 }}
                    />
                  ) : (
                    <div style={{ fontSize: 32 }}>📦</div>
                  )}
                  {/* Era badge */}
                  {bundle.card_set?.era_name && (
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      background: "#ff6b3522", border: "1px solid #ff6b3544",
                      color: "#ff6b35", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                    }}>{bundle.card_set.era_name}</div>
                  )}
                  {!bundle.in_stock && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "#EF444422", border: "1px solid #EF4444",
                      color: "#EF4444", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                    }}>Out of Stock</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>
                    {bundle.card_set?.name || bundle.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>
                    Complete Bundle
                    {bundle.card_set?.release_date && ` · ${new Date(bundle.card_set.release_date).getFullYear()}`}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#ff6b35" }}>
                    {parseFloat(bundle.price) > 0 ? `R ${parseFloat(bundle.price).toFixed(2)}` : "Price on request"}
                  </div>
                  {bundle.stock > 0 && (
                    <div style={{ fontSize: 11, color: "#10B981", marginTop: 4 }}>
                      {bundle.stock} available
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
