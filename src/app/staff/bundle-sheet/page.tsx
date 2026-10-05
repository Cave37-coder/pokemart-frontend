"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildPullSheetHtml, openPullSheet, type PullSheetRow } from "@/lib/pullSheet";
import {
  SETS, SET_INDEX, ERA_ORDER, TIER_LABELS_FE, TIER_VARIANT_SCOPE, TIER_NUMBERED_ONLY,
  MASTER_SET_CHASE_RARITIES, FULL_VARIANTS,
} from "@/lib/checklistData";

// Michael, 2026-10-05: "a seperate Checklists page on the staff section so
// that i can log a set and send the pullsheet with the bundle to the
// customer, so it does not have to save once I'm done, just give me the
// pullsheet with full sets cards showing, but the missing cards printed in
// RED". Nothing is persisted or sent to the API: pick set + tier, tick what
// is in the bundle, print. The sheet lists the FULL tier-scoped set; ticked
// = "Have" (check), unticked = red "-" (pullSheet.ts showHighlighted mode).

const VARIANT_LABEL_FULL: Record<string, string> = {
  N: "Normal", H: "Holo", RH: "Reverse Holo",
  PB: "Poke Ball", MB: "Master Ball", LB: "Love Ball",
  FB: "Friend Ball", QB: "Quick Ball", UB: "Ultra Ball",
  DB: "Dusk Ball", TR: "Team Rocket", SE: "Secret",
  PBP: "PB Pattern", MBP: "MB Pattern",
  CC: "Code Card", TT: "Trick or Trade", "HR-EX": "Illustration Rare",
  EX: "Double Rare", GX: "GX", V: "V", VMAX: "VMAX", VSTAR: "VSTAR",
  RR: "Rainbow Rare", RAD: "Radiant",
};

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#ff6b35", color: "#fff", border: "none", fontWeight: 600 };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#fff", borderRadius: 6, padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" };

const TIERS = Object.keys(TIER_LABELS_FE);

function isNumberedCard(num: string) {
  const [n, total] = num.split("/").map(s => parseInt(s, 10));
  return !isNaN(n) && !isNaN(total) && n <= total;
}

