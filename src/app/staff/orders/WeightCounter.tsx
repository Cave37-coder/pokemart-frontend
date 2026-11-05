"use client";
// Weight counter for Bulk Buy-ins (2026-11-05, Michael: weigh by era or specific set, and by card type, because
// print runs weigh slightly differently). Calibrate once from a hand-counted sample, then turn each pile's weight
// into a card count. A set-specific calibration beats the era one.
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";

export interface WCSet { code: string; name: string; release_date: string; era_code: string }
interface Cal { scope: "era" | "set"; scope_key: string; card_type: string; grams_per_card: number; sample_cards: number; updated_at: string }
interface Pile { key: number; gross: string }

const TYPES: [string, string, string][] = [   // [card_type, label, bundle it counts toward]
  ["common", "Commons", "common"], ["uncommon", "Uncommons", "common"], ["holo", "Holos", "holo"],
  ["reverse", "Reverse Holos", "reverse"], ["energy", "Basic Energy", "common"],
];
const ERA_LABELS: Record<string, string> = {
  MEG: "Mega Evolution", SV: "Scarlet & Violet", SWSH: "Sword & Shield", SM: "Sun & Moon",
  XY: "XY Era", BW: "Black & White", HGSS: "HG&SS", DP: "D&P / Platinum", EX: "EX Era",
  WotCO: "e-Card", WotCL: "Legendary", WotCN: "Neo", WotC: "WotC Base", OTHER: "Special / Other", PROMO: "Promos",
};

