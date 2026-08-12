"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";
import { useRouter } from "next/navigation";
import FriendChecklistSection from "@/components/FriendChecklistSection";

// Michael, 2026-08-12: "I also want access to customers checklists, so that
// i can check what they need!" -- staff-only lookup, deliberately separate
// from community/[id]'s public_profile (which only shows full_checklist to
// FRIENDS or when a customer has opted checklist_public on). Staff can look
// up ANY customer regardless of their privacy settings, same as Django admin
// already can. Reuses FriendChecklistSection as-is (same have/needed UI
// already built for the Friends feature) rather than a second copy of that
// have/needed logic.

interface CustomerResult {
  id: number; username: string; email: string;
  first_name: string; last_name: string; checklist_count: number;
}

interface CustomerDetail {
  customer: {
    id: number; username: string; email: string;
    first_name: string; last_name: string; phone_number: string;
  };
  entries: Record<string, string[]>;
}

interface ActiveOrder {
  type: "order" | "manual_invoice";
  id: number; label: string; status: string; status_display: string;
  total: string; created_at: string;
}

interface SalesSummary {
  active_orders: ActiveOrder[];
  active_orders_total: string;
  order_sales_total: string;
  manual_invoice_total: string;
  manual_invoice_count: number;
  total_sales: string;
}

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 13, flex: 1 };

const STATUS_COLOR: Record<string, string> = {
  awaiting_payment: "#c62828", pending_eft: "#e65100", pending: "#f9a825",
  printed: "#1565c0", packed: "#6a1b9a", booked: "#00838f",
  ready: "#00acc1", collected: "#43a047", invoiced: "#1b5e20", cancelled: "#757575",
};

// Manual Invoice's own, shorter status set -- different color language than
// Order's since the status codes overlap ('packed') but mean a different
// stage (see ManualInvoice.STATUS_CHOICES).
const INVOICE_STATUS_COLOR: Record<string, string> = {
  created: "#546e7a", payment_confirmed: "#1565c0", packed: "#6a1b9a", complete: "#1b5e20", cancelled: "#757575",
};

function displayName(c: { first_name: string; last_name: string; username: string }) {
  const full = `${c.first_name} ${c.last_name}`.trim();
  return full || c.username;
}

function money(v: string | number) { return `R ${parseFloat(String(v || 0)).toFixed(2)}`; }
function dateFmt(v: string) { return new Date(v).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }

