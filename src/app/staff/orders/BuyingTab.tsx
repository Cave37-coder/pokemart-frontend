"use client";
import { Fragment, useEffect, useState, useCallback, useRef } from "react";
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
  accessory_id: number | null; // accessory / sealed line (2026-10-26) -- never set together with product_id
  image_url: string | null;
  description: string; set_name: string; card_number: string; variant: string;
  quantity: string; unit_price: string;
  live_stock: number | null;
  tcg_price: number | null; // condition-adjusted reference price (base_tcg x condition multiplier), R each
  base_tcg: number | null;  // NM site price, R each
  pct: string;              // price paid as % of tcg_price (display/entry aid)
  condition: string;        // NM / LP / MP / HP / DMG (non-NM stock goes to the played copy)
  sell_price: string;       // price the card is listed at on the site once completed ("" = leave as is)
  sell_pct: string;         // sell_price as % of tcg_price (entry aid)
  bulk: boolean;            // priced by the flat bulk rule (N / H / RH below the cut-off), not by %
}

// Same multipliers as PokemonProduct.CONDITION_MULTIPLIERS on the backend.
const COND_MULT: Record<string, number> = { NM: 1, LP: 0.8, MP: 0.6, HP: 0.35, DMG: 0.2 };
const CONDITIONS: [string, string][] = [
  ["NM", "Near Mint"], ["LP", "Lightly Played"], ["MP", "Moderately Played"], ["HP", "Heavily Played"], ["DMG", "Damaged"],
];

const round2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
// % of TCG -> R value
const pctToR = (pct: string, tcg: number | null) => {
  const p = parseFloat(pct);
  return tcg && !isNaN(p) ? round2((tcg * p) / 100) : "";
};
// R value -> % of TCG
const rToPct = (r: string, tcg: number | null) => {
  const v = parseFloat(r);
  return tcg && !isNaN(v) ? String(Math.round((v / tcg) * 1000) / 10) : "";
};

interface Analysis {
  invoice_total: string; actual_paid: string; difference: string; allocation_factor: string;
  tcg_total: string; nominal_rate: string | null; effective_rate: string | null;
  expected_sell_total: string; expected_profit: string | null; expected_margin: string | null;
}

interface BuyInvoice {
  id: number; buy_number: string; box_number: number | null; amount_paid: string | null; cost_applied: boolean; premium_accepted?: boolean; analysis: Analysis; status: string; status_display: string; stock_mode: string;
  seller_name: string; seller_email: string; seller_phone: string; user_username: string | null;
  user_id: number | null; user_credit_balance: string | null;
  store_credit_amount: string; amount_owed: string; cash_portion: string;
  seller_note: string; internal_note: string;
  payment_made: boolean; payment_method: string; payment_method_display: string;
  total: string; item_count: number; off_catalogue_units: number;
  created_at: string; completed_at: string | null;
  items: { id: number; product_id: number | null; accessory_id?: number | null; image_url?: string | null; description: string; set_name: string; card_number: string; variant: string; quantity: number; unit_price: string; line_total: string; live_stock: number | null; tcg_price?: string | null; condition?: string; sell_price?: string | null; sell_pct?: string | null; live_price?: string | null; effective_unit_cost: string; effective_rate: string | null }[];
}