const box: React.CSSProperties = { background: "#12121a", border: "1px dashed #3b82f6", borderRadius: 8, padding: 10 };
const inp: React.CSSProperties = { background: "#1e1e2a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: "#888", textTransform: "uppercase", marginBottom: 3 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const btnP: React.CSSProperties = { ...btn, background: "#3b82f6", color: "#fff", border: "none", fontWeight: 600 };

let pileKey = 1;

export default function WeightCounter({ sets, onUse }: {
  sets: WCSet[];
  onUse: (bundleType: string, setCode: string, qty: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cals, setCals] = useState<Cal[]>([]);
  const [scope, setScope] = useState<"era" | "set">("era");
  const [era, setEra] = useState("SV");
  const [setCode, setSetCode] = useState("");
  const [type, setType] = useState("common");
  const [tare, setTare] = useState("");
  const [piles, setPiles] = useState<Pile[]>([]);
  const [gross, setGross] = useState("");
  const [sCards, setSCards] = useState("");
  const [sGrams, setSGrams] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    authFetch("/api/orders/admin/weight-calibrations/").then((r) => (r.ok ? r.json() : [])).then(setCals).catch(() => setCals([]));
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const eras = useMemo(() => {
    const codes = Array.from(new Set(sets.map((s) => s.era_code || "OTHER")));
    return codes.sort((a, b) => Object.keys(ERA_LABELS).indexOf(a) - Object.keys(ERA_LABELS).indexOf(b));
  }, [sets]);
  const setsSorted = useMemo(() => sets.slice().sort((a, b) => (b.release_date || "").localeCompare(a.release_date || "")), [sets]);

  // the set the counter is working on decides which era row is the fallback
  const chosenSet = sets.find((s) => s.code === setCode);
  const effectiveEra = scope === "set" ? (chosenSet?.era_code || "") : era;
  const key = scope === "set" ? setCode : era;

  const exact = cals.find((c) => c.scope === scope && c.scope_key === key && c.card_type === type);
  const fallback = scope === "set" ? cals.find((c) => c.scope === "era" && c.scope_key === effectiveEra && c.card_type === type) : undefined;
  const active = exact || fallback;
  const avg = active?.grams_per_card || 0;

  const tareG = parseFloat(tare) || 0;
  const rows = piles.map((p) => {
    const net = (parseFloat(p.gross) || 0) - tareG;
    return { ...p, net, est: avg > 0 && net > 0 ? Math.round(net / avg) : 0 };
  });
  const total = rows.reduce((s, r) => s + r.est, 0);
  const err = Math.max(1, Math.round(total * 0.015));   // typical +/-1-2% on a calibrated lot
  const bundle = TYPES.find((t) => t[0] === type)?.[2] || "common";

  const addPile = () => {
    if (!gross.trim() || isNaN(parseFloat(gross))) return;
    setPiles((ps) => [...ps, { key: pileKey++, gross }]);
    setGross("");
  };

  const saveCal = async (mode: "replace" | "add") => {
    setMsg("");
    if (!key) { setMsg("Pick an era or a set first."); return; }
    const r = await authFetch("/api/orders/admin/weight-calibrations/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, scope_key: key, card_type: type, sample_cards: sCards, sample_grams: sGrams, mode }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error || "Could not save."); return; }
    setMsg(`Saved: ${d.grams_per_card.toFixed(3)} g per card from ${d.sample_cards} counted cards.`);
    setSCards(""); setSGrams(""); load();
  };

  const label = scope === "set" ? (chosenSet ? `${chosenSet.name} [${chosenSet.code}]` : "pick a set") : (ERA_LABELS[era] || era);
  const typeLabel = TYPES.find((t) => t[0] === type)?.[1] || type;

  if (!open) {
    return <button style={{ ...btnP, alignSelf: "flex-start" }} onClick={() => setOpen(true)}>⚖️ Weight counter</button>;
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ color: "#fff", fontSize: 13 }}>⚖️ Weight counter <span style={{ color: "#6ea8fe", fontSize: 11, fontWeight: 400 }}>— count piles by weight</span></strong>
        <button style={btn} onClick={() => setOpen(false)}>Hide</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
        <div><label style={lbl}>Weigh by</label>
          <select style={inp} value={scope} onChange={(e) => setScope(e.target.value as "era" | "set")}>
            <option value="era">Era</option><option value="set">Specific set</option>
          </select></div>
        {scope === "era" ? (
          <div><label style={lbl}>Era</label>
            <select style={inp} value={era} onChange={(e) => setEra(e.target.value)}>
              {eras.map((e) => <option key={e} value={e}>{ERA_LABELS[e] || e}</option>)}
            </select></div>
        ) : (
          <div style={{ minWidth: 220 }}><label style={lbl}>Set</label>
            <select style={{ ...inp, width: "100%" }} value={setCode} onChange={(e) => setSetCode(e.target.value)}>
              <option value="">Choose a set…</option>
              {setsSorted.map((s) => <option key={s.code} value={s.code}>{s.name} [{s.code}]</option>)}
            </select></div>
        )}
        <div><label style={lbl}>Card type</label>
          <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div><label style={lbl}>Tray weight (g)</label>
          <input style={{ ...inp, width: 90 }} type="number" min="0" step="0.01" value={tare} onChange={(e) => setTare(e.target.value)} placeholder="0" /></div>
      </div>

      <div style={{ fontSize: 12, marginBottom: 10, color: avg ? "#4ade80" : "#e0b050" }}>
        {avg
          ? <>{typeLabel} · {label}: <strong>{avg.toFixed(3)} g per card</strong> (from {active!.sample_cards} counted cards{!exact && fallback ? `, using the ${ERA_LABELS[effectiveEra] || effectiveEra} era figure` : ""})</>
          : <>No calibration for {typeLabel} · {label} yet — count a sample by hand and weigh it below.</>}
      </div>

      <details style={{ marginBottom: 10 }} open={!avg}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "#6ea8fe" }}>Calibrate {typeLabel} · {label}</summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
          <div><label style={lbl}>Cards counted by hand</label>
            <input style={{ ...inp, width: 110 }} type="number" min="10" value={sCards} onChange={(e) => setSCards(e.target.value)} placeholder="e.g. 100" /></div>
          <div><label style={lbl}>Their weight (g, tray removed)</label>
            <input style={{ ...inp, width: 130 }} type="number" min="0" step="0.01" value={sGrams} onChange={(e) => setSGrams(e.target.value)} placeholder="e.g. 172.4" /></div>
          {sCards && sGrams && parseFloat(sCards) > 0 && <div style={{ fontSize: 12, color: "#ddd", paddingBottom: 6 }}>= {(parseFloat(sGrams) / parseFloat(sCards)).toFixed(3)} g each</div>}
          <button style={btnP} onClick={() => saveCal("replace")}>Save (replace)</button>
          {exact && <button style={btn} title="Pool this sample with the one already saved" onClick={() => saveCal("add")}>Add to existing</button>}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Tip: 50–100 cards. Do two or three samples and use “Add to existing” so one odd card doesn&apos;t skew it.</div>
        {msg && <div style={{ fontSize: 11, color: msg.startsWith("Saved") ? "#4ade80" : "#EF4444", marginTop: 4 }}>{msg}</div>}
      </details>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={lbl}>Pile weight incl. tray (g)</label>
          <input style={{ ...inp, width: 140 }} type="number" min="0" step="0.01" value={gross} disabled={!avg}
            onChange={(e) => setGross(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPile(); }} placeholder={avg ? "weigh a pile, Enter" : "calibrate first"} /></div>
        <button style={btnP} disabled={!avg} onClick={addPile}>+ Add pile</button>
        {piles.length > 0 && <button style={btn} onClick={() => setPiles([])}>Clear</button>}
      </div>

      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["#", "Gross g", "Net g", "≈ Cards", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "3px 10px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} style={{ borderTop: "1px solid #2a2a3a" }}>
                  <td style={{ padding: "3px 10px", color: "#888" }}>{i + 1}</td>
                  <td style={{ padding: "3px 10px", color: "#ddd" }}>{parseFloat(r.gross).toFixed(2)}</td>
                  <td style={{ padding: "3px 10px", color: "#ddd" }}>{r.net.toFixed(2)}</td>
                  <td style={{ padding: "3px 10px", color: "#fff", fontWeight: 700 }}>{r.est}</td>
                  <td style={{ padding: "3px 10px" }}><button style={{ ...btn, padding: "1px 7px" }} onClick={() => setPiles((ps) => ps.filter((p) => p.key !== r.key))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ color: "#fff", fontSize: 14 }}>Total ≈ <strong>{total}</strong> cards <span style={{ color: "#888", fontSize: 11 }}>(typically ±{err})</span></div>
            <button style={btnP} disabled={total < 1}
              onClick={() => onUse(bundle, scope === "set" ? setCode : "", total)}
              title="Fills the bundle form below with this type, set and quantity">Use {total} as a bundle ↓</button>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            Spot-check: hand-count one pile now and then. If it&apos;s more than about 1% off, re-calibrate.
          </div>
        </div>
      )}
    </div>
  );
}
