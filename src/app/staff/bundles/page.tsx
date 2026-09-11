"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";
import { buildPullSheetHtml, openPullSheet, type PullSheetRow } from "@/lib/pullSheet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Michael, 2026-09-11 (verbatim): "I want to have the checklist import to
// bundles, where it can go through the stock and then tell me when i can
// create bundles of any one of the set variants from the sets (must be
// 90% complete) before it shows. When i accept it gives me a print out of
// the cards available so i can put it up on the site."
//
// Design confirmed via AskUserQuestion, same date:
//  - a card counts as "available" the moment stock > 0 (no min quantity)
//  - lives here, a NEW page on the live site, admin-only (NOT Django admin)
//  - Accept permanently marks the opportunity done so it never reappears,
//    even if stock later drops back under 90%
//
// This page is a SCANNER + PRINTOUT only -- it does not create or manage
// bundle products itself. After Accept, Michael physically pulls the
// printed cards and lists the bundle for sale via the existing "Complete
// Set Bundles" stock tool (/staff/... bundle_stock_entry, Django
// staff_member_required page, linked below).
//
// Mirrors staff/announcements/page.tsx's shape: same dark theme, same
// isStaff gate via localStorage, same authFetch (JWT) pattern.

interface Opportunity {
  card_set_code: string;
  card_set_name: string;
  era: string;
  tier: string;
  tier_label: string;
  owned: number;
  required: number;
  pct: number;
}

interface AcceptedRow {
  card_set_code: string;
  tier: string;
  tier_label: string;
  accepted_at: string;
  accepted_by: string | null;
}

interface PullCard {
  display_num: string;
  card_number: number | null;
  name: string;
  variant: string;
  rarity: string;
  stock: number;
  price: string;
  product_id: number;
}

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };

const TIER_COLOR: Record<string, string> = {
  broke_base: "#607d8b",
  base_set: "#2a7de1",
  special_set_base: "#7c4dff",
  master_set: "#e67e22",
  full_master: "#ffd700",
  complete_set: "#ffd700",
};

