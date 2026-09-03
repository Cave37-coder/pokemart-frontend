"use client";
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Michael, 2026-09-03: "Can you add it to staff section of the site, like
// you did with the Orders" -- staff dashboard for the SiteAnnouncement
// model (see products/models.py) added earlier the same session. Lets
// Michael log a restock or announcement, tagged with the date it counts
// toward, without going through Django admin. send_monthly_update_email
// pulls in whatever falls in the current month when it builds the email.
// Mirrors staff/orders/page.tsx's shape: same dark theme, same isStaff
// gate via localStorage, same authFetch (JWT) pattern.

const KIND_CHOICES: [string, string][] = [
  ["restock", "Restock"],
  ["announcement", "Announcement"],
];

const KIND_COLOR: Record<string, string> = {
  restock: "#1b5e20",
  announcement: "#1565c0",
};

interface AnnouncementProduct {
  id: number;
  name: string;
}

interface Announcement {
  id: number;
  kind: string;
  kind_display: string;
  title: string;
  body: string;
  date: string;
  product: number | null;
  product_name: string;
  card_set: string | null;
  card_set_name: string;
  link_url: string;
  created_at: string;
}

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

interface ApiProduct { id: number; name: string; card_set?: { name: string; code: string } | null; card_number?: string | null; }

// Michael, 2026-09-03: "can we have a dropdown for which set" -- restocks
// are usually about a whole set (e.g. "Prismatic Evolutions booster boxes
// back in stock"), so a set picker is a much faster/more natural fit than
// searching for one specific product every time. Reuses the same public
// /api/sets/ endpoint the Browse Cards & Checklists pages already use.
interface ApiSet { code: string; name: string; }

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const btnDanger: React.CSSProperties = { ...btn, color: "#EF4444", borderColor: "#7a2a2a" };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12 };