interface ApiProduct {
  id: number; name: string; card_set?: { name: string; code: string } | null;
  card_number?: string | number | null; variant_override?: string | null; stock?: number;
  price?: string | number | null;
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

interface BrowseCard {
  id: number; name: string; set_name: string; set_code: string; card_number: string | number;
  variant: string; price: number; stock: number;
}
interface SetOpt { code: string; name: string; release_date: string; era_code: string }

// Same era grouping/order as the Manual Invoice POS + Stock Entry screens.
const ERA_ORDER = ["MEG", "SV", "SWSH", "SM", "XY", "BW", "HGSS", "DP", "EX", "WotCO", "WotCL", "WotCN", "WotC", "OTHER", "PROMO"];
const ERA_LABELS: Record<string, string> = {
  MEG: "Mega Evolution", SV: "Scarlet & Violet", SWSH: "Sword & Shield", SM: "Sun & Moon",
  XY: "XY Era", BW: "Black & White", HGSS: "HG&SS", DP: "D&P / Platinum", EX: "EX Era",
  WotCO: "e-Card", WotCL: "Legendary", WotCN: "Neo", WotC: "WotC Base",
  OTHER: "Special / Other", PROMO: "Promos",
};
// Same variant list as the POS screen (orders/admin.py VARIANT_CHOICES).
const VARIANT_OPTIONS: [string, string][] = [
  ["N", "Normal"], ["H", "Holo"], ["RH", "Reverse Holo"], ["FE", "1st Edition"], ["PB", "Poke Ball"],
  ["MB", "Master Ball"], ["FB", "Friend Ball"], ["LB", "Love Ball"], ["QB", "Quick Ball"], ["DB", "Dusk Ball"],
  ["HR-EX", "Illustration Rare"], ["EX", "Double Rare"], ["GX", "GX"], ["V", "V"], ["VMAX", "VMAX"],
  ["VSTAR", "VSTAR"], ["RR", "Rainbow Rare"], ["RAD", "Radiant"],
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtRelease = (d: string) => {
  const p = (d || "").split("-");
  return p.length === 3 ? `${MONTHS[parseInt(p[1], 10) - 1] || ""} ${p[0]}` : d || "";
};
function groupSets(sets: SetOpt[]) {
  const sorted = sets.slice().sort((a, b) => {
    if (!a.release_date && !b.release_date) return 0;
    if (!a.release_date) return 1;
    if (!b.release_date) return -1;
    return b.release_date.localeCompare(a.release_date);
  });
  const byEra: Record<string, SetOpt[]> = {};
  sorted.forEach((s) => { (byEra[s.era_code || "OTHER"] = byEra[s.era_code || "OTHER"] || []).push(s); });
  const order = [...ERA_ORDER.filter((e) => byEra[e]), ...Object.keys(byEra).filter((e) => !ERA_ORDER.includes(e)).sort()];
  return order.map((e) => ({ era: e, label: ERA_LABELS[e] || e, sets: byEra[e] }));
}

// Same layout idea as the Manual Invoice POS: pick a set to list every card in
// it (or type 2+ characters to search all sets), then click Add / Add all.
// Data: GET /api/orders/admin/buy-invoices/browse/ (staff, JWT).
function CardBrowser({ onAdd, onAddMany, inInvoice }: {
  onAdd: (p: BrowseCard) => void; onAddMany: (ps: BrowseCard[]) => void; inInvoice: Record<number, number>;
}) {
  const [sets, setSets] = useState<SetOpt[]>([]);
  const [setCode, setSetCode] = useState("");
  const [variant, setVariant] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<BrowseCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/sets/`).then((r) => r.json())
      .then((d) => setSets(d.results || []))
      .catch(() => setSets([]));
  }, []);

  // Same logic as the POS screen: every change of set / variant / term
  // re-queries the server (term debounced). No set -> needs 2+ characters.
  useEffect(() => {
    const q = term.trim();
    if (!setCode && q.length < 2) { setResults([]); setErr(""); return; }
    const t = setTimeout(async () => {
      setLoading(true); setErr("");
      try {
        const qs = new URLSearchParams();
        if (q) qs.set("term", q);
        if (setCode) qs.set("set_code", setCode);
        if (variant) qs.set("variant", variant);
        const res = await authFetch(`/api/orders/admin/buy-invoices/browse/?${qs}`);
        if (!res.ok) throw new Error();
        setResults((await res.json()).results || []);
      } catch (e) {
        setErr(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Could not load cards.");
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [setCode, variant, term]);

  const shown = results;

  return (
    <div style={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select style={{ ...inp, flex: 1.6, minWidth: 200 }} value={setCode} onChange={(e) => setSetCode(e.target.value)}>
          <option value="">All sets (free search)</option>
          {groupSets(sets).map((g) => (
            <optgroup key={g.era} label={g.label}>
              {g.sets.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} [{s.code}]{s.release_date ? ` — ${fmtRelease(s.release_date)}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select style={{ ...inp, flex: 1, minWidth: 140 }} value={variant} onChange={(e) => setVariant(e.target.value)}>
          <option value="">All variants</option>
          {VARIANT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input style={{ ...inp, flex: 2, minWidth: 200 }} value={term} onChange={(e) => setTerm(e.target.value)}
          placeholder="Search cards by name or set... (2+ characters), or pick a set above to browse it" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, minHeight: 24 }}>
        <span style={{ fontSize: 11, color: "#888" }}>
          {loading ? "Loading…" : err ? <span style={{ color: "#EF4444" }}>{err}</span> : results.length ? `${shown.length} card(s) shown` : "Pick a set to browse it, or start typing to search."}
        </span>
        {shown.length > 0 && (
          <button style={{ ...btnGreen, background: "#2fbf71", color: "#0d0d12" }} onClick={() => onAddMany(shown)}>
            + Add all shown ({shown.length})
          </button>
        )}
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, alignContent: "start" }}>
        {shown.map((c) => {
          const qty = inInvoice[c.id] || 0;
          return (
            <div key={c.id} style={{ background: "#1a1a24", border: `1px solid ${qty ? "#2fbf71" : "#2a2a3a"}`, borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 6 }}>
                {[!setCode && c.set_name, c.card_number && `#${c.card_number}`, c.variant].filter(Boolean).join(" · ")}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: "#ff6b35", fontWeight: 700 }}>{c.price > 0 ? money(c.price) : "no price"}</span>
                <span style={{ color: c.stock > 0 ? "#4ade80" : "#666" }}>stock {c.stock}</span>
              </div>
              <button style={{ ...btnPrimary, width: "100%" }} onClick={() => onAdd(c)}>
                {qty ? `+ Add another (${qty} on invoice)` : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Accessories & sealed browser (2026-10-26) ----
// Michael: "Can we add a Buy-in sheet for Accessories? Also need to be able to
// [buy in] other products too, how would we add images?" Searches the
// Accessory catalogue (sync_accessories imports the Pokemon TCGCSV accessory
// catalogue at stock 0, so most things are already there). Anything missing
// is added with "+ New product" -- give its TCGplayer product ID and the
// image is copied from TCGplayer to R2 automatically.
// Data: GET /api/orders/admin/buy-invoices/accessories/, POST .../accessories/new/
interface BrowseAccessory {
  id: number; sku: string; name: string; category: string; category_display: string;
  manufacturer: string; price: number; stock: number; image_url: string;
  barcode: string; tcgcsv_product_id: number | null;
}
const ACC_CATEGORIES: [string, string][] = [
  ["playmats", "Playmats"], ["sleeves", "Card Sleeves"], ["deck_boxes", "Deck Boxes"],
  ["storage_tins", "Card Storage Tins"], ["storage_albums", "Storage Albums"], ["protective_pages", "Protective Pages"],
  ["collectible_storage", "Collectible Storage"], ["life_counters", "Life Counters"], ["supply_bundles", "Supply Bundles"],
  ["supplies", "Supplies"], ["sealed", "Sealed Product"], ["other", "Other"],
];

function AccessoryBrowser({ onAdd, inInvoice }: { onAdd: (a: BrowseAccessory) => void; inInvoice: Record<number, number> }) {
  const [category, setCategory] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<BrowseAccessory[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);
  // "+ New product" form
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nCat, setNCat] = useState("sealed");
  const [nPrice, setNPrice] = useState("");
  const [nTid, setNTid] = useState("");
  const [nImg, setNImg] = useState("");
  const [nMfr, setNMfr] = useState("");
  const [nBusy, setNBusy] = useState(false);
  const [nMsg, setNMsg] = useState("");

  useEffect(() => {
    const q = term.trim();
    if (!category && q.length < 2) { setResults([]); setErr(""); return; }
    const t = setTimeout(async () => {
      setLoading(true); setErr("");
      try {
        const qs = new URLSearchParams();
        if (q) qs.set("term", q);
        if (category) qs.set("category", category);
        const res = await authFetch(`/api/orders/admin/buy-invoices/accessories/?${qs}`);
        if (!res.ok) throw new Error();
        setResults((await res.json()).results || []);
      } catch (e) {
        setErr(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Could not load products.");
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [category, term, reload]);

  const createNew = async () => {
    setNBusy(true); setNMsg("");
    try {
      const res = await authFetch("/api/orders/admin/buy-invoices/accessories/new/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nName, category: nCat, price: nPrice, tcgcsv_product_id: nTid, image_url: nImg, manufacturer: nMfr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNMsg(data.error || "Could not add the product."); return; }
      onAdd(data.result);
      setNMsg(data.message || "Added.");
      setNName(""); setNPrice(""); setNTid(""); setNImg(""); setNMfr("");
      setShowNew(false); setReload((n) => n + 1);
    } catch (e) {
      setNMsg(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Failed — check your connection.");
    } finally { setNBusy(false); }
  };

  return (
    <div style={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select style={{ ...inp, flex: 1, minWidth: 170 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories (search)</option>
          {ACC_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input style={{ ...inp, flex: 2, minWidth: 220 }} value={term} onChange={(e) => setTerm(e.target.value)}
          placeholder="Search playmats, sleeves, ETBs… by name, SKU, barcode or TCGplayer ID" />
        <button style={btn} onClick={() => setShowNew((v) => !v)}>{showNew ? "Close new product" : "+ New product"}</button>
      </div>

      {showNew && (
        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 8, padding: 10, marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 220 }}><label style={lbl}>Name *</label><input style={{ ...inp, width: "100%" }} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Prismatic Evolutions Super-Premium Collection Playmat" /></div>
          <div style={{ width: 160 }}><label style={lbl}>Category</label>
            <select style={{ ...inp, width: "100%" }} value={nCat} onChange={(e) => setNCat(e.target.value)}>
              {ACC_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div style={{ width: 110 }}><label style={lbl}>Site sell price (R)</label><input style={{ ...inp, width: "100%" }} type="number" min="0" step="0.5" value={nPrice} onChange={(e) => setNPrice(e.target.value)} /></div>
          <div style={{ width: 130 }}><label style={lbl}>TCGplayer product ID</label><input style={{ ...inp, width: "100%" }} value={nTid} onChange={(e) => setNTid(e.target.value)} placeholder="for the image" /></div>
          <div style={{ flex: 1, minWidth: 180 }}><label style={lbl}>…or image URL</label><input style={{ ...inp, width: "100%" }} value={nImg} onChange={(e) => setNImg(e.target.value)} placeholder="https://…" /></div>
          <div style={{ width: 140 }}><label style={lbl}>Manufacturer</label><input style={{ ...inp, width: "100%" }} value={nMfr} onChange={(e) => setNMfr(e.target.value)} placeholder="Pokémon" /></div>
          <button style={btnPrimary} onClick={createNew} disabled={nBusy || !nName.trim()}>{nBusy ? "Adding…" : "Add & put on invoice"}</button>
          <div style={{ width: "100%", fontSize: 10, color: "#888" }}>
            The image is copied to images.pokebulk.co.za (R2). Starts with 0 stock — stock is added when you Complete the invoice. You can upload your own photo later in Django admin → Accessories.
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, minHeight: 16 }}>
        {loading ? "Loading…" : err ? <span style={{ color: "#EF4444" }}>{err}</span> : nMsg ? <span style={{ color: "#4ade80" }}>{nMsg}</span>
          : results.length ? `${results.length} product(s) shown` : "Pick a category or type to search. Not listed? Use + New product."}
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, alignContent: "start" }}>
        {results.map((a) => {
          const qty = inInvoice[a.id] || 0;
          return (
            <div key={a.id} style={{ background: "#1a1a24", border: `1px solid ${qty ? "#2fbf71" : "#2a2a3a"}`, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#12121a", borderRadius: 6 }}>
                {a.image_url ? <img src={a.image_url} alt="" style={{ maxHeight: 76, maxWidth: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: "#555" }}>no image</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{a.name}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{[a.category_display, a.sku].filter(Boolean).join(" · ")}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "#ff6b35", fontWeight: 700 }}>{a.price > 0 ? money(a.price) : "no price"}</span>
                <span style={{ color: a.stock > 0 ? "#4ade80" : "#666" }}>stock {a.stock}</span>
              </div>
              <button style={{ ...btnPrimary, width: "100%" }} onClick={() => onAdd(a)}>
                {qty ? `+ Add another (${qty} on invoice)` : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const isCatalogue = (l: BuyLine) => !!(l.product_id || l.accessory_id);

const profitOf = (l: BuyLine) => {
  const sell = parseFloat(l.sell_price), paid = parseFloat(l.unit_price);
  return !isCatalogue(l) || isNaN(sell) || sell <= 0 ? null : sell - (isNaN(paid) ? 0 : paid);
};
const profitText = (l: BuyLine) => { const p = profitOf(l); return p === null ? "—" : `${p >= 0 ? "+" : "-"}${money(Math.abs(p))}`; };
const profitColor = (l: BuyLine) => { const p = profitOf(l); return p === null ? "#666" : p >= 0 ? "#4ade80" : "#EF4444"; };

// ---- Seller account link (2026-10-27) ----
// Store credit always goes onto a site account, so the seller has to be
// linked to one before any of the payout can be given as credit.
// Data: GET /api/auth/admin/customers/?search= (staff, JWT).
interface CustomerHit {
  id: number; username: string; email: string; first_name: string; last_name: string;
  phone_number?: string; store_credit_balance?: string;
}
function SellerAccountPicker({ linked, onLink, disabled }: {
  linked: { id: number; username: string; balance: string | null } | null;
  onLink: (c: CustomerHit | null) => void; disabled: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/auth/admin/customers/?search=${encodeURIComponent(term)}`);
        setHits(res.ok ? (await res.json()).slice(0, 8) : []);
      } catch { setHits([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  if (linked) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4ade80" }}>
        🔗 @{linked.username}
        {linked.balance !== null && <span style={{ color: "#888" }}>· credit balance {money(linked.balance)}</span>}
        {!disabled && <button style={btn} onClick={() => onLink(null)}>Unlink</button>}
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      <input style={{ ...inp, width: "100%" }} value={q} disabled={disabled} onChange={(e) => setQ(e.target.value)}
        placeholder="Search site account by name, username or email (needed for store credit)" />
      {hits.length > 0 && (
        <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, marginTop: 2 }}>
          {hits.map((c) => (
            <div key={c.id} onClick={() => { onLink(c); setQ(""); setHits([]); }}
              style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, color: "#ddd", borderBottom: "1px solid #2a2a3a" }}>
              {`${c.first_name} ${c.last_name}`.trim() || c.username} <span style={{ color: "#888" }}>@{c.username} · {c.email}</span>
              {c.store_credit_balance && parseFloat(c.store_credit_balance) > 0 && <span style={{ color: "#4ade80" }}> · credit {money(c.store_credit_balance)}</span>}
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
  const [boxNumber, setBoxNumber] = useState(initial?.box_number ? String(initial.box_number) : "");
  const [sellerNote, setSellerNote] = useState(initial?.seller_note || "");
  const [linked, setLinked] = useState<{ id: number; username: string; balance: string | null } | null>(
    initial?.user_id && initial.user_username ? { id: initial.user_id, username: initial.user_username, balance: initial.user_credit_balance } : null);
  const [creditAmt, setCreditAmt] = useState(initial && parseFloat(initial.store_credit_amount) > 0 ? String(initial.store_credit_amount) : "");
  const [internalNote, setInternalNote] = useState(initial?.internal_note || "");
  // Default buy-in % applied to each newly added card (editable per line).
  const [defaultPct, setDefaultPct] = useState("80");
  // Optional sell % applied to every catalogue line on request (e.g. 120 = 1.2 x site price).
  const [bulkSellPct, setBulkSellPct] = useState("120");
  // Flat bulk buy-in prices (Michael, 2026-10-15): Normal 40c, Holo / Reverse Holo R1,
  // only for cards whose site price is under the cut-off. Everything else uses the %.
  const [bulkOn, setBulkOn] = useState(true);
  const [bulkN, setBulkN] = useState("0.40");
  const [bulkH, setBulkH] = useState("1.00");
  const [bulkCutoff, setBulkCutoff] = useState("10");
  const [lines, setLines] = useState<BuyLine[]>(
    (initial?.items || []).map((i) => {
      const tcg = i.tcg_price ? parseFloat(i.tcg_price) : null; // already condition-adjusted (server snapshot)
      const base = tcg ? tcg / (COND_MULT[i.condition || "NM"] || 1) : null;
      return {
        key: newKey(), product_id: i.product_id, accessory_id: i.accessory_id ?? null, image_url: i.image_url ?? null,
        description: i.description, set_name: i.set_name,
        card_number: i.card_number, variant: i.variant, quantity: String(i.quantity), unit_price: String(i.unit_price),
        live_stock: i.live_stock, tcg_price: tcg, base_tcg: base, pct: rToPct(String(i.unit_price), tcg),
        condition: i.condition || "NM", sell_price: i.sell_price ? String(i.sell_price) : "", sell_pct: i.sell_price ? rToPct(String(i.sell_price), tcg) : "", bulk: false,
      };
    })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [browseMode, setBrowseMode] = useState<"cards" | "accessories">("cards");

  const makeLine = (p: BrowseCard): BuyLine => {
    const tcg = p.price > 0 ? p.price : null;
    const variant = p.variant || "N";
    const bulkPrice = bulkOn && tcg !== null && tcg < (parseFloat(bulkCutoff) || 0)
      ? (variant === "N" ? bulkN : variant === "H" || variant === "RH" ? bulkH : "") : "";
    const bulk = bulkPrice !== "" && !isNaN(parseFloat(bulkPrice));
    const unit = bulk ? round2(parseFloat(bulkPrice)) : pctToR(defaultPct, tcg);
    return {
      key: newKey(), product_id: p.id, accessory_id: null, image_url: null, description: p.name, set_name: p.set_name,
      card_number: p.card_number ? String(p.card_number) : "", variant,
      quantity: "1", unit_price: unit, live_stock: p.stock,
      tcg_price: tcg, base_tcg: tcg, pct: bulk ? rToPct(unit, tcg) : tcg ? defaultPct : "",
      condition: "NM", sell_price: "", sell_pct: "", bulk,
    };
  };
  // Adding a card already on the invoice bumps its quantity instead of duplicating it.
  const addCards = (ps: BrowseCard[]) => setLines((ls) => {
    const out = [...ls];
    for (const p of ps) {
      const i = out.findIndex((l) => l.product_id === p.id);
      if (i >= 0) out[i] = { ...out[i], quantity: String((parseInt(out[i].quantity) || 0) + 1) };
      else out.push(makeLine(p));
    }
    return out;
  });
  const inInvoice: Record<number, number> = {};
  lines.forEach((l) => { if (l.product_id) inInvoice[l.product_id] = parseInt(l.quantity) || 0; });
  // Accessory lines: reference price = current site price; buy-in at the
  // default %; sell price left blank = keep the site price.
  const makeAccLine = (a: BrowseAccessory): BuyLine => {
    const ref = a.price > 0 ? a.price : null;
    return {
      key: newKey(), product_id: null, accessory_id: a.id, image_url: a.image_url || null,
      description: a.name, set_name: a.category_display, card_number: "", variant: "",
      quantity: "1", unit_price: pctToR(defaultPct, ref), live_stock: a.stock,
      tcg_price: ref, base_tcg: ref, pct: ref ? defaultPct : "",
      condition: "NM", sell_price: "", sell_pct: "", bulk: false,
    };
  };
  const addAccessory = (a: BrowseAccessory) => setLines((ls) => {
    const i = ls.findIndex((l) => l.accessory_id === a.id);
    if (i >= 0) return ls.map((l, n) => n === i ? { ...l, quantity: String((parseInt(l.quantity) || 0) + 1) } : l);
    return [...ls, makeAccLine(a)];
  });
  const accInInvoice: Record<number, number> = {};
  lines.forEach((l) => { if (l.accessory_id) accInInvoice[l.accessory_id] = parseInt(l.quantity) || 0; });
  const addFree = () => setLines((ls) => [...ls, {
    key: newKey(), product_id: null, accessory_id: null, image_url: null, description: "", set_name: "", card_number: "", variant: "",
    quantity: "1", unit_price: "", live_stock: null, tcg_price: null, base_tcg: null, pct: "",
    condition: "NM", sell_price: "", sell_pct: "", bulk: false,
  }]);
  const applyPctToAll = () => setLines((ls) => ls.map((l) =>
    isCatalogue(l) && l.tcg_price && !l.bulk ? { ...l, pct: defaultPct, unit_price: pctToR(defaultPct, l.tcg_price) } : l));
  const applySellPctToAll = () => setLines((ls) => ls.map((l) =>
    isCatalogue(l) && l.tcg_price ? { ...l, sell_pct: bulkSellPct, sell_price: pctToR(bulkSellPct, l.tcg_price) } : l));
  // Changing condition rescales the reference price (NM x multiplier) and
  // re-prices the line: buy-in R and sell R keep their % of the new price.
  const setCondition = (key: string, condition: string) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const tcg = l.base_tcg ? Math.round(l.base_tcg * (COND_MULT[condition] ?? 1) * 100) / 100 : null;
    return {
      ...l, condition, tcg_price: tcg,
      unit_price: l.bulk ? l.unit_price : l.pct && tcg ? pctToR(l.pct, tcg) : l.unit_price,
      pct: l.bulk ? rToPct(l.unit_price, tcg) : l.pct,
      sell_price: l.sell_pct && tcg ? pctToR(l.sell_pct, tcg) : l.sell_price,
    };
  }));
  const upd = (key: string, patch: Partial<BuyLine>) => setLines((ls) => ls.map((l) => l.key === key ? { ...l, ...patch } : l));
  const del = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const total = lines.reduce((s, l) => s + (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0), 0);
  const units = lines.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);
  const offCat = lines.filter((l) => !isCatalogue(l)).reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        seller_name: sellerName, seller_email: sellerEmail, seller_phone: sellerPhone,
        seller_note: sellerNote, internal_note: internalNote,
      };
      if (boxNumber.trim()) body.box_number = boxNumber.trim(); // blank = keep the auto-assigned box
      body.user_id = linked ? linked.id : null;
      if (!locked) body.store_credit_amount = linked && creditAmt.trim() ? creditAmt.trim() : "0";
      if (!locked) {
        body.items = lines.map((l) => ({
          product_id: l.product_id, accessory_id: l.accessory_id, description: l.description, set_name: l.set_name,
          card_number: l.card_number, variant: l.variant, quantity: l.quantity, unit_price: l.unit_price || "0",
          condition: l.condition, sell_price: isCatalogue(l) ? l.sell_price : "",
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
        <div style={{ width: 120 }}><label style={lbl}>Box #</label><input style={{ ...inp, width: "100%" }} type="number" min="1" value={boxNumber} placeholder={initial ? "" : "Auto"} onChange={(e) => setBoxNumber(e.target.value)} /></div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 8, padding: 10 }}>
        <div style={{ flex: 2, minWidth: 260 }}>
          <label style={lbl}>Seller's site account</label>
          <SellerAccountPicker linked={linked} disabled={locked && parseFloat(creditAmt || "0") > 0}
            onLink={(c) => {
              if (!c) { setLinked(null); setCreditAmt(""); return; }
              setLinked({ id: c.id, username: c.username, balance: c.store_credit_balance ?? null });
              if (!sellerName.trim()) setSellerName(`${c.first_name} ${c.last_name}`.trim() || c.username);
              if (!sellerEmail.trim()) setSellerEmail(c.email || "");
              if (!sellerPhone.trim() && c.phone_number) setSellerPhone(c.phone_number);
            }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={lbl}>Pay as store credit (R)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...inp, width: 110 }} type="number" min="0" step="0.01" value={creditAmt} disabled={locked || !linked}
              onChange={(e) => setCreditAmt(e.target.value)} placeholder={linked ? "0.00" : "link account"} />
            <button style={btn} disabled={locked || !linked} onClick={() => setCreditAmt(round2(total))}>All as credit</button>
            <button style={btn} disabled={locked || !linked} onClick={() => setCreditAmt("")}>None</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#888", flexBasis: "100%" }}>
          {linked && parseFloat(creditAmt || "0") > 0
            ? <>Seller gets <strong style={{ color: "#4ade80" }}>{money(creditAmt)}</strong> store credit
                {total - parseFloat(creditAmt) >= 0.005 && <> + <strong style={{ color: "#fff" }}>{money(total - parseFloat(creditAmt))}</strong> by cash / EFT / card</>}.
                Credit is added to their account when you mark the invoice Paid (R1 payout = R1 credit).</>
            : "Optional: give all or part of the payout as store credit. The seller must be linked to their site account."}
          {locked && <span style={{ color: "#e0b050" }}> Store credit can only be changed while the invoice is a Draft.</span>}
        </div>
      </div>

      {locked ? (
        <div style={{ fontSize: 11, color: "#e0b050" }}>This invoice is {initial?.status_display}. Lines are locked — use “Back to draft” on the list to change them.</div>
      ) : (
        <>
        <div style={{ display: "flex", gap: 6 }}>
          {([["cards", "Cards"], ["accessories", "Accessories & sealed"]] as const).map(([m, label]) => (
            <button key={m} style={browseMode === m ? btnPrimary : btn} onClick={() => setBrowseMode(m)}>{label}</button>
          ))}
        </div>
        {browseMode === "cards"
          ? <CardBrowser onAdd={(c) => addCards([c])} onAddMany={addCards} inInvoice={inInvoice} />
          : <AccessoryBrowser onAdd={addAccessory} inInvoice={accInInvoice} />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button style={btn} onClick={addFree}>+ Off-catalogue line</button>
          <span style={{ fontSize: 11, color: "#888", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Default buy-in
            <input style={{ ...inp, width: 60 }} type="number" min="0" step="0.5" value={defaultPct} onChange={(e) => setDefaultPct(e.target.value)} />
            % of site price
            <button style={btn} onClick={applyPctToAll}>Apply to all</button>
          </span>
          <span style={{ fontSize: 11, color: "#888", display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={bulkOn} onChange={(e) => setBulkOn(e.target.checked)} /> Bulk prices
            </label>
            N R<input style={{ ...inp, width: 56 }} type="number" min="0" step="0.05" value={bulkN} onChange={(e) => setBulkN(e.target.value)} />
            H / RH R<input style={{ ...inp, width: 56 }} type="number" min="0" step="0.05" value={bulkH} onChange={(e) => setBulkH(e.target.value)} />
            if site price under R<input style={{ ...inp, width: 56 }} type="number" min="0" step="1" value={bulkCutoff} onChange={(e) => setBulkCutoff(e.target.value)} />
          </span>
          <span style={{ fontSize: 11, color: "#888", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Sell at
            <input style={{ ...inp, width: 60 }} type="number" min="0" step="1" value={bulkSellPct} onChange={(e) => setBulkSellPct(e.target.value)} />
            % of site price
            <button style={btn} onClick={applySellPctToAll}>Apply to all</button>
          </span>
        </div>
        </>
      )}

      {lines.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
                {["Card / description", "Set · # · Var", "Stock now", "Qty", "Cond. price", "% of price", "Price paid (R each)", "Sell % of price", "Sell price (R)", "Profit / card", "Line total", ""].map((h) => (
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
                      {l.accessory_id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {l.image_url && <img src={l.image_url} alt="" style={{ height: 28, width: 28, objectFit: "contain" }} />}
                          {l.description}
                        </span>
                      ) : l.product_id ? l.description : (
                        <input style={{ ...inp, width: "100%" }} value={l.description} disabled={locked}
                          onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="e.g. Bulk lot of commons (no stock added)" />
                      )}
                      {l.accessory_id && <div style={{ color: "#60a5fa", fontSize: 9 }}>accessory / sealed — stock added on Complete</div>}
                      {!isCatalogue(l) && <div style={{ color: "#e0b050", fontSize: 9 }}>off-catalogue — adds no stock</div>}
                      {l.bulk && <div style={{ color: "#4ade80", fontSize: 9 }}>bulk price</div>}
                      {l.product_id && (
                        <select style={{ ...inp, padding: "3px 6px", fontSize: 11, marginTop: 4 }} value={l.condition} disabled={locked}
                          onChange={(e) => setCondition(l.key, e.target.value)}>
                          {CONDITIONS.map(([c, n]) => <option key={c} value={c}>{c} — {n} ({Math.round(COND_MULT[c] * 100)}%)</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#888" }}>{[l.set_name, l.card_number && `#${l.card_number}`, l.variant].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#888" }}>{l.live_stock ?? "—"}</td>
                    <td style={{ padding: "6px 8px" }}><input style={{ ...inp, width: 60 }} type="number" min="1" value={l.quantity} disabled={locked} onChange={(e) => upd(l.key, { quantity: e.target.value })} /></td>
                    <td style={{ padding: "6px 8px", fontSize: 12, color: "#ddd", fontWeight: 600 }}>{l.tcg_price ? money(l.tcg_price) : "—"}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, width: 64 }} type="number" min="0" step="0.5" value={l.pct} disabled={locked || !l.tcg_price}
                        onChange={(e) => upd(l.key, { pct: e.target.value, unit_price: pctToR(e.target.value, l.tcg_price), bulk: false })} placeholder="%" />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, width: 90 }} type="number" min="0" step="0.01" value={l.unit_price} disabled={locked}
                        onChange={(e) => upd(l.key, { unit_price: e.target.value, pct: rToPct(e.target.value, l.tcg_price), bulk: false })} placeholder="0.00" />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, width: 64 }} type="number" min="0" step="1" value={l.sell_pct} disabled={locked || !isCatalogue(l) || !l.tcg_price}
                        onChange={(e) => upd(l.key, { sell_pct: e.target.value, sell_price: pctToR(e.target.value, l.tcg_price) })} placeholder="%" />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input style={{ ...inp, width: 90 }} type="number" min="0" step="0.01" value={l.sell_price} disabled={locked || !isCatalogue(l)}
                        onChange={(e) => upd(l.key, { sell_price: e.target.value, sell_pct: rToPct(e.target.value, l.tcg_price) })} placeholder="keep" />
                    </td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: profitColor(l) }}>{profitText(l)}</td>
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
        {lines.some((l) => isCatalogue(l) && parseFloat(l.sell_price) > 0) && (
          <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
            Lines with a sell price are listed at that price when you Complete the invoice and are then kept at that % of TCG (adjusted for condition) by the nightly price update, so they follow TCG and the exchange rate. Lines left blank keep the normal site price. Non-NM conditions are added to the played copy of the card. Accessory / sealed lines are listed at their sell price on Complete and that price is kept (the accessory sync won't overwrite it).
          </div>
        )}
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

// ---- Cost panel: actual amount paid, real cost per card, rates, expected profit ----
function CostPanel({ inv, onChanged }: { inv: BuyInvoice; onChanged: (msg: string) => void }) {
  const [paid, setPaid] = useState(inv.amount_paid ?? "");
  const [target, setTarget] = useState("80");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const a = inv.analysis;
  const diff = parseFloat(a.difference);
  const premium = !!inv.premium_accepted;
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setErr("");
    try {
      const res = await authFetch(`/api/orders/admin/buy-invoices/${inv.id}/action/`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body.error || "Failed."); return; }
      onChanged(`${inv.buy_number}: ${body.message}`);
    } catch (e) {
      setErr(e instanceof SessionExpiredError ? "Session expired — please sign in again." : "Request failed.");
    } finally { setBusy(false); }
  };
  const tgt = parseFloat(target) || 0;
  return (
    <div style={{ background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 10, padding: 12, margin: "4px 0 10px" }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
        <div><label style={lbl}>Invoice total (line prices)</label><div style={{ color: "#fff", fontWeight: 700 }}>{money(a.invoice_total)}</div></div>
        <div>
          <label style={lbl}>Actually paid to seller (R)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...inp, width: 110 }} type="number" min="0" step="0.01" value={paid} placeholder={a.invoice_total} onChange={(e) => setPaid(e.target.value)} />
            <button style={btnPrimary} disabled={busy} onClick={() => run("set_amount_paid", { amount_paid: paid })}>Save</button>
          </div>
        </div>
        <div><label style={lbl}>Difference</label>
          <div style={{ color: diff > 0 ? "#4ade80" : diff < 0 ? (premium ? "#38bdf8" : "#EF4444") : "#888", fontWeight: 700 }}>
            {diff > 0 ? `saved ${money(diff)}` : diff < 0 ? `paid ${money(-diff)} MORE${inv.premium_accepted ? " (premium accepted)" : ""}` : "none"}
          </div></div>
        <div><label style={lbl}>Premium accepted</label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#ddd", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={!!inv.premium_accepted} disabled={busy}
              onChange={(e) => run("set_premium", { premium_accepted: e.target.checked })} />
            Paid extra on purpose (secure supply)
          </label></div>
        <div><label style={lbl}>Rate of TCG: invoice → actual</label>
          <div style={{ color: "#fff", fontWeight: 700 }}>{a.nominal_rate ?? "—"}% → {a.effective_rate ?? "—"}%</div></div>
        <div><label style={lbl}>Expected profit (lines with a sell price)</label>
          <div style={{ color: "#fff", fontWeight: 700 }}>{a.expected_profit !== null ? `${money(a.expected_profit)} (${a.expected_margin}% margin)` : "—"}</div></div>
        <div><label style={lbl}>Target rate %</label>
          <input style={{ ...inp, width: 64 }} type="number" min="0" step="1" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
        Each card&apos;s real cost = its line price × {a.allocation_factor} (actual paid ÷ invoice total). Lines whose real rate is above your target are flagged red — that is where we overpaid{premium ? " (premium accepted: shown in blue instead)" : ""}.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid #2a2a3a" }}>
          {["Card", "Cond", "Qty", "TCG price", "Invoice price", "Real cost", "Real rate", "Sells at (now)", "Profit / card", "Margin"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {inv.items.map((i) => {
            const rate = i.effective_rate !== null ? parseFloat(i.effective_rate) : null;
            const over = !premium && rate !== null && tgt > 0 && rate > tgt;
            // Completed invoices use the live site price (moves with TCG / exchange rate); drafts use the planned price.
            const sell = i.sell_price ? parseFloat(inv.status === "complete" && i.live_price ? i.live_price : i.sell_price) : null;
            const profit = sell !== null ? sell - parseFloat(i.effective_unit_cost) : null;
            return (
              <tr key={i.id} style={{ borderBottom: "1px solid #1f1f2b" }}>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#ddd" }}>{i.description} <span style={{ color: "#666" }}>{[i.card_number && `#${i.card_number}`, i.variant].filter(Boolean).join(" · ")}</span></td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>{i.condition || "NM"}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>{i.quantity}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>{i.tcg_price ? money(i.tcg_price) : "—"}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>{money(i.unit_price)}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#fff", fontWeight: 700 }}>{money(i.effective_unit_cost)}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, color: over ? "#EF4444" : premium && rate !== null && tgt > 0 && rate > tgt ? "#38bdf8" : "#4ade80" }}>{rate !== null ? `${rate}%` : "—"}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>{sell !== null ? money(sell) : "—"}</td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: profit === null ? "#666" : profit >= 0 ? "#4ade80" : "#EF4444" }}>
                  {profit === null ? "—" : `${profit >= 0 ? "+" : "-"}${money(Math.abs(profit))}`}
                </td>
                <td style={{ padding: "4px 8px", fontSize: 11, color: profit === null ? "#666" : profit >= 0 ? "#4ade80" : "#EF4444" }}>
                  {profit === null || !sell ? "—" : `${Math.round((profit / sell) * 1000) / 10}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        {inv.status === "complete" && !inv.cost_applied && (
          <button style={btnGreen} disabled={busy}
            onClick={() => window.confirm("Record this invoice's cost against the units still in stock? (For invoices completed before cost tracking existed. Can be done once.)") && run("apply_cost")}>
            📒 Record cost against stock
          </button>
        )}
        {inv.status === "complete" && inv.cost_applied && <span style={{ fontSize: 11, color: "#4ade80" }}>✔ Cost recorded against stock — saving a new amount re-prices it.</span>}
        {err && <span style={{ color: "#EF4444", fontSize: 12 }}>{err}</span>}
      </div>
    </div>
  );
}

// ---- Trace a card: where stock came from (invoice / box / real cost) and what it sold for ----
interface Trace {
  product: { id: number; name: string; set_name: string; card_number: string; variant: string; condition: string; stock: number; price: string; price_locked: boolean; cost_units: number; avg_cost: string | null; cost_on_hand: string };
  purchases: { buy_number: string; box_number: number | null; seller: string; date: string; quantity: number; condition: string; invoice_price: string; real_cost: string; sell_price: string | null }[];
  sales: { source: string; date: string; quantity: number; price: string; unit_cost: string | null }[];
  sales_summary: { units_costed: number; revenue: string; cost: string; profit: string };
}

function TracePanel() {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<BrowseCard[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/orders/admin/buy-invoices/browse/?term=${encodeURIComponent(q)}`);
        if (res.ok) setHits((await res.json()).results || []);
      } catch { setHits([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [term]);
  const load = async (id: number) => {
    setErr(""); setHits([]); setTerm("");
    try {
      const res = await authFetch(`/api/orders/admin/buy-invoices/trace/?product_id=${id}`);
      if (!res.ok) throw new Error();
      setTrace(await res.json());
    } catch { setErr("Could not load the trace."); }
  };
  const th = (h: string) => <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>;
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
        <strong style={{ color: "#fff", fontSize: 13 }}>🔎 Trace a card</strong>
        <input style={{ ...inp, width: 320 }} value={term} placeholder="Search a card (2+ characters)…" onChange={(e) => setTerm(e.target.value)} />
        {trace && <button style={btn} onClick={() => setTrace(null)}>Clear</button>}
        {hits.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 120, zIndex: 30, width: 420, maxHeight: 280, overflowY: "auto", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 8 }}>
            {hits.map((h) => (
              <div key={h.id} onClick={() => load(h.id)} style={{ padding: "7px 10px", fontSize: 12, color: "#ddd", cursor: "pointer", borderBottom: "1px solid #2a2a3a" }}>
                {h.name} <span style={{ color: "#666" }}>{h.set_name} #{h.card_number} · {h.variant || "N"} · stock {h.stock}</span>
              </div>
            ))}
          </div>
        )}
        {err && <span style={{ color: "#EF4444", fontSize: 12 }}>{err}</span>}
      </div>
      {trace && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
            {trace.product.name} <span style={{ color: "#888", fontWeight: 400 }}>{trace.product.set_name} #{trace.product.card_number} · {trace.product.variant} · {trace.product.condition}</span>
          </div>
          <div style={{ fontSize: 12, color: "#a0a0b0", marginBottom: 10 }}>
            In stock: <b style={{ color: "#fff" }}>{trace.product.stock}</b> · Site price: <b style={{ color: "#fff" }}>{money(trace.product.price)}</b>{trace.product.price_locked ? " 🔒" : ""} ·
            Average cost: <b style={{ color: "#fff" }}>{trace.product.avg_cost ? money(trace.product.avg_cost) : "unknown"}</b> over {trace.product.cost_units} costed unit(s) ({money(trace.product.cost_on_hand)} on hand)
          </div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>PURCHASES (completed buying invoices)</div>
          {trace.purchases.length === 0 ? <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>None recorded.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
              <thead><tr>{["Invoice", "Box", "Seller", "Date", "Qty", "Cond", "Invoice price", "Real cost", "Sell price"].map(th)}</tr></thead>
              <tbody>{trace.purchases.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid #2a2a3a", fontSize: 11, color: "#ddd" }}>
                  <td style={{ padding: "4px 8px" }}>{p.buy_number}</td><td style={{ padding: "4px 8px" }}>{p.box_number ? `📦 ${p.box_number}` : "—"}</td>
                  <td style={{ padding: "4px 8px" }}>{p.seller}</td><td style={{ padding: "4px 8px" }}>{dateFmt(p.date)}</td>
                  <td style={{ padding: "4px 8px" }}>{p.quantity}</td><td style={{ padding: "4px 8px" }}>{p.condition}</td>
                  <td style={{ padding: "4px 8px" }}>{money(p.invoice_price)}</td><td style={{ padding: "4px 8px", fontWeight: 700 }}>{money(p.real_cost)}</td>
                  <td style={{ padding: "4px 8px" }}>{p.sell_price ? money(p.sell_price) : "—"}</td>
                </tr>))}</tbody>
            </table>
          )}
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            SALES — {trace.sales_summary.units_costed} costed unit(s): revenue {money(trace.sales_summary.revenue)}, cost {money(trace.sales_summary.cost)},
            profit <b style={{ color: parseFloat(trace.sales_summary.profit) >= 0 ? "#4ade80" : "#EF4444" }}>{money(trace.sales_summary.profit)}</b>
          </div>
          {trace.sales.length === 0 ? <div style={{ fontSize: 12, color: "#555" }}>No sales yet.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Sold on", "Date", "Qty", "Sold at", "Cost", "Profit / card"].map(th)}</tr></thead>
              <tbody>{trace.sales.map((r, i) => {
                const pf = r.unit_cost !== null ? parseFloat(r.price) - parseFloat(r.unit_cost) : null;
                return (
                  <tr key={i} style={{ borderTop: "1px solid #2a2a3a", fontSize: 11, color: "#ddd" }}>
                    <td style={{ padding: "4px 8px" }}>{r.source}</td><td style={{ padding: "4px 8px" }}>{dateFmt(r.date)}</td>
                    <td style={{ padding: "4px 8px" }}>{r.quantity}</td><td style={{ padding: "4px 8px" }}>{money(r.price)}</td>
                    <td style={{ padding: "4px 8px" }}>{r.unit_cost !== null ? money(r.unit_cost) : "unknown"}</td>
                    <td style={{ padding: "4px 8px", color: pf === null ? "#666" : pf >= 0 ? "#4ade80" : "#EF4444" }}>{pf === null ? "—" : `${pf >= 0 ? "+" : "-"}${money(Math.abs(pf))}`}</td>
                  </tr>);
              })}</tbody>
            </table>
          )}
        </div>
      )}
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
  const [openCost, setOpenCost] = useState<number | null>(null);

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
    if (!window.confirm(`Email the client copy of ${inv.buy_number} to ${inv.seller_email || "the seller"}? This sends a real email immediately.`)) return;
    window.open(`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-email/`, "_blank");
  };

  return (
    <div>
      <TracePanel />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btnPrimary} onClick={() => setEditing("new")}>+ New Buying Invoice</button>
        <select style={inp} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input style={inp} value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} placeholder="Search seller / BUY-# / box #…" />
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
                {["Invoice", "Box", "Seller", "Status", "Items", "Total", "Payment", "Date", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.results.map((inv) => {
                const legacy = inv.stock_mode !== "site";
                const busy = busyId === inv.id;
                return (
                  <Fragment key={inv.id}>
                  <tr style={{ borderBottom: "1px solid #2a2a3a", verticalAlign: "top" }}>
                    <td style={{ padding: "8px", fontSize: 12 }}>
                      <a href={`${API_URL}/admin/orders/buyorder/${inv.id}/change/`} target="_blank" rel="noreferrer" style={{ color: "#ff6b35", fontWeight: 700 }}>{inv.buy_number}</a>
                      {legacy && <div style={{ color: "#666", fontSize: 9 }}>legacy POS</div>}
                    </td>
                    <td style={{ padding: "8px", fontSize: 13, fontWeight: 700, color: "#fff" }}>{inv.box_number ? `📦 ${inv.box_number}` : "—"}</td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#ddd" }}>
                      {inv.seller_name}{inv.user_username && <span style={{ color: "#4ade80", fontSize: 9, marginLeft: 6 }}>🔗 @{inv.user_username}</span>}
                      <div style={{ color: "#555", fontSize: 10 }}>{inv.seller_email || inv.seller_phone}</div>
                    </td>
                    <td style={{ padding: "8px" }}><StatusBadge status={inv.status} label={inv.status_display} /></td>
                    <td style={{ padding: "8px", fontSize: 12, color: "#888" }}>
                      {inv.item_count}{inv.off_catalogue_units > 0 && <div style={{ color: "#e0b050", fontSize: 9 }}>{inv.off_catalogue_units} off-cat.</div>}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      {money(inv.total)}
                      {inv.amount_paid !== null && parseFloat(inv.amount_paid) !== parseFloat(inv.total) && (
                        <div style={{ color: "#4ade80", fontSize: 10 }}>paid {money(inv.amount_paid)}</div>
                      )}
                    </td>
                    <td style={{ padding: "8px", fontSize: 11, color: inv.payment_made ? "#4ade80" : "#888" }}>
                      {inv.payment_made ? `✅ ${inv.payment_method_display || "Paid"}` : "Unpaid"}
                      {parseFloat(inv.store_credit_amount) > 0 && (
                        <div style={{ color: "#4ade80", fontSize: 10 }}>
                          {money(inv.store_credit_amount)} store credit{parseFloat(inv.cash_portion) > 0 && inv.payment_method !== "credit" ? ` + ${money(inv.cash_portion)}` : ""}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{dateFmt(inv.created_at)}</td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {!legacy && inv.status === "draft" && (
                          <>
                            <button style={btn} onClick={() => setEditing(inv)}>✏️ Edit</button>
                            {(() => {
                              const credit = parseFloat(inv.store_credit_amount) || 0;
                              const allCredit = credit > 0 && parseFloat(inv.cash_portion) < 0.005;
                              return (
                                <>
                                  {!allCredit && (
                                    <select style={{ ...inp, padding: "4px 6px", fontSize: 11 }} value={payMethod[inv.id] || ""} onChange={(e) => setPayMethod((m) => ({ ...m, [inv.id]: e.target.value }))}>
                                      <option value="">{credit > 0 ? `Rest (${money(inv.cash_portion)}) paid by…` : "Paid by…"}</option><option value="eft">EFT</option><option value="cash">Cash</option><option value="card">Card</option>
                                    </select>
                                  )}
                                  <button style={btnPrimary} disabled={busy || (!allCredit && !payMethod[inv.id])}
                                    onClick={() => act(inv, "mark_paid", credit > 0 ? `Mark ${inv.buy_number} paid? ${money(credit)} goes onto @${inv.user_username}'s store credit now.` : undefined)}>
                                    💰 Mark paid{credit > 0 ? (allCredit ? " (store credit)" : " + credit") : ""}
                                  </button>
                                </>
                              );
                            })()}
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
                        {!legacy && inv.status !== "cancelled" && (
                          <button style={btn} title="Actual amount paid, real cost per card, rates, profit" onClick={() => setOpenCost(openCost === inv.id ? null : inv.id)}>📊 Cost</button>
                        )}
                        <a style={btn} title="Seller's copy: TCG price, rate bought at, price paid" href={`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-client-print/`} target="_blank" rel="noreferrer">🖨 Client copy</a>
                        <a style={btn} title="Seller's copy as PDF" href={`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-client-pdf/`} target="_blank" rel="noreferrer">⬇ Client PDF</a>
                        <a style={btn} title="Internal: condition, rate, sell-at price" href={`${API_URL}/admin/orders/buyorder/${inv.id}/buy-order-print/`} target="_blank" rel="noreferrer">📋 Stock sheet</a>
                        <button style={btn} title="Emails the client copy (PDF attached)" onClick={() => emailReceipt(inv)}>✉️ Email client</button>
                      </div>
                    </td>
                  </tr>
                  {openCost === inv.id && (
                    <tr><td colSpan={9} style={{ padding: "0 8px" }}>
                      <CostPanel inv={inv} onChanged={(m) => { setMsg(m); load(); }} />
                    </td></tr>
                  )}
                  </Fragment>
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