function TierBadge({ tier, label }: { tier: string; label: string }) {
  return (
    <span style={{ background: TIER_COLOR[tier] || "#333", color: "#111", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function dateTimeFmt(v: string) {
  if (!v) return "";
  return new Date(v).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Builds and opens the same branded pull-sheet look used everywhere else
// on the site (checklists' Needed/Full List printouts) for the concrete
// in-stock cards behind an accepted opportunity -- price folded into the
// name column since PullSheetRow has no dedicated value field, and this
// sheet doesn't need the Have/Missing checkmark column the checklist ones
// do (every row here is, by definition, in stock right now).
function openBundlePullSheet(opp: { card_set_code: string; card_set_name: string; tier_label: string }, cards: PullCard[]) {
  const rows: PullSheetRow[] = cards.map((c) => ({
    num: c.display_num,
    name: `${c.name} — R${Number(c.price || 0).toFixed(2)}`,
    variant: `${c.variant} ×${c.stock}`,
  }));
  const html = buildPullSheetHtml({
    title: `Bundle Pull List — ${opp.tier_label}`,
    setName: opp.card_set_name,
    setCode: opp.card_set_code,
    customerName: "Staff Pull",
    customerEmail: "",
    rows,
    showHighlighted: false,
  });
  openPullSheet(html);
}

function OpportunityRow({ opp, onAccepted }: { opp: Opportunity; onAccepted: (opp: Opportunity) => void }) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await authFetch(`/api/admin/bundle-opportunities/accept/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_set: opp.card_set_code, tier: opp.tier }),
      });
      if (!res.ok) throw new Error("Failed to accept");
      const data = await res.json();
      openBundlePullSheet(opp, data.cards || []);
      onAccepted(opp);
    } catch {
      setError("Failed to accept — check your connection and try again.");
    } finally { setAccepting(false); }
  };

  return (
    <tr style={{ borderBottom: "1px solid #22222e" }}>
      <td style={{ padding: "8px", color: "#fff", fontWeight: 600 }}>
        {opp.card_set_name} <span style={{ color: "#666", fontWeight: 400 }}>[{opp.card_set_code}]</span>
      </td>
      <td style={{ padding: "8px", color: "#888" }}>{opp.era}</td>
      <td style={{ padding: "8px" }}><TierBadge tier={opp.tier} label={opp.tier_label} /></td>
      <td style={{ padding: "8px", color: "#ccc", whiteSpace: "nowrap" }}>{opp.owned}/{opp.required} ({opp.pct}%)</td>
      <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
        {error && <span style={{ color: "#EF4444", fontSize: 11, marginRight: 8 }}>{error}</span>}
        <button style={btnPrimary} onClick={accept} disabled={accepting}>{accepting ? "…" : "Accept & Print"}</button>
      </td>
    </tr>
  );
}

function OpportunitiesTable() {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [thresholdPct, setThresholdPct] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`/api/admin/bundle-opportunities/scan/`)
      .then((r) => r.json())
      .then((d) => { setOpportunities(d.opportunities || []); setThresholdPct(d.threshold_pct ?? 90); setError(""); })
      .catch((e) => { if (e instanceof SessionExpiredError) setError("Session expired — please log in again."); else setError("Failed to scan stock."); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccepted = (opp: Opportunity) => {
    // Accepting is permanent -- drop it from this list immediately rather
    // than waiting on a full rescan (which would also just exclude it now
    // that a BundleOpportunity row exists for it).
    setOpportunities((prev) => (prev || []).filter((o) => !(o.card_set_code === opp.card_set_code && o.tier === opp.tier)));
  };

  if (loading && !opportunities) return <div style={{ color: "#888", fontSize: 13, padding: 20 }}>Scanning stock…</div>;
  if (error) return <div style={{ color: "#EF4444", fontSize: 13, padding: 20 }}>{error}</div>;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#555", fontSize: 12 }}>Sets/tiers where in-stock cards alone hit {thresholdPct}%+ of that tier&apos;s requirement.</span>
        <button style={btn} onClick={load} disabled={loading}>{loading ? "Scanning…" : "↻ Rescan"}</button>
      </div>
      {!opportunities || opportunities.length === 0 ? (
        <div style={{ color: "#888", fontSize: 13, padding: 20 }}>No qualifying bundle opportunities right now.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#888", borderBottom: "1px solid #2a2a3a" }}>
                <th style={{ padding: "6px 8px" }}>Set</th>
                <th style={{ padding: "6px 8px" }}>Era</th>
                <th style={{ padding: "6px 8px" }}>Tier</th>
                <th style={{ padding: "6px 8px" }}>Stock progress</th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <OpportunityRow key={`${opp.card_set_code}-${opp.tier}`} opp={opp} onAccepted={handleAccepted} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AcceptedHistory() {
  const [rows, setRows] = useState<AcceptedRow[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || rows) return;
    authFetch(`/api/admin/bundle-opportunities/accepted/`)
      .then((r) => r.json())
      .then((d) => setRows(d || []))
      .catch(() => setRows([]));
  }, [open, rows]);

  return (
    <div style={{ marginTop: 20 }}>
      <button style={btn} onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"} accepted history</button>
      {open && (
        <div style={{ ...card, marginTop: 10 }}>
          {!rows ? (
            <div style={{ color: "#888", fontSize: 13 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ color: "#888", fontSize: 13 }}>Nothing accepted yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#888", borderBottom: "1px solid #2a2a3a" }}>
                  <th style={{ padding: "6px 8px" }}>Set</th>
                  <th style={{ padding: "6px 8px" }}>Tier</th>
                  <th style={{ padding: "6px 8px" }}>Accepted</th>
                  <th style={{ padding: "6px 8px" }}>By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.card_set_code}-${r.tier}`} style={{ borderBottom: "1px solid #22222e" }}>
                    <td style={{ padding: "8px", color: "#fff" }}>{r.card_set_code}</td>
                    <td style={{ padding: "8px" }}><TierBadge tier={r.tier} label={r.tier_label} /></td>
                    <td style={{ padding: "8px", color: "#ccc", whiteSpace: "nowrap" }}>{dateTimeFmt(r.accepted_at)}</td>
                    <td style={{ padding: "8px", color: "#888" }}>{r.accepted_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function StaffBundlesPage() {
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
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Bundle Opportunities</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
            Scans current stock against every set&apos;s tier ladder. Accept an opportunity to lock it in and
            print the in-stock pull list, then list it via{" "}
            <a href={`${API_URL}/api/stock/bundles/`} style={{ color: "#ff6b35" }}>Complete Set Bundles →</a>.
            {" · "}<Link href="/staff/announcements" style={{ color: "#ff6b35" }}>Announcements →</Link>
            {" · "}<Link href="/staff/orders" style={{ color: "#ff6b35" }}>Orders →</Link>
            {" · "}<Link href="/staff/checklists" style={{ color: "#ff6b35" }}>Customer Collections →</Link>
          </p>
        </div>

        <OpportunitiesTable />
        <AcceptedHistory />
      </div>
    </div>
  );
}