function dateFmt(v: string) {
  if (!v) return "";
  return new Date(v + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function KindBadge({ kind, label }: { kind: string; label: string }) {
  return (
    <span style={{ background: KIND_COLOR[kind] || "#333", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Pager({ count, page, setPage, pageSize = 32 }: { count: number; page: number; setPage: (n: number) => void; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 }}>
      <button style={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
      <span style={{ color: "#555", fontSize: 12 }}>Page {page} of {pages} ({count} total)</span>
      <button style={btn} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
    </div>
  );
}

// Small live-search product picker -- reuses the same public /api/products/
// ?search= endpoint & debounce shape as decklist/page.tsx's card search.
function ProductPicker({ productId, productName, onChange }: { productId: number | null; productName: string; onChange: (id: number | null, name: string) => void }) {
  const [query, setQuery] = useState(productName || "");
  const [results, setResults] = useState<ApiProduct[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(productName || ""); }, [productName]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2 || q === productName) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      fetch(`${API_URL}/api/products/?search=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults((d.results || []).slice(0, 8)))
        .catch(() => setResults([]));
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, productName]);

  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inp, width: "100%" }}
        value={query}
        placeholder="Search a product to link (optional)…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null, ""); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {productId && (
        <button
          type="button"
          onClick={() => { onChange(null, ""); setQuery(""); }}
          style={{ position: "absolute", right: 6, top: 6, background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 12 }}
          title="Clear linked product"
        >✕</button>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 8, maxHeight: 240, overflowY: "auto",
          boxShadow: "0 12px 24px rgba(0,0,0,0.4)",
        }}>
          {results.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => { onChange(p.id, p.name); setQuery(p.name); setOpen(false); }}
              style={{ padding: "8px 10px", fontSize: 12, color: "#ddd", cursor: "pointer", borderBottom: "1px solid #2a2a3a" }}
            >
              {p.name}{p.card_set ? <span style={{ color: "#666" }}> — {p.card_set.name} #{p.card_number}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Set dropdown -- loads the full list once (same shape as the Browse Cards
// set filter) rather than live-searching like ProductPicker, since there
// are only a couple hundred sets and Michael picks from a list, not types
// a name.
function SetPicker({ value, onChange }: { value: string | null; onChange: (code: string | null) => void }) {
  const [sets, setSets] = useState<ApiSet[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/sets/`)
      .then((r) => r.json())
      .then((d) => setSets(d.results || []))
      .catch(() => setSets([]));
  }, []);

  return (
    <select style={{ ...inp, width: "100%" }} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— none —</option>
      {sets.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
    </select>
  );
}

function AnnouncementForm({ initial, onSaved, onCancel }: { initial?: Announcement; onSaved: () => void; onCancel?: () => void }) {
  const [kind, setKind] = useState(initial?.kind || "announcement");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState<number | null>(initial?.product ?? null);
  const [productName, setProductName] = useState(initial?.product_name || "");
  const [cardSet, setCardSet] = useState<string | null>(initial?.card_set ?? null);
  const [linkUrl, setLinkUrl] = useState(initial?.link_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { kind, title, body, date, product: productId, card_set: cardSet, link_url: linkUrl };
      const url = initial ? `/api/admin/announcements/${initial.id}/` : `/api/admin/announcements/`;
      const res = await authFetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch {
      setError("Failed to save — check your connection and try again.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Kind</label>
          <select style={inp} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Date (which month it counts toward)</label>
          <input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Title</label>
          <input style={{ ...inp, width: "100%" }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prismatic Evolutions booster boxes back in stock" />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Body (optional, shown under the title in the email)</label>
        <textarea style={{ ...inp, width: "100%", minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Extra detail…" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Set (optional)</label>
          <SetPicker value={cardSet} onChange={setCardSet} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>...or link a specific product</label>
          <ProductPicker productId={productId} productName={productName} onChange={(id, name) => { setProductId(id); setProductName(name); }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>...or a link URL (used if no set/product is linked)</label>
          <input style={{ ...inp, width: "100%" }} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://pokebulk.co.za/community" disabled={!!productId || !!cardSet} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Add"}</button>
        {onCancel && <button style={btn} onClick={onCancel} disabled={saving}>Cancel</button>}
        {error && <span style={{ color: "#EF4444", fontSize: 11 }}>{error}</span>}
      </div>
    </div>
  );
}

function AnnouncementsList() {
  const [data, setData] = useState<Paginated<Announcement> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`/api/admin/announcements/?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setError(""); })
      .catch((e) => { if (e instanceof SessionExpiredError) setError("Session expired — please log in again."); else setError("Failed to load announcements."); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    if (!window.confirm("Delete this entry? It won't be pulled into any future monthly email.")) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/admin/announcements/${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      load();
    } catch {
      setError("Failed to delete — check your connection and try again.");
    } finally { setDeletingId(null); }
  };

  if (loading && !data) return <div style={{ color: "#888", fontSize: 13, padding: 20 }}>Loading…</div>;
  if (error) return <div style={{ color: "#EF4444", fontSize: 13, padding: 20 }}>{error}</div>;
  if (!data || data.results.length === 0) return <div style={{ color: "#888", fontSize: 13, padding: 20 }}>No restocks or announcements logged yet.</div>;

  return (
    <div style={card}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#888", borderBottom: "1px solid #2a2a3a" }}>
              <th style={{ padding: "6px 8px" }}>Date</th>
              <th style={{ padding: "6px 8px" }}>Kind</th>
              <th style={{ padding: "6px 8px" }}>Title</th>
              <th style={{ padding: "6px 8px" }}>Linked</th>
              <th style={{ padding: "6px 8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((a) => (
              <Fragment key={a.id}>
                <tr style={{ borderBottom: "1px solid #22222e" }}>
                  <td style={{ padding: "8px", color: "#ccc", whiteSpace: "nowrap" }}>{dateFmt(a.date)}</td>
                  <td style={{ padding: "8px" }}><KindBadge kind={a.kind} label={a.kind_display} /></td>
                  <td style={{ padding: "8px", color: "#fff", fontWeight: 600 }}>{a.title}</td>
                  <td style={{ padding: "8px", color: "#888" }}>
                    {a.product_name || a.card_set_name || (a.link_url ? <a href={a.link_url} target="_blank" rel="noreferrer" style={{ color: "#ff6b35" }}>{a.link_url}</a> : "—")}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={btn} onClick={() => setEditingId(editingId === a.id ? null : a.id)}>{editingId === a.id ? "Close" : "Edit"}</button>{" "}
                    <button style={btnDanger} onClick={() => remove(a.id)} disabled={deletingId === a.id}>{deletingId === a.id ? "…" : "Delete"}</button>
                  </td>
                </tr>
                {editingId === a.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0 8px 12px" }}>
                      <AnnouncementForm initial={a} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Pager count={data.count} page={page} setPage={setPage} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function StaffAnnouncementsPage() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      setIsStaff(!!(user && (user.is_staff || user.is_superuser)));
    } catch { setIsStaff(false); }
  }, []);

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
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Restocks &amp; Announcements</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
            Log a restock or announcement here, tagged with the date it should count toward — the
            monthly update email (sent on the 20th) pulls in whatever falls in the current month.
            {" · "}<Link href="/staff/orders" style={{ color: "#ff6b35" }}>Orders →</Link>
            {" · "}<Link href="/staff/checklists" style={{ color: "#ff6b35" }}>Customer Checklists →</Link>
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          {!showAdd ? (
            <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Log a restock or announcement</button>
          ) : (
            <AnnouncementForm
              onSaved={() => { setShowAdd(false); setRefreshKey((k) => k + 1); }}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>

        <AnnouncementsList key={refreshKey} />
      </div>
    </div>
  );
}
