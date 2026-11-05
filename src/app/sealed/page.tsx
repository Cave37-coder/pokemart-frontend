"use client";
// Sealed shop (2026-11-04/05, Michael: "sealed ... will soon become part of constant sales";
// "give set breakdown, too many products to be searched through ... product dropdown to ETB, Booster Bundle ...").
// Landing = set tiles (with logos); pick a set and/or a product type to see products. Add to Pile works like cards.
import { useEffect, useMemo, useState, useCallback } from "react";
import AddToPileButton from "@/components/AddToPileButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface Sealed {
  id: number; name: string; sealed_set_name: string; card_subtypes: string;
  image_url: string; price: string; stock: number; in_stock: boolean;
}
type Facet = { name: string; count: number };
type SetInfo = { name: string; logo_url: string; release_date?: string };

const input: React.CSSProperties = {
  background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: "8px",
  padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box",
};
const MISC = "Miscellaneous Cards & Products";

// "SV01: Scarlet & Violet Base Set" -> "scarletvioletbaseset" -- loose key to match TCGCSV group names to our set names
const norm = (s: string) => s.replace(/^[A-Za-z0-9]+:\s*/, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function SealedPage() {
  const [items, setItems] = useState<Sealed[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [setName, setSetName] = useState("");
  const [type, setType] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState("-created_at");
  const [sets, setSets] = useState<Facet[]>([]);
  const [types, setTypes] = useState<Facet[]>([]);
  const [siteSets, setSiteSets] = useState<SetInfo[]>([]);

  // our own set list: logos + release dates for the tiles
  useEffect(() => {
    fetch(`${API_URL}/api/sets/`).then((r) => r.json()).then((d) => setSiteSets((d.results || d) as SetInfo[])).catch(() => {});
  }, []);

  // facets: sets counted within the chosen type, types counted within the chosen set
  useEffect(() => {
    const p = new URLSearchParams();
    if (inStockOnly) p.set("in_stock", "1");
    if (setName) p.set("set", setName);
    if (type) p.set("type", type);
    fetch(`${API_URL}/api/sealed/facets/?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => { setSets(d.sets || []); setTypes(d.types || []); })
      .catch(() => {});
  }, [inStockOnly, setName, type]);

  const showProducts = !!(setName || q.trim() || type);

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ supertype: "Sealed", page_size: "48", ordering: sort });
    if (q.trim()) p.set("search", q.trim());
    if (setName) p.set("sealed_set", setName);
    if (type) p.set("sealed_type", type);
    if (inStockOnly) p.set("in_stock", "true");
    return `${API_URL}/api/products/?${p.toString()}`;
  }, [q, setName, type, inStockOnly, sort]);

  useEffect(() => {
    if (!showProducts) { setItems([]); setNext(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(buildUrl())
        .then((r) => r.json())
        .then((d) => { setItems(d.results || []); setNext(d.next || null); })
        .catch(() => { setItems([]); setNext(null); })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [buildUrl, showProducts]);

  const loadMore = () => {
    if (!next) return;
    fetch(next).then((r) => r.json()).then((d) => { setItems((x) => [...x, ...(d.results || [])]); setNext(d.next || null); }).catch(() => {});
  };

  // set tiles: match each sealed set to one of our sets for its logo + release date (newest first, Misc last)
  const tiles = useMemo(() => {
    const byKey = siteSets.map((s) => ({ key: norm(s.name), s }));
    const rows = sets.map((f) => {
      const k = norm(f.name);
      const hit = byKey.find((x) => x.key === k) || byKey.find((x) => k.length > 5 && x.key.length > 5 && (x.key.includes(k) || k.includes(x.key)));
      return { ...f, logo: hit?.s.logo_url || "", date: hit?.s.release_date || "" };
    });
    rows.sort((a, b) => {
      if (a.name === MISC) return 1;
      if (b.name === MISC) return -1;
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [sets, siteSets]);

  const totalProducts = sets.reduce((n, s) => n + s.count, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: 0 }}>Sealed Product</h1>
        <p style={{ color: "#777", fontSize: "13px", margin: "6px 0 18px" }}>
          Pick a set to see its boxes, bundles, packs and tins — or filter by product type across every set.
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sealed…" style={{ ...input, flex: "1 1 220px" }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...input, flex: "1 1 190px" }}>
            <option value="">All product types</option>
            {types.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
          </select>
          <select value={setName} onChange={(e) => setSetName(e.target.value)} style={{ ...input, flex: "1 1 220px" }}>
            <option value="">All sets</option>
            {sets.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
          </select>
          {showProducts && (
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={input}>
              <option value="-created_at">Newest</option>
              <option value="price">Price: low to high</option>
              <option value="-price">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          )}
          <button onClick={() => setInStockOnly((v) => !v)}
            style={{ ...input, cursor: "pointer", color: inStockOnly ? "#ff6b35" : "#a0a0b0", borderColor: inStockOnly ? "#ff6b35" : "#2a2a3a" }}>
            {inStockOnly ? "✓ " : ""}In stock only
          </button>
        </div>

        {!showProducts ? (
          tiles.length === 0 ? (
            <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
              <p style={{ color: "#777", fontSize: "13px", margin: 0 }}>
                {inStockOnly ? "Nothing in stock right now — untoggle “In stock only” to see everything we list." : "No sealed product listed yet."}
              </p>
            </div>
          ) : (
            <>
              <div style={{ color: "#777", fontSize: "12px", marginBottom: "10px" }}>{tiles.length} sets · {totalProducts} products</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px" }}>
                {tiles.map((t) => (
                  <button key={t.name} onClick={() => setSetName(t.name)}
                    style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px", padding: 0, cursor: "pointer", overflow: "hidden", textAlign: "center", color: "#e0e0e0" }}>
                    <div style={{ height: 110, background: "#e9e9ee22", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
                      {t.logo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={t.logo} alt={t.name} style={{ maxWidth: "90%", maxHeight: "100%", objectFit: "contain" }} />
                        : <span style={{ fontSize: 28 }}>📦</span>}
                    </div>
                    <div style={{ padding: "10px 8px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", minHeight: 34 }}>{t.name.replace(/^[A-Za-z0-9]+:\s*/, "")}</div>
                      <div style={{ fontSize: 12, color: "#ff6b35" }}>{t.count} product{t.count === 1 ? "" : "s"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => { setSetName(""); setType(""); setQ(""); }}
                style={{ ...input, cursor: "pointer", padding: "7px 12px", color: "#ff6b35" }}>← All sets</button>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                {setName ? setName.replace(/^[A-Za-z0-9]+:\s*/, "") : type || "Search results"}
                {setName && type ? <span style={{ color: "#a0a0b0", fontWeight: 400 }}> · {type}</span> : null}
              </div>
            </div>
            {loading ? (
              <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
            ) : items.length === 0 ? (
              <div style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
                <p style={{ color: "#777", fontSize: "13px", margin: 0 }}>
                  {inStockOnly ? "Nothing in stock for this selection — untoggle “In stock only” to see what we list." : "No sealed product found."}
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "16px" }}>
                  {items.map((a) => (
                    <div key={a.id} style={{ background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", opacity: a.in_stock ? 1 : 0.6 }}>
                      <div style={{ width: "100%", aspectRatio: "1", background: "#0e0e16", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {a.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.image_url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          : <span style={{ color: "#333", fontSize: "32px" }}>📦</span>}
                      </div>
                      <div>
                        <div style={{ color: "#666", fontSize: "11px" }}>{a.sealed_set_name.replace(/^[A-Za-z0-9]+:\s*/, "")}{a.card_subtypes ? ` · ${a.card_subtypes}` : ""}</div>
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: 600, lineHeight: 1.3 }}>{a.name}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                        <span style={{ color: "#ff6b35", fontSize: "16px", fontWeight: 700 }}>R{parseFloat(a.price).toFixed(2)}</span>
                        <span style={{ color: a.in_stock ? "#66cc66" : "#aa5555", fontSize: "11px", fontWeight: 600 }}>{a.in_stock ? `${a.stock} in stock` : "Out of stock"}</span>
                      </div>
                      <AddToPileButton productId={a.id} hasStock={a.in_stock} price={parseFloat(a.price)} name={a.name} />
                    </div>
                  ))}
                </div>
                {next && (
                  <div style={{ textAlign: "center", marginTop: "24px" }}>
                    <button onClick={loadMore} style={{ ...input, cursor: "pointer", color: "#ff6b35", borderColor: "#ff6b35" }}>Load more</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
