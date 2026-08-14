"use client";
import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Michael, 2026-08-12: "build an admin app, that does all my functions we
// have on Django, on railway... basically a full Orders app" -- status
// updates, Pull Sheet printing, Invoice printing, for both real checkout
// Orders and Manual Invoices, without going through Django admin's own
// plain templates. Print/PDF/Email actions still open the existing
// Django-admin-protected endpoints in a new tab (session auth) -- this
// dashboard's own data comes over JWT (authFetch), a deliberate split
// rather than rebuilding print/PDF/email generation a second time. That
// means: Michael must be logged into /admin/ in the same browser for the
// action buttons below to work, same as they already require today from
// inside Django admin itself.

const STATUS_CHOICES: [string, string][] = [
  ["awaiting_payment", "Awaiting Payment"],
  ["pending", "Order Received"],
  ["pending_eft", "Awaiting EFT Payment"],
  ["printed", "Order Printed"],
  ["packed", "Order Packed"],
  ["booked", "Courier Booking"],
  ["ready", "Ready for Collection"],
  ["collected", "Courier Collected"],
  ["invoiced", "Complete"],
  ["cancelled", "Cancelled"],
];

const STATUS_COLOR: Record<string, string> = {
  awaiting_payment: "#c62828", pending_eft: "#e65100", pending: "#f9a825",
  printed: "#1565c0", packed: "#6a1b9a", booked: "#00838f",
  ready: "#00acc1", collected: "#43a047", invoiced: "#1b5e20", cancelled: "#757575",
};

// Manual Invoice's own, shorter status set (2026-08-12) -- no courier/
// booking stages of its own, see ManualInvoice.STATUS_CHOICES. Packed comes
// before Payment Confirmed (2026-08-12 follow-up, Michael: "most clients
// make payment when collecting") -- matches the model's own choices order.
const INVOICE_STATUS_CHOICES: [string, string][] = [
  ["created", "Created"],
  ["packed", "Packed"],
  ["payment_confirmed", "Payment Confirmed"],
  ["complete", "Complete"],
  ["cancelled", "Cancelled"],
];

// Payment type dropdown (2026-08-12) -- Michael: "please add the payment
// type too, seperate dropdown" -- separate from status, so staff can record
// HOW an invoice was paid (and mark it received) independently of the
// fulfillment status, since Packed no longer auto-confirms payment.
const PAYMENT_TYPE_CHOICES: [string, string][] = [
  ["", "Not received"],
  ["eft", "EFT"],
  ["cash", "Cash"],
  ["card", "Card"],
];

const PAYMENT_TYPE_COLOR: Record<string, string> = {
  "": "#7a2a2a", eft: "#1b5e20", cash: "#1b5e20", card: "#1b5e20",
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  created: "#546e7a", payment_confirmed: "#1565c0", packed: "#6a1b9a", complete: "#1b5e20", cancelled: "#757575",
};

interface AdminOrder {
  id: number; status: string; status_display: string;
  customer_name: string; customer_email: string;
  payment_method: string; payment_method_display: string;
  eft_confirmed: boolean; cash_confirmed: boolean; stripe_payment_intent: string; is_paid: boolean;
  total_price: string; discount_percent: string; discount_amount: string; shipping_cost: string;
  shipping_method: string; delivery_method: string;
  waybill_number: string; courier_name: string; courier_tracking_url: string;
  item_count: number; created_at: string;
}

interface ManualInvoice {
  id: number; invoice_number: string; status: string; status_display: string;
  customer_name: string; customer_email: string; customer_phone: string;
  user_id: number | null; user_username: string | null;
  shipping_cost: string; discount_percent: string; discount_amount: string; subtotal: string; total: string;
  item_count: number; payment_received: boolean; payment_method: string; payment_method_display: string;
  created_at: string;
}

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12 };