export default function StaffBundleSheetPage() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [setCode, setSetCode] = useState("");
  const [tier, setTier] = useState("complete_set");
  const [search, setSearch] = useState("");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      setIsStaff(!!(user && (user.is_staff || user.is_superuser)));
    } catch { setIsStaff(false); }
  }, []);

  const setList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...SET_INDEX]
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .sort((a, b) => {
        const ea = ERA_ORDER.indexOf(a.era), eb = ERA_ORDER.indexOf(b.era);
        return (ea < 0 ? 99 : ea) - (eb < 0 ? 99 : eb) || a.name.localeCompare(b.name);
      });
  }, [search]);

  const cards = useMemo(() => {
    const set = SETS[setCode];
    if (!set) return [];
    const sorted = [...set.cards].sort((a, b) => (parseInt(a.num) || 9999) - (parseInt(b.num) || 9999));
    const scope = new Set(TIER_VARIANT_SCOPE[tier] || FULL_VARIANTS);
    const numberedOnly = TIER_NUMBERED_ONLY[tier] ?? false;
    return sorted
      .filter(c => {
        if (numberedOnly) return isNumberedCard(c.num);
        if (tier === "master_set") return isNumberedCard(c.num) || MASTER_SET_CHASE_RARITIES.includes(c.rarity);
        return true;
      })
      .map(c => ({ ...c, variants: c.variants.filter(v => scope.has(v.vc)) }))
      .filter(c => c.variants.length > 0);
  }, [setCode, tier]);

  const keyOf = (num: string, vc: string) => `${num}_${vc}`;
  const allKeys = useMemo(() => cards.flatMap(c => c.variants.map(v => keyOf(c.num, v.vc))), [cards]);
  const tickedCount = allKeys.filter(k => ticked[k]).length;

  const pickSet = (code: string) => { setSetCode(code); setTicked({}); };
  const tickAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    if (val) allKeys.forEach(k => { next[k] = true; });
    setTicked(next);
  };
  const toggleCard = (num: string, vcs: string[]) => {
    const allOn = vcs.every(vc => ticked[keyOf(num, vc)]);
    setTicked(t => {
      const n = { ...t };
      vcs.forEach(vc => { n[keyOf(num, vc)] = !allOn; });
      return n;
    });
  };

  const print = () => {
    const set = SETS[setCode];
    if (!set) return;
    const rows: PullSheetRow[] = [];
    cards.forEach(c => c.variants.forEach(v => rows.push({
      num: c.num, name: c.name, variant: VARIANT_LABEL_FULL[v.vc] || v.vc,
      highlighted: !!ticked[keyOf(c.num, v.vc)],
    })));
    openPullSheet(buildPullSheetHtml({
      title: `Bundle Pull Sheet — ${TIER_LABELS_FE[tier] || tier}`,
      setName: set.name, setCode,
      customerName: customerName.trim(), customerEmail: customerEmail.trim(),
      rows, showHighlighted: true,
    }));
  };

  if (isStaff === null) return null;
  if (!isStaff) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ color: "#a0a0b0", marginBottom: 16 }}>Staff access only.</div>
        <Link href="/" style={{ color: "#ff6b35" }}>Back to shop</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 1.5rem 80px" }}>
      <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Bundle Pull Sheet</h1>
      <p style={{ color: "#555", fontSize: 12, marginTop: 4, marginBottom: 16 }}>
        Pick a set, tick the cards in the bundle, print. Full set is listed; missing cards print in red. Nothing is saved.
      </p>

      <div style={{ ...card, marginBottom: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div>
          <label style={{ color: "#a0a0b0", fontSize: 11 }}>Find set</label>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Search name or code" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inp} value={setCode} onChange={e => pickSet(e.target.value)}>
            <option value="">Select a set…</option>
            {setList.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code}) — {s.era}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: "#a0a0b0", fontSize: 11 }}>Tier</label>
          <select style={inp} value={tier} onChange={e => { setTier(e.target.value); setTicked({}); }}>
            {TIERS.map(t => <option key={t} value={t}>{TIER_LABELS_FE[t]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: "#a0a0b0", fontSize: 11 }}>Customer name (optional)</label>
          <input style={inp} value={customerName} onChange={e => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label style={{ color: "#a0a0b0", fontSize: 11 }}>Customer email (optional)</label>
          <input style={inp} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
        </div>
      </div>

      {setCode && (
        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
              {SETS[setCode]?.name} · {tickedCount} / {allKeys.length} in bundle
            </span>
            <span style={{ flex: 1 }} />
            <button style={btn} onClick={() => tickAll(true)}>Tick all</button>
            <button style={btn} onClick={() => tickAll(false)}>Clear</button>
            <button style={btnPrimary} onClick={print} disabled={allKeys.length === 0}>🖨 Print pull sheet</button>
          </div>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {cards.map(c => {
              const vcs = c.variants.map(v => v.vc);
              const allOn = vcs.every(vc => ticked[keyOf(c.num, vc)]);
              return (
                <div key={c.num} style={{ background: "#12121a", border: `1px solid ${allOn ? "#2e7d32" : "#2a2a3a"}`, borderRadius: 8, padding: "6px 10px" }}>
                  <div onClick={() => toggleCard(c.num, vcs)} style={{ cursor: "pointer", color: allOn ? "#7ee787" : "#ddd", fontSize: 12, fontWeight: 600 }}>
                    {c.num} · {c.name}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                    {c.variants.map(v => (
                      <label key={v.vc} style={{ color: "#a0a0b0", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={!!ticked[keyOf(c.num, v.vc)]}
                          onChange={e => setTicked(t => ({ ...t, [keyOf(c.num, v.vc)]: e.target.checked }))}
                        />
                        {VARIANT_LABEL_FULL[v.vc] || v.vc}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
