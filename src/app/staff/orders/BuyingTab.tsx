"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { authFetch, SessionExpiredError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Michael, 2026-10-13: "I want to create a buying invoice from customer, which
// can add the stock to the site once I complete the invoice. It will be more
// for bigger card buys and small collections. Run the same as manual invoicing
// from staff page." Draft (editable) -> Paid (seller paid) -> Complete (adds
// every catalogue line to LIVE website stock, once). Off-catalogue lines are
// recorded for the payout but add no stock. Data: /api/orders/admin/buy-invoices/.
// Print/PDF/Email open the existing Django-admin receipt views in a new tab
// (same split as Manual Invoices -- needs the /admin/ session in this browser).

const STATUS_CHOICES: [string, string][] = [
  ["draft", "Draft"], ["paid", "Paid"], ["complete", "Complete"], ["cancelled", "Cancelled"],
];
const STATUS_COLOR: Record<string, string> = {
  draft: "#546e7a", paid: "#1565c0", complete: "#1b5e20", cancelled: "#757575",
};

interface BuyLine {
  key: string;
  product_id: number | null;
  description: string; set_name: string; card_number: string; variant: string;
  quantity: string; unit_price: string;
  live_stock: number | null;
}

interface BuyInvoice {
  id: number; buy_number: string; status: string; status_display: string; stock_mode: string;
  seller_name: string; seller_email: string; seller_phone: string; user_username: string | null;
  seller_note: string; internal_note: string;
  payment_made: boolean; payment_method: string; payment_method_display: string;
  total: string; item_count: number; off_catalogue_units: number;
  created_at: string; completed_at: string | null;
  items: { id: number; product_id: number | null; description: string; set_name: string; card_number: string; variant: string; quantity: number; unit_price: string; line_total: string; live_stock: number | null }[];
}

interface ApiProduct {
  id: number; name: string; card_set?: { name: string; code: string } | null;
  card_number?: string | number | null; variant_override?: string | null; stock?: number;
}

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const btnGreen: React.CSSProperties = { ...btn, background: "#1b5e20", color: "#fff", border: "none", fontWeight: 600 };
const btnDanger: React.CSSProperties = { ...btn, color: "#EF4444", borderColor: "#7a2a2a" };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#888", display: "block", marginBottom: 3 };