function money(v: string | number) { return `R ${parseFloat(String(v || 0)).toFixed(2)}`; }
function dateFmt(v: string) { return new Date(v).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function StatusBadge({ status, label, colors = STATUS_COLOR }: { status: string; label: string; colors?: Record<string, string> }) {
  return (
    <span style={{ background: colors[status] || "#333", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
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

// ─────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────

function OrderManageRow({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const [status, setStatus] = useState(order.status);
  const [waybill, setWaybill] = useState(order.waybill_number);
  const [courierName, setCourierName] = useState(order.courier_name);
  const [courierUrl, setCourierUrl] = useState(order.courier_tracking_url);
  const [note, setNote] = useState("");
  const [eftConfirmed, setEftConfirmed] = useState(order.eft_confirmed);
  const [cashConfirmed, setCashConfirmed] = useState(order.cash_confirmed);
  const [paymentRef, setPaymentRef] = useState(order.stripe_payment_intent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`/api/orders/${order.id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status, note, waybill_number: waybill, courier_name: courierName, courier_tracking_url: courierUrl,
          eft_confirmed: eftConfirmed, cash_confirmed: cashConfirmed, stripe_payment_intent: paymentRef,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      onSaved();
    } catch {
      setError("Failed to save — check your connection and try again.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8, padding: 14, marginTop: 6, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Status</label>
          <select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Waybill / Tracking #</label>
          <input style={inp} value={waybill} onChange={(e) => setWaybill(e.target.value)} placeholder="waybill number" />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Courier</label>
          <input style={inp} value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. Pudo" />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Tracking URL</label>
          <input style={{ ...inp, width: 180 }} value={courierUrl} onChange={(e) => setCourierUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 3 }}>Note (internal, optional)</label>
          <input style={{ ...inp, width: "100%" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="visible in this order's tracking history" />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #2a2a3a", paddingTop: 12, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment ({order.payment_method_display})</span>
        {order.payment_method === "eft" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ddd", cursor: "pointer" }}>
            <input type="checkbox" checked={eftConfirmed} onChange={(e) => setEftConfirmed(e.target.checked)} />
            EFT payment received
          </label>
        )}
        {order.payment_method === "coc" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ddd", cursor: "pointer" }}>
            <input type="checkbox" checked={cashConfirmed} onChange={(e) => setCashConfirmed(e.target.checked)} />
            Cash received
          </label>
        )}
        {order.payment_method === "payfast" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: paymentRef ? "#4ade80" : "#dc2626" }}>{paymentRef ? "✅ Confirmed via PayFast webhook" : "❌ Awaiting PayFast confirmation"}</span>
            <input style={{ ...inp, width: 200 }} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="PF payment ID (manual override)" />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Update Order"}</button>
        {error && <span style={{ color: "#EF4444", fontSize: 11 }}>{error}</span>}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [data, setData] = useState<Paginated<AdminOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [paid, setPaid] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (paid) params.set("paid", paid);
    if (search) params.set("search", search);
    params.set("page", String(page));
    authFetch(`/api/orders/admin/?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setError(""); })
      .catch((e) => { if (e instanceof SessionExpiredError) setError("Session expired — please log in again."); else setError("Failed to load orders."); })
      .finally(() => setLoading(false));
  }, [status, paid, search, page]);

  useEffect(() => { load(); }, [load]);

  const emailInvoice = (id: number) => {
    if (!window.confirm("Email this invoice to the customer? This sends a real email immediately.")) return;
    window.open(`${API_URL}/api/invoice/email/${id}/`, "_blank");
  };

  // One-click Paid toggle for EFT/Cash, right in the table row -- no need
  // to open Manage just to tick "payment received". PayFast isn't
  // clickable here since it's normally confirmed automatically by the
  // webhook; manual override for that lives in Manage instead.
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const togglePaid = async (o: AdminOrder) => {
    if (o.payment_method === "payfast") return;
    const field = o.payment_method === "eft" ? "eft_confirmed" : "cash_confirmed";
    setTogglingId(o.id);
    try {
      const res = await authFetch(`/api/orders/${o.id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !o.is_paid }),
      });
      if (res.ok) load();
    } finally { setTogglingId(null); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select style={inp} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Open orders (default)</option>
          <option value="__all__" disabled>── or filter by status ──</option>
          {STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select style={inp} value={paid} onChange={(e) => { setPaid(e.target.value); setPage(1); }}>
          <option value="">Any payment status</option>
          <option value="yes">Paid</option>
          <option value="no">Unpaid</option>
        </select>
        <input style={inp} value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          placeholder="Search customer / waybill…" />
        <button style={btn} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</button>
        {(status || paid || search) && (
          <button style={btn} onClick={() => { setStatus(""); setPaid(""); setSearch(""); setSearchInput(""); setPage(1); }}>Clear filters</button>
        )}
      </div>

      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "#555", fontSize: 13 }}>Loading orders…</div>
      ) : !data || data.results.length === 0 ? (
        <div style={{ color: "#555", fontSize: 13 }}>No orders match these filters.</div>
      ) : (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
                {["Order", "Customer", "Status", "Paid", "Total", "Discount", "Shipping", "Items", "Date", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map((o) => (
                <Fragment key={o.id}>
                  <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                    <td style={{ padding: "8px", fontSize: 12 }}>
                      <a href={`${API_URL}/admin/orders/order/${o.id}/change/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35", fontWeight: 700 }}>#{o.id}</a>
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#ddd" }}>{o.customer_name}<div style={{ color: "#555", fontSize: 10 }}>{o.customer_email}</div></td>
                    <td style={{ padding: "8px" }}><StatusBadge status={o.status} label={o.status_display} /></td>
                    <td style={{ padding: "8px", fontSize: 12 }}>
                      {o.payment_method === "payfast" ? (
                        o.is_paid ? <span style={{ color: "#4ade80" }}>✅ {o.payment_method_display}</span> : <span style={{ color: "#dc2626" }}>❌ {o.payment_method_display}</span>
                      ) : (
                        <button
                          onClick={() => togglePaid(o)}
                          disabled={togglingId === o.id}
                          title="Click to toggle payment confirmation"
                          style={{
                            background: "transparent", border: "none", cursor: togglingId === o.id ? "wait" : "pointer",
                            padding: 0, font: "inherit", color: o.is_paid ? "#4ade80" : "#dc2626",
                          }}
                        >
                          {togglingId === o.id ? "…" : o.is_paid ? "✅" : "❌"} {o.payment_method_display}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>{money(o.total_price)}</td>
                    <td style={{ padding: "8px", fontSize: 11, color: "#4ade80" }}>{parseFloat(o.discount_amount) > 0 ? `-${money(o.discount_amount)}` : "-"}</td>
                    <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{o.shipping_method}</td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#888" }}>{o.item_count}</td>
                    <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{dateFmt(o.created_at)}</td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button style={btn} onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{expanded === o.id ? "Close" : "Manage"}</button>
                        <a style={btn} href={`${API_URL}/api/print/order/${o.id}/`} target="_blank" rel="noreferrer">🖨 Pull Sheet</a>
                        <a style={btn} href={`${API_URL}/api/print/invoice/${o.id}/`} target="_blank" rel="noreferrer">📄 Invoice</a>
                        <button style={btn} onClick={() => emailInvoice(o.id)}>✉️ Email</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={10} style={{ padding: "0 8px 10px" }}>
                        <OrderManageRow order={o} onSaved={() => { setExpanded(null); load(); }} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <Pager count={data.count} page={page} setPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MANUAL INVOICES TAB
// ─────────────────────────────────────────────────────────────────────────

function InvoicesTab() {
  const [data, setData] = useState<Paginated<ManualInvoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [paymentReceived, setPaymentReceived] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (invStatus) params.set("status", invStatus);
    if (paymentReceived) params.set("payment_received", paymentReceived);
    if (search) params.set("search", search);
    params.set("page", String(page));
    authFetch(`/api/orders/admin/manual-invoices/?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setError(""); })
      .catch((e) => { if (e instanceof SessionExpiredError) setError("Session expired — please log in again."); else setError("Failed to load manual invoices."); })
      .finally(() => setLoading(false));
  }, [invStatus, paymentReceived, search, page]);

  useEffect(() => { load(); }, [load]);

  const emailInvoice = (id: number, invoiceNumber: string) => {
    if (!window.confirm(`Email invoice ${invoiceNumber} to the customer? This sends a real email immediately.`)) return;
    window.open(`${API_URL}/admin/orders/manualinvoice/${id}/manual-invoice-email/`, "_blank");
  };

  const updateStatus = async (id: number, newStatus: string) => {
    setSavingId(id);
    try {
      const res = await authFetch(`/api/orders/admin/manual-invoices/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) load();
    } finally { setSavingId(null); }
  };

  const updatePaymentType = async (id: number, method: string) => {
    setSavingId(id);
    try {
      const res = await authFetch(`/api/orders/admin/manual-invoices/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Picking an actual method (EFT/Cash/Card) means it's been received;
        // reverting to "Not received" un-ticks payment_received too, rather
        // than leaving the two fields out of sync.
        body: JSON.stringify({ payment_method: method, payment_received: !!method }),
      });
      if (res.ok) load();
    } finally { setSavingId(null); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <a style={btnPrimary} href={`${API_URL}/admin/orders/manualinvoice/pos/`} target="_blank" rel="noreferrer">+ New Manual Invoice</a>
        <select style={inp} value={invStatus} onChange={(e) => { setInvStatus(e.target.value); setPage(1); }}>
          <option value="">Any status</option>
          {INVOICE_STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select style={inp} value={paymentReceived} onChange={(e) => { setPaymentReceived(e.target.value); setPage(1); }}>
          <option value="">Any payment status</option>
          <option value="true">Payment received</option>
          <option value="false">Payment pending</option>
        </select>
        <input style={inp} value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          placeholder="Search customer / invoice #…" />
        <button style={btn} onClick={() => { setSearch(searchInput); setPage(1); }}>Search</button>
      </div>

      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "#555", fontSize: 13 }}>Loading manual invoices…</div>
      ) : !data || data.results.length === 0 ? (
        <div style={{ color: "#555", fontSize: 13 }}>No manual invoices match these filters.</div>
      ) : (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
                {["Invoice", "Customer", "Status", "Items", "Discount", "Shipping", "Total", "Payment", "Date", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid #2a2a3a" }}>
                  <td style={{ padding: "8px", fontSize: 12 }}>
                    <a href={`${API_URL}/admin/orders/manualinvoice/${inv.id}/change/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35", fontWeight: 700 }}>{inv.invoice_number}</a>
                  </td>
                  <td style={{ padding: "8px", fontSize: 12, color: "#ddd" }}>
                    {inv.customer_name}
                    {inv.user_username && (
                      <span style={{ background: "#17332444", border: "1px solid #2fbf71", color: "#4ade80", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 6 }}>
                        🔗 @{inv.user_username}
                      </span>
                    )}
                    <div style={{ color: "#555", fontSize: 10 }}>{inv.customer_email}</div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <select
                      value={inv.status}
                      disabled={savingId === inv.id}
                      onChange={(e) => updateStatus(inv.id, e.target.value)}
                      style={{
                        background: INVOICE_STATUS_COLOR[inv.status] || "#333", color: "#fff", border: "none",
                        borderRadius: 10, padding: "3px 6px", fontSize: 10, fontWeight: 700, cursor: savingId === inv.id ? "wait" : "pointer",
                      }}
                    >
                      {INVOICE_STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "8px", fontSize: 12, color: "#888" }}>{inv.item_count}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#4ade80" }}>{parseFloat(inv.discount_amount) > 0 ? `-${money(inv.discount_amount)} (${inv.discount_percent}%)` : "-"}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{money(inv.shipping_cost)}</td>
                  <td style={{ padding: "8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>{money(inv.total)}</td>
                  <td style={{ padding: "8px" }}>
                    <select
                      value={inv.payment_method}
                      disabled={savingId === inv.id}
                      onChange={(e) => updatePaymentType(inv.id, e.target.value)}
                      style={{
                        background: PAYMENT_TYPE_COLOR[inv.payment_method] || "#7a2a2a", color: "#fff", border: "none",
                        borderRadius: 10, padding: "3px 6px", fontSize: 10, fontWeight: 700, cursor: savingId === inv.id ? "wait" : "pointer",
                      }}
                    >
                      {PAYMENT_TYPE_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{dateFmt(inv.created_at)}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <a style={btn} href={`${API_URL}/admin/orders/manualinvoice/${inv.id}/manual-invoice-pull-sheet/`} target="_blank" rel="noreferrer">🖨 Pull Sheet</a>
                      <a style={btn} href={`${API_URL}/admin/orders/manualinvoice/${inv.id}/manual-invoice-print/`} target="_blank" rel="noreferrer">📄 Invoice</a>
                      <a style={btn} href={`${API_URL}/admin/orders/manualinvoice/${inv.id}/manual-invoice-pdf/`} target="_blank" rel="noreferrer">⬇ PDF</a>
                      <button style={btn} onClick={() => emailInvoice(inv.id, inv.invoice_number)}>✉️ Email</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager count={data.count} page={page} setPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function StaffOrdersPage() {
  const [tab, setTab] = useState<"orders" | "invoices">("orders");
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Orders</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
            Status updates, Pull Sheets, and Invoices for real orders and manual invoices.{" "}
            Print/PDF/Email actions open in a new tab and need you to be logged into{" "}
            <a href={`${API_URL}/admin/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35" }}>Django admin</a> in this browser.
            {" · "}<a href={`${API_URL}/admin/store-overview/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35" }}>Store Overview →</a>
            {" · "}<Link href="/staff/checklists" style={{ color: "#ff6b35" }}>Customer Checklists →</Link>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {(["orders", "invoices"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#ff6b35" : "transparent",
              border: `1px solid ${tab === t ? "#ff6b35" : "#2a2a3a"}`,
              color: tab === t ? "#fff" : "#a0a0b0",
              padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {t === "orders" ? "📦 Orders" : "🧾 Manual Invoices"}
            </button>
          ))}
        </div>

        {tab === "orders" ? <OrdersTab /> : <InvoicesTab />}
      </div>
    </div>
  );
}