function ChecklistsBody() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CustomerResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/auth/admin/customers/?search=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch (e) {
      if (e instanceof SessionExpiredError) router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Load the busiest collectors by default, so the page isn't empty on open.
  useEffect(() => { runSearch(""); }, [runSearch]);

  const openCustomer = async (id: number) => {
    setDetailLoading(true);
    setSalesLoading(true);
    setSelected(null);
    setSales(null);
    try {
      const [checklistRes, salesRes] = await Promise.all([
        authFetch(`/api/checklists/admin/customer/${id}/`),
        authFetch(`/api/orders/admin/customer-summary/${id}/`),
      ]);
      if (checklistRes.ok) setSelected(await checklistRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
    } catch (e) {
      if (e instanceof SessionExpiredError) router.push("/auth/login");
    } finally {
      setDetailLoading(false);
      setSalesLoading(false);
    }
  };

  const totalChecked = (entries: Record<string, string[]>) =>
    Object.values(entries).reduce((n, keys) => n + keys.length, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
      {/* Customer search / list */}
      <div style={card}>
        <form onSubmit={(e) => { e.preventDefault(); runSearch(search); }} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={inp}
            placeholder="Search name / email / username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" style={btnPrimary}>Search</button>
        </form>

        {loading && <div style={{ color: "#555", fontSize: 12 }}>Loading…</div>}

        {!loading && results && results.length === 0 && (
          <div style={{ color: "#555", fontSize: 12 }}>No customers found.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
          {(results || []).map((c) => (
            <button
              key={c.id}
              onClick={() => openCustomer(c.id)}
              style={{
                textAlign: "left", background: selected?.customer.id === c.id ? "#ff6b3522" : "#12121a",
                border: `1px solid ${selected?.customer.id === c.id ? "#ff6b35" : "#2a2a3a"}`,
                borderRadius: 8, padding: "10px 12px", cursor: "pointer",
              }}
            >
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{displayName(c)}</div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>{c.email}</div>
              <div style={{ color: "#ff6b35", fontSize: 11, marginTop: 4, fontWeight: 700 }}>
                {c.checklist_count} card{c.checklist_count === 1 ? "" : "s"} checked
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected customer's checklist */}
      <div>
        {detailLoading && <div style={{ color: "#555", fontSize: 13 }}>Loading checklist…</div>}

        {!detailLoading && !selected && (
          <div style={{ ...card, color: "#555", fontSize: 13, textAlign: "center", padding: 40 }}>
            Select a customer on the left to see what they have and what they still need.
          </div>
        )}

        {!detailLoading && selected && (
          <>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{displayName(selected.customer)}</div>
              <div style={{ color: "#a0a0b0", fontSize: 12, marginTop: 4 }}>{selected.customer.email}</div>
              {selected.customer.phone_number && (
                <div style={{ color: "#a0a0b0", fontSize: 12, marginTop: 2 }}>{selected.customer.phone_number}</div>
              )}
              <div style={{ color: "#ff6b35", fontSize: 12, marginTop: 8, fontWeight: 700 }}>
                {totalChecked(selected.entries)} cards checked across {Object.keys(selected.entries).length} set{Object.keys(selected.entries).length === 1 ? "" : "s"}
              </div>
            </div>

            {/* Sales totals -- Michael: "Show active orders and their total
                and then customers total sales, must include manual
                invoices." */}
            {salesLoading && <div style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>Loading sales totals…</div>}
            {!salesLoading && sales && (
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: sales.active_orders.length > 0 ? 14 : 0 }}>
                  <div>
                    <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Sales</div>
                    <div style={{ color: "#22c55e", fontSize: 20, fontWeight: 700 }}>{money(sales.total_sales)}</div>
                    <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
                      {money(sales.order_sales_total)} orders + {money(sales.manual_invoice_total)} manual ({sales.manual_invoice_count})
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Active (Orders + Manual)</div>
                    <div style={{ color: "#ff6b35", fontSize: 20, fontWeight: 700 }}>{money(sales.active_orders_total)}</div>
                    <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
                      {sales.active_orders.length} in progress
                    </div>
                  </div>
                </div>

                {sales.active_orders.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sales.active_orders.map((o) => {
                      const colors = o.type === "manual_invoice" ? INVOICE_STATUS_COLOR : STATUS_COLOR;
                      return (
                        <div key={`${o.type}-${o.id}`} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                          background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 12px",
                        }}>
                          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{o.label}</span>
                          <span style={{
                            background: o.type === "manual_invoice" ? "#3a2a12" : "#12121a",
                            color: o.type === "manual_invoice" ? "#ffb74d" : "#a0a0b0",
                            border: "1px solid #2a2a3a", padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                          }}>
                            {o.type === "manual_invoice" ? "MANUAL" : "ORDER"}
                          </span>
                          <span style={{
                            background: colors[o.status] || "#333", color: "#fff", padding: "2px 8px",
                            borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                          }}>
                            {o.status_display}
                          </span>
                          <span style={{ color: "#555", fontSize: 11 }}>{dateFmt(o.created_at)}</span>
                          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginLeft: "auto" }}>{money(o.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {totalChecked(selected.entries) === 0 ? (
              <div style={{ ...card, color: "#555", fontSize: 13, textAlign: "center", padding: 40 }}>
                This customer hasn&apos;t checked off any cards yet.
              </div>
            ) : (
              <FriendChecklistSection entries={selected.entries} ownerLabel={displayName(selected.customer)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StaffChecklistsPage() {
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
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Customer Checklists</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
            Look up any customer to see what they have and what they still need.{" "}
            <Link href="/staff/orders" style={{ color: "#ff6b35" }}>← Orders</Link>
          </p>
        </div>

        <ChecklistsBody />
      </div>
    </div>
  );
}