function money(v: string | number) { return `R ${parseFloat(String(v || 0)).toFixed(2)}`; }
function dateFmt(v: string) { return new Date(v).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
let keySeq = 0;
const newKey = () => `l${++keySeq}`;

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span style={{ background: STATUS_COLOR[status] || "#333", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, display: "inline-block" }}>{label}</span>;
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

// Live catalogue search (same public /api/products/?search= the announcements
// page uses). Clicking a result adds it as a new line.
function CardSearch({ onPick }: { onPick: (p: ApiProduct) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiProduct[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      fetch(`${API_URL}/api/products/?search=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults((d.results || []).slice(0, 12)))
        .catch(() => setResults([]));
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
      <input style={{ ...inp, width: "100%" }} value={query} placeholder="Search a card to add (name, set, number)…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 8, maxHeight: 300, overflowY: "auto", boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}>
          {results.map((p) => (
            <div key={p.id} onMouseDown={() => { onPick(p); setQuery(""); setResults([]); setOpen(false); }}
              style={{ padding: "8px 10px", fontSize: 12, color: "#ddd", cursor: "pointer", borderBottom: "1px solid #2a2a3a" }}>
              {p.name}
              <span style={{ color: "#666" }}>
                {p.card_set ? ` — ${p.card_set.name}` : ""}{p.card_number ? ` #${p.card_number}` : ""}{p.variant_override ? ` · ${p.variant_override}` : ""}
                {typeof p.stock === "number" ? ` · stock ${p.stock}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceEditor({ initial, onSaved, onCancel }: { initial?: BuyInvoice; onSaved: () => void; onCancel: () => void }) {
  const locked = !!initial && initial.status !== "draft"; // paid: lines locked, details editable
  const [sellerName, setSellerName] = useState(initial?.seller_name || "");
  const [sellerEmail, setSellerEmail] = useState(initial?.seller_email || "");
  const [sellerPhone, setSellerPhone] = useState(initial?.seller_phone || "");
  const [sellerNote, setSellerNote] = useState(initial?.seller_note || "");
  const [internalNote, setInternalNote] = useState(initial?.internal_note || "");
  const [lines, setLines] = useState<BuyLine[]>(
    (initial?.items || []).map((i) => ({
      key: newKey(), product_id: i.product_id, description: i.description, set_name: i.set_name,
      card_number: i.card_number, variant: i.variant, quantity: String(i.quantity), unit_price: String(i.unit_price),
      live_stock: i.live_stock,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addCard = (p: ApiProduct) => setLines((ls) => [...ls, {
    key: newKey(), product_id: p.id, description: p.name, set_name: p.card_set?.name || "",
    card_number: p.card_number ? String(p.card_number) : "", variant: p.variant_override || "N",
    quantity: "1", unit_price: "", live_stock: typeof p.stock === "number" ? p.stock : null,
  }]);
  const addFree = () => setLines((ls) => [...ls, {
    key: newKey(), product_id: null, description: "", set_name: "", card_number: "", variant: "",
    quantity: "1", unit_price: "", live_stock: null,
  }]);
  const upd = (key: string, patch: Partial<BuyLine>) => setLines((ls) => ls.map((l) => l.key === key ? { ...l, ...patch } : l));
  const del = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const total = lines.reduce((s, l) => s + (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0), 0);
  const units = lines.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);
  const offCat = lines.filter((l) => !l.product_id).reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        seller_name: sellerName, seller_email: sellerEmail, seller_phone: sellerPhone,
        seller_note: sellerNote, internal_note: internalNote,
      };
      if (!locked) {
        body.items = lines.map((l) => ({
          product_id: l.product_id, description: l.description, set_name: l.set_name,
          card_number: l.card_number, variant: l.variant, quantity: l.quantity, unit_price: l.unit_price || "0",
        }));
      }
      const res = await authFetch(initial ? `/api/orders/admin/buy-invoices/${initial.id}/` : "/api/orders/admin/buy-invoices/", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not save the invoice."); return; }
      onSaved();
    } catch (e) {
      setError(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Failed to save — check your connection.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ ...card, marginBottom: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#fff", fontSize: 14 }}>{initial ? `Edit ${initial.buy_number}` : "New buying invoice"}</strong>
        <button style={btn} onClick={onCancel}>Close</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 180 }}><label style={lbl}>Seller name *</label><input style={{ ...inp, width: "100%" }} value={sellerName} onChange={(e) => setSellerName(e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 180 }}><label style={lbl}>Email (for the receipt)</label><input style={{ ...inp, width: "100%" }} value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 140 }}><label style={lbl}>Phone</label><input style={{ ...inp, width: "100%" }} value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} /></div>
      </div>

      {locked ? (
        <div style={{ fontSize: 11, color: "#e0b050" }}>This invoice is {initial?.status_display}. Lines are locked — use “Back to draft” on the list to change them.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <CardSearch onPick={addCard} />
          <button style={btn} onClick={addFree}>+ Off-catalogue line</button>
        </div>
      )}

      {lines.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
                {["Card / description", "Set · # · Var", "Stock now", "Qty", "Price paid (each)", "Line total", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lt = (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0);
                return (
                  <tr key={l.key} style={{ borderBottom: "1px solid #2a2a3a" }}>
                    <td style={{ padding: "6px 8px", fontSize: 12, color: "#ddd", minWidth: 200 }}>
                      {l.product_id ? l.description : (
                        <input style={{ ...inp, width: "100%" }} value={l.description} disabled={locked}
                          onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="e.g. Bulk lot of commons (no stock added)" />
                      )}
                      {!l.product_id && <div style={{ color: "#e0b050", fontSize: 9 }}>off-catalogue — adds no stock</div>}
                    </td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#888" }}>{[l.set_name, l.card_number && `#${l.card_number}`, l.variant].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#888" }}>{l.live_stock ?? "—"}</td>
                    <td style={{ padding: "6px 8px" }}><input style={{ ...inp, width: 60 }} type="number" min="1" value={l.quantity} disabled={locked} onChange={(e) => upd(l.key, { quantity: e.target.value })} /></td>
                    <td style={{ padding: "6px 8px" }}><input style={{ ...inp, width: 90 }} type="number" min="0" step="0.01" value={l.unit_price} disabled={locked} onChange={(e) => upd(l.key, { unit_price: e.target.value })} placeholder="0.00" /></td>
                    <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>{money(lt)}</td>
                    <td style={{ padding: "6px 8px" }}>{!locked && <button style={btnDanger} onClick={() => del(l.key)}>✕</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#a0a0b0" }}>
        {units} item(s) · Total to pay seller: <strong style={{ color: "#fff", fontSize: 14 }}>{money(total)}</strong>
        {offCat > 0 && <span style={{ color: "#e0b050" }}> · {offCat} off-catalogue (no stock added)</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 220 }}><label style={lbl}>Note for the seller (shown on their receipt)</label><input style={{ ...inp, width: "100%" }} value={sellerNote} onChange={(e) => setSellerNote(e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 220 }}><label style={lbl}>Internal note (private)</label><input style={{ ...inp, width: "100%" }} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} /></div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Save as draft"}</button>
        {error && <span style={{ color: "#EF4444", fontSize: 12 }}>{error}</span>}
      </div>
    </div>
  );
}

export default function BuyingTab() {
  const [data, setData] = useState<Paginated<BuyInvoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<BuyInvoice | "new" | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (status) qs.set("status", status);
      if (search) qs.set("search", search);
      const res = await authFetch(`/api/orders/admin/buy-invoices/?${qs}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch (e) {
      setError(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Failed to load buying invoices.");
    } finally { setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { load(); }, [load]);

  const act = async (inv: BuyInvoice, action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(inv.id); setMsg(""); setError("");
    try {
      const res = await authFetch(`/api/orders/admin/buy-invoices/${inv.id}/action/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payment_method: payMethod[inv.id] || "" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(`${inv.buy_number}: ${body.error || "action failed"}`); return; }
      setMsg(`${inv.buy_number}: ${body.message}`);
      load();
    } catch (e) {
      setError(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Request failed — check your connection.");
    } finally { setBusyId(null); }
  };

  const emailReceipt = (inv: BuyInvoice) => {
    if (!window.confirm(`Email receipt ${inv.buy_number} to ${inv.seller_email || "the seller"}? This sends a real email immediately.`)) return;
    window.open(`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-email/`, "_blank");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btnPrimary} onClick={() => setEditing("new")}>+ New Buying Invoice</button>
        <select style={inp} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input style={inp} value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} placeholder="Search seller / BUY-#…" />
        <button style={btn} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</button>
        {(status || search) && <button style={btn} onClick={() => { setStatus(""); setSearch(""); setSearchInput(""); setPage(1); }}>Clear filters</button>}
      </div>

      {editing && (
        <InvoiceEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg("Saved."); load(); }}
        />
      )}

      {msg && <div style={{ color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "#555", fontSize: 13 }}>Loading buying invoices…</div>
      ) : !data || data.results.length === 0 ? (
        <div style={{ color: "#555", fontSize: 13 }}>No buying invoices yet. Click “+ New Buying Invoice”.</div>
      ) : (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
                {["Invoice", "Seller", "Status", "Items", "Total", "Payment", "Date", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map((inv) => {
                const legacy = inv.stock_mode !== "site";
                const busy = busyId === inv.id;
                return (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #2a2a3a", verticalAlign: "top" }}>
                    <td style={{ padding: "8px", fontSize: 12 }}>
                      <a href={`${API_URL}/admin/orders/buyorder/${inv.id}/change/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35", fontWeight: 700 }}>{inv.buy_number}</a>
                      {legacy && <div style={{ color: "#666", fontSize: 9 }}>legacy POS</div>}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#ddd" }}>
                      {inv.seller_name}{inv.user_username && <span style={{ color: "#4ade80", fontSize: 9, marginLeft: 6 }}>🔗 @{inv.user_username}</span>}
                      <div style={{ color: "#555", fontSize: 10 }}>{inv.seller_email || inv.seller_phone}</div>
                    </td>
                    <td style={{ padding: "8px" }}><StatusBadge status={inv.status} label={inv.status_display} /></td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#888" }}>
                      {inv.item_count}{inv.off_catalogue_units > 0 && <div style={{ color: "#e0b050", fontSize: 9 }}>{inv.off_catalogue_units} off-cat.</div>}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>{money(inv.total)}</td>
                    <td style={{ padding: "8px", fontSize: 11, color: inv.payment_made ? "#4ade80" : "#888" }}>
                      {inv.payment_made ? `✅ ${inv.payment_method_display || "Paid"}` : "Unpaid"}
                    </td>
                    <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{dateFmt(inv.created_at)}</td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {!legacy && inv.status === "draft" && (
                          <>
                            <button style={btn} onClick={() => setEditing(inv)}>✏️ Edit</button>
                            <select style={{ ...inp, padding: "4px 6px", fontSize: 11 }} value={payMethod[inv.id] || ""} onChange={(e) => setPayMethod((m) => ({ ...m, [inv.id]: e.target.value }))}>
                              <option value="">Paid by…</option><option value="eft">EFT</option><option value="cash">Cash</option><option value="card">Card</option>
                            </select>
                            <button style={btnPrimary} disabled={busy || !payMethod[inv.id]} onClick={() => act(inv, "mark_paid")}>💰 Mark paid</button>
                          </>
                        )}
                        {!legacy && inv.status === "paid" && (
                          <>
                            <button style={btnGreen} disabled={busy}
                              onClick={() => act(inv, "complete", `Complete ${inv.buy_number}? This adds ${inv.item_count - inv.off_catalogue_units} card(s) to LIVE website stock and locks the invoice.`)}>
                              ✅ Complete &amp; add stock
                            </button>
                            <button style={btn} onClick={() => setEditing(inv)}>✏️ Details</button>
                            <button style={btn} disabled={busy} onClick={() => act(inv, "unpay")}>↩ Back to draft</button>
                          </>
                        )}
                        {!legacy && (inv.status === "draft" || inv.status === "paid") && (
                          <button style={btnDanger} disabled={busy} onClick={() => act(inv, "cancel", `Cancel ${inv.buy_number}? No stock will be added.`)}>Cancel</button>
                        )}
                        <a style={btn} href={`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-print/`} target="_blank" rel="noreferrer">📄 Receipt</a>
                        <a style={btn} href={`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-pdf/`} target="_blank" rel="noreferrer">⬇ PDF</a>
                        <button style={btn} onClick={() => emailReceipt(inv)}>✉️ Email</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pager count={data.count} page={page} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
