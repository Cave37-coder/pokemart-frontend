"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";

// 2026-11-11, Michael: adjusting an accessory's price "must work through
// Staff". Lists every accessory (incl. out-of-stock / inactive) and edits
// price, stock, name, description and Active inline.
// API: accessories/staff_api.py -> /api/accessories-admin/

interface Acc {
  id: number; sku: string; name: string; category: string; category_display: string;
  manufacturer: string; description: string; image_url: string;
  price: string; stock: number; is_active: boolean; price_locked: boolean;
}
interface Cat { value: string; label: string }

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 };

function Row({ a, cats, onSaved }: { a: Acc; cats: Cat[]; onSaved: (a: Acc) => void }) {
  const [price, setPrice] = useState(a.price);
  const [stock, setStock] = useState(String(a.stock));
  const [active, setActive] = useState(a.is_active);
  const [name, setName] = useState(a.name);
  const [desc, setDesc] = useState(a.description);
  const [category, setCategory] = useState(a.category);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = price !== a.price || stock !== String(a.stock) || active !== a.is_active ||
    name !== a.name || desc !== a.description || category !== a.category;

  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const res = await authFetch(`/api/accessories-admin/${a.id}/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, stock: parseInt(stock) || 0, is_active: active, name, description: desc, category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Save failed");
      onSaved(d); setMsg("Saved ✓");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <tr style={{ borderBottom: "1px solid #22222e", opacity: active ? 1 : 0.55 }}>
        <td style={{ padding: 8, width: 48 }}>
          {a.image_url ? <img src={a.image_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} /> : null}
        </td>
        <td style={{ padding: 8, color: "#fff", fontWeight: 600, minWidth: 220 }}>
          {a.name}<div style={{ color: "#666", fontWeight: 400, fontSize: 10 }}>{a.sku} · {a.category_display}</div>
        </td>
        <td style={{ padding: 8 }}>
          <span style={{ color: "#888", marginRight: 4 }}>R</span>
          <input style={{ ...inp, width: 80 }} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </td>
        <td style={{ padding: 8 }}>
          <input style={{ ...inp, width: 60 }} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
        </td>
        <td style={{ padding: 8 }}>
          <label style={{ color: "#ccc", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> On sale
          </label>
        </td>
        <td style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
          <span style={{ color: msg.includes("✓") ? "#4caf50" : "#EF4444", fontSize: 11, marginRight: 8 }}>{msg}</span>
          <button style={btn} onClick={() => setOpen(!open)}>{open ? "Less" : "More"}</button>{" "}
          <button style={dirty ? btnPrimary : { ...btn, opacity: 0.5 }} disabled={!dirty || busy} onClick={save}>{busy ? "…" : "Save"}</button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: "0 8px 12px" }}>
            <div style={{ display: "grid", gap: 8 }}>
              <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
              <select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <textarea style={{ ...inp, minHeight: 110 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
              <div style={{ color: "#666", fontSize: 11 }}>Photos: upload in Django admin → Accessories.</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function StaffAccessoriesPage() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Acc[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      setIsStaff(!!(user && (user.is_staff || user.is_superuser)));
    } catch { setIsStaff(false); }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (cat) qs.set("category", cat);
    authFetch(`/api/accessories-admin/?${qs}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.results || []); setCats(d.categories || []); setError(""); })
      .catch((e) => setError(e instanceof SessionExpiredError ? "Session expired — please log in again." : "Failed to load accessories."))
      .finally(() => setLoading(false));
  }, [search, cat]);

  useEffect(() => {
    if (!isStaff) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [isStaff, load]);

  if (isStaff === null) return null;
  if (!isStaff) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ color: "#a0a0b0", marginBottom: 16 }}>Staff access only.</div>
        <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>🛡️ Accessories</h1>
        <p style={{ color: "#555", fontSize: 12, marginTop: 4, marginBottom: 16 }}>
          Edit price, stock and On sale. Stock 0 or Off sale hides it from customers. A price you change here is kept (the sync won&apos;t overwrite it).
          {" · "}<Link href="/accessories" style={{ color: "#ff6b35" }}>View shop →</Link>
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Search name, SKU, brand…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={inp} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={card}>
          {error ? <div style={{ color: "#EF4444", fontSize: 13 }}>{error}</div>
            : loading && rows.length === 0 ? <div style={{ color: "#888", fontSize: 13 }}>Loading…</div>
            : rows.length === 0 ? <div style={{ color: "#888", fontSize: 13 }}>No accessories found.</div>
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#888", borderBottom: "1px solid #2a2a3a" }}>
                      <th style={{ padding: "6px 8px" }}></th><th style={{ padding: "6px 8px" }}>Product</th>
                      <th style={{ padding: "6px 8px" }}>Price</th><th style={{ padding: "6px 8px" }}>Stock</th>
                      <th style={{ padding: "6px 8px" }}>Status</th><th style={{ padding: "6px 8px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <Row key={a.id} a={a} cats={cats}
                        onSaved={(n) => setRows((rs) => rs.map((r) => (r.id === n.id ? n : r)))} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
