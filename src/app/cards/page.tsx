import Link from "next/link";
import AddToPileButton from "@/components/AddToPileButton";
import { getCards } from "@/lib/api";

// Fetched from API at runtime
async function getSets() {
  try {
    const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    const r = await fetch(`${API_URL}/api/sets/`, { 
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000)
    });
    const data = await r.json();
    return data.results || [];
  } catch {
    return [];
  }
}

const ERA_ORDER = [
  { code: "B1", label: "WotC Base Era" },
  { code: "B2", label: "EX Era" },
  { code: "B3", label: "D&P / HG&SS" },
  { code: "B4", label: "Black & White" },
  { code: "B5", label: "XY Era" },
  { code: "B6", label: "Sun & Moon" },
  { code: "B7", label: "Sword & Shield" },
  { code: "B8", label: "Scarlet & Violet" },
  { code: "B9", label: "Mega Evolution" },
];

// Special group definitions — sets are populated from API
const SPECIAL_GROUP_DEFS = [
  { label: "Promos",         color: "#F59E0B", eraCodes: ["B1","B2","B3","B4","B5","B6","B7","B8","B9"], codePatterns: ["PR-"] },
  { label: "POP Series",     color: "#10B981", codePatterns: ["POP"] },
  { label: "McDonalds",      color: "#EF4444", codePatterns: ["MCD","M11","M12","M14","M15","M16","M17","M18","M19","M21","M22","M23","M24"] },
  { label: "Trainer Gallery",color: "#8B5CF6", codePatterns: ["TG","GG","ASRTG","BRSTG","LORTG","SITTG","CRZGG","BST","ST","SWSH9TG","SWSH10TG","SWSH11TG","SWSH12TG"] },
  { label: "Trick or Trade", color: "#EC4899", codePatterns: ["TOT","TTBB"] },
  { label: "Battle Academy",  color: "#14B8A6", codePatterns: ["BTA","BA22","BA24"] },
  { label: "Prize Pack",     color: "#F97316", codePatterns: ["PRIZEPACK","PPS"] },
  { label: "WCD & Exclusives",color: "#6B7280", codePatterns: ["WCD","BLE","MCAP","LEAGUE","JUMBO","ALTART","PPP","CCP","PWCP","KWBP","BKP-BK","SAMPLE","RUM","DEP","TCGCL","LTRRC","GENRC","DRV","KSS","DCR","SI1","PR-BEST"] },
];

const LEGALITY_OPTIONS = [
  { value: "", label: "All formats" },
  { value: "standard", label: "Standard 2026 (H/I/J)" },
  { value: "expanded", label: "Expanded (D/E/F+)" },
  { value: "rotated_g", label: "Rotated — SV era (G)" },
  { value: "rotated_f", label: "Rotated — SwSh era (F)" },
];

const SUPERTYPES = [
  { label: "Pokemon", value: "Pok\u00e9mon" },
  { label: "Trainer", value: "Trainer" },
  { label: "Energy", value: "Energy" },
];

const TRAINER_SUBTYPES = [
  { label: "Supporter", value: "Supporter" },
  { label: "Item", value: "Item" },
  { label: "Stadium", value: "Stadium" },
  { label: "Pokemon Tool", value: "Tool" },
  { label: "ACE SPEC", value: "ACE SPEC" },
  { label: "Technical Machine", value: "Technical Machine" },
];

const ENERGY_SUBTYPES = [{ label: "Special Energy", value: "Special" }];

const POKEMON_SUBTYPES = [
  { label: "Basic", value: "Basic" },
  { label: "Stage 1", value: "Stage 1" },
  { label: "Stage 2", value: "Stage 2" },
  { label: "EX", value: "EX" },
  { label: "ex", value: "ex" },
  { label: "GX", value: "GX" },
  { label: "V / VMAX", value: "V" },
  { label: "MEGA", value: "MEGA" },
  { label: "BREAK", value: "BREAK" },
  { label: "Tera", value: "Tera" },
];

const ENERGY_TYPES = [
  { label: "Grass",     value: "Grass",     color: "#4ade80" },
  { label: "Fire",      value: "Fire",      color: "#f97316" },
  { label: "Water",     value: "Water",     color: "#38bdf8" },
  { label: "Lightning", value: "Lightning", color: "#facc15" },
  { label: "Psychic",   value: "Psychic",   color: "#c084fc" },
  { label: "Fighting",  value: "Fighting",  color: "#fb923c" },
  { label: "Darkness",  value: "Darkness",  color: "#94a3b8" },
  { label: "Metal",     value: "Metal",     color: "#cbd5e1" },
  { label: "Dragon",    value: "Dragon",    color: "#818cf8" },
  { label: "Colorless", value: "Colorless", color: "#e2e8f0" },
];

const RARITIES = [
  { value: "", label: "All Rarities" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "holo_rare", label: "Holo Rare" },
  { value: "ultra_rare", label: "Ultra Rare" },
  { value: "secret_rare", label: "Secret Rare" },
  { value: "illustration_rare", label: "Illus. Rare" },
  { value: "special_illustration_rare", label: "Special Illus." },
  { value: "hyper_rare", label: "Hyper Rare" },
];

const SORT_OPTIONS = [
  { value: "card_number", label: "Card # (low to high)" },
  { value: "-card_number", label: "Card # (high to low)" },
  { value: "pokedex_number", label: "Pokedex # (low to high)" },
  { value: "-pokedex_number", label: "Pokedex # (high to low)" },
  { value: "price", label: "Price (low to high)" },
  { value: "-price", label: "Price (high to low)" },
  { value: "name", label: "Name A to Z" },
];

type VariantKey = "N"|"H"|"RH"|"ERH"|"RH-PB"|"RH-MB"|"BRH-FB"|"BRH-LB"|"BRH-QB"|"BRH-DB"|"BRH-R"|"DR"|"AS"|"MH"|"1ST"|"IR"|"SIR"|"HR";

function getVariantKey(card: { variant_override: string; rarity: string; price_first_edition: string | null; }): VariantKey {
  const v = (card.variant_override || "").trim();
  const r = card.rarity || "";
  if (card.price_first_edition) return "1ST";
  if (v === "H") return "H";
  if (v === "RH" || v === "RH-H") return "RH";
  if (v === "ERH") return "ERH";
  if (v === "RH-PB") return "RH-PB";
  if (v === "RH-MB") return "RH-MB";
  if (v === "BRH-FB") return "BRH-FB";
  if (v === "BRH-LB") return "BRH-LB";
  if (v === "BRH-QB") return "BRH-QB";
  if (v === "BRH-DB") return "BRH-DB";
  if (v === "BRH-R" || v === "TRH") return "BRH-R";
  if (v === "DR" || v === "EX") return "DR";
  if (v === "AS") return "AS";
  if (v === "MH") return "MH";
  if (v === "1E" || v === "SH") return "1ST";
  if (v === "1E-H" || v === "1ES" || v === "SH-H" || v === "1ES-H") return "H";
  if (v === "GX" || v === "V" || v === "VX" || v === "VST" || v === "UR") return "DR";
  if (v === "GS" || v === "SHN" || v === "LGD" || v === "BRK") return "DR";
  if (v === "IR") return "IR";
  if (v === "SIR") return "SIR";
  if (v === "HR") return "HR";
  if (r === "illustration_rare") return "IR";
  if (r === "special_illustration_rare") return "SIR";
  if (r === "hyper_rare") return "HR";
  return "N";
}

const VARIANT_BORDER: Record<VariantKey, { color: string; width: string }> = {
  N:        { color: "#2a2a3a", width: "1px" },
  H:        { color: "#BA7517", width: "1px" },
  RH:       { color: "#7F77DD", width: "1px" },
  ERH:      { color: "#0F6E56", width: "1px" },
  "RH-PB":  { color: "#A32D2D", width: "1px" },
  "RH-MB":  { color: "#534AB7", width: "1px" },
  "BRH-FB": { color: "#3B6D11", width: "1px" },
  "BRH-LB": { color: "#993556", width: "1px" },
  "BRH-QB": { color: "#854F0B", width: "1px" },
  "BRH-DB": { color: "#085041", width: "1px" },
  "BRH-R":  { color: "#A32D2D", width: "1px" },
  DR:       { color: "#888780", width: "1px" },
  AS:       { color: "#7F77DD", width: "1px" },
  MH:       { color: "#378ADD", width: "1px" },
  "1ST":    { color: "#0F6E56", width: "1px" },
  IR:       { color: "#BA7517", width: "1px" },
  SIR:      { color: "#BA7517", width: "2px" },
  HR:       { color: "#7F77DD", width: "2px" },
};

// ── VARIANT OVERLAY – DO NOT REMOVE OR ALTER (except adding new variants) ──
function VariantOverlay({ vk }: { vk: VariantKey }) {
  const badge = (label: string, bg: string, color: string, pos: "tr"|"tl" = "tr") => (
    <div style={{ position:"absolute", ...(pos==="tr"?{top:5,right:5}:{top:5,left:5}), background:bg, color, fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:10, zIndex:4, letterSpacing:"0.3px", lineHeight:1.4 }}>{label}</div>
  );
  const diag = (rgba: string) => (
    <div style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none", background:`repeating-linear-gradient(45deg,transparent,transparent 5px,${rgba} 5px,${rgba} 6px)` }} />
  );
  const ball = (top: string, bot: string, line: string, dot?: string, stripe?: boolean, heart?: boolean) => {
    if (heart) return (
      <div style={{ position:"absolute", bottom:5, right:5, zIndex:3 }}>
        <svg width="18" height="16" viewBox="0 0 18 16"><path d="M9 14C3.5 9.5 1 7 1 4.2 1 2.2 2.8 1 5 1c1.8 0 3.2 1.2 4 2.5C9.8 2.2 11.2 1 13 1c2.2 0 4 1.2 4 3.2C17 7 14.5 9.5 9 14Z" fill={top}/></svg>
      </div>
    );
    return (
      <div style={{ position:"absolute", bottom:5, right:5, width:18, height:18, borderRadius:"50%", overflow:"hidden", border:"0.5px solid #33333355", zIndex:3 }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"50%", background:top }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%", background:bot }} />
        <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:line, transform:"translateY(-50%)" }} />
        {dot && <div style={{ position:"absolute", top:2, left:"50%", transform:"translateX(-50%)", width:5, height:5, borderRadius:"50%", background:dot }} />}
        {stripe && <div style={{ position:"absolute", top:1, right:3, width:3, height:7, background:top, borderRadius:1 }} />}
      </div>
    );
  };
  const stars = (count: number, colors: string[]) => (
    <div style={{ position:"absolute", bottom:6, left:"50%", transform:"translateX(-50%)", display:"flex", gap:2, zIndex:3 }}>
      {Array.from({length:count}).map((_,i) => <span key={i} style={{ fontSize:11, color:colors[i]||colors[0], lineHeight:1 }}>★</span>)}
    </div>
  );
  const aceBorder = <div style={{ position:"absolute", inset:3, borderRadius:3, zIndex:2, pointerEvents:"none", border:"1.5px solid transparent", backgroundImage:"linear-gradient(#0000,#0000),linear-gradient(135deg,#e24b4a,#ef9f27,#639922,#1d9e75,#378add,#7f77dd)", backgroundOrigin:"border-box", backgroundClip:"padding-box,border-box" }} />;
  switch (vk) {
    case "H": return (<>{diag("rgba(186,117,23,0.12)")}{badge("HOLO","#633806","#FAC775")}<div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,background:"#EF9F27",zIndex:2 }}/></>);
    case "RH": return (<>{diag("rgba(127,119,221,0.15)")}{badge("RH","#3C3489","#CECBF6")}</>);
    case "ERH": return (<>{diag("rgba(29,158,117,0.15)")}{badge("ERH","#085041","#9FE1CB")}<div style={{ position:"absolute",bottom:5,right:5,width:16,height:16,borderRadius:"50%",background:"#1D9E75",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:"#E1F5EE",zIndex:3 }}>E</div></>);
    case "RH-PB": return (<>{badge("PB","#791F1F","#F7C1C1")}{ball("#E24B4A","#f5f5f5","#333")}</>);
    case "RH-MB": return (<>{badge("MB","#3C3489","#CECBF6")}{ball("#7F77DD","#f0f0f0","#333","#EEEDFE")}</>);
    case "BRH-FB": return (<>{badge("FB","#27500A","#C0DD97")}{ball("#639922","#e8f5d0","#333")}</>);
    case "BRH-LB": return (<>{badge("LB","#72243E","#F4C0D1")}{ball("#D4537E","#D4537E","#D4537E",undefined,undefined,true)}</>);
    case "BRH-QB": return (<>{badge("QB","#633806","#FAC775")}{ball("#EF9F27","#f5f5e0","#333",undefined,true)}</>);
    case "BRH-DB": return (<>{badge("DB","#04342C","#5DCAA5")}{ball("#0F6E56","#c0c0b0","#222","#1D9E75")}</>);
    case "BRH-R": return (<>{diag("rgba(226,75,74,0.15)")}{badge("R","#791F1F","#F7C1C1")}<div style={{ position:"absolute",bottom:4,right:6,fontSize:14,fontWeight:700,color:"#E24B4A",zIndex:3,lineHeight:1 }}>R</div></>);
    case "DR": return (<>{diag("rgba(180,178,169,0.12)")}{badge("EX","#444441","#D3D1C7")}</>);
    case "AS": return (<>{aceBorder}{badge("ACE","linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)","#fff")}</>);
    case "MH": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(55,138,221,0.1) 4px,rgba(55,138,221,0.1) 5px)" }}/><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(55,138,221,0.07) 4px,rgba(55,138,221,0.07) 5px)" }}/>{badge("MH","#0C447C","#B5D4F4")}</>);
    case "1ST": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",boxShadow:"inset 0 0 0 2px rgba(29,158,117,0.3)" }}/>{badge("1st ED","#085041","#9FE1CB","tl")}</>);
    case "IR": return (<>{diag("rgba(186,117,23,0.1)")}{badge("IR","#633806","#FAC775")}{stars(1,["#EF9F27"])}</>);
    case "SIR": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(60deg,transparent,transparent 4px,rgba(239,159,39,0.15) 4px,rgba(239,159,39,0.15) 5px)" }}/><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(-60deg,transparent,transparent 4px,rgba(239,159,39,0.08) 4px,rgba(239,159,39,0.08) 5px)" }}/>{badge("SIR","#412402","#FAC775")}{stars(2,["#EF9F27","#EF9F27"])}</>);
    case "HR": return (<>{aceBorder}{badge("HR","linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)","#fff")}{stars(3,["#E24B4A","#EF9F27","#7F77DD"])}</>);
    default: return null;
  }
}
// ── END VARIANT OVERLAY – DO NOT REMOVE OR ALTER ──

function buildHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...current, ...overrides, page: "1" };
  if ("page" in overrides) merged.page = overrides.page || "1";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) { if (v) p.set(k, v); }
  return `/cards?${p.toString()}`;
}

function Paginator({ current, total, params }: { current: number; total: number; params: Record<string, string | undefined> }) {
  if (total <= 1) return null;
  const MAX_PAGE = 50;
  const safeCurrent = Math.min(current, total);
  const displayTotal = Math.min(total, MAX_PAGE);
  const isCapped = total > MAX_PAGE;
  const pages: (number | "...")[] = [];
  if (displayTotal <= 7) { for (let i = 1; i <= displayTotal; i++) pages.push(i); }
  else {
    pages.push(1);
    if (safeCurrent - 2 > 2) pages.push("...");
    for (let i = Math.max(2, safeCurrent - 2); i <= Math.min(displayTotal - 1, safeCurrent + 2); i++) pages.push(i);
    if (safeCurrent + 2 < displayTotal - 1) pages.push("...");
    pages.push(displayTotal);
  }
  const btn: React.CSSProperties = { padding:"7px 12px", borderRadius:"6px", fontSize:"13px", textDecoration:"none", fontWeight:500, display:"inline-block", border:"1px solid #2a2a3a", minWidth:"36px", textAlign:"center" };
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:"4px", flexWrap:"wrap", alignItems:"center" }}>
      {safeCurrent > 1 && <Link href={buildHref(params, { page: String(safeCurrent-1) })} style={{ ...btn, background:"#1a1a24", color:"#fff" }}>prev</Link>}
      {pages.map((p,i) => p === "..." ? <span key={`e${i}`} style={{ ...btn, background:"transparent", border:"none", color:"#555" }}>...</span> : <Link key={p} href={buildHref(params, { page: String(p) })} style={{ ...btn, background:p===safeCurrent?"#ff6b35":"#1a1a24", color:"#fff", borderColor:p===safeCurrent?"#ff6b35":"#2a2a3a" }}>{p}</Link>)}
      {safeCurrent < displayTotal && <Link href={buildHref(params, { page: String(safeCurrent+1) })} style={{ ...btn, background:"#1a1a24", color:"#fff" }}>next</Link>}
      <span style={{ color:"#555", fontSize:"12px", marginLeft:"8px" }}>
        Page {safeCurrent} of {total}{isCapped ? " — use filters to narrow results" : ""}
      </span>
    </div>
  );
}

function SetChip({ set, active, href, color }: { set: any; active: boolean; href: string; color?: string }) {
  const activeColor = color || "#ff6b35";
  return (
    <Link href={href} style={{
      display:"flex", alignItems:"center", gap:"5px",
      background: active ? activeColor+"22" : "#1a1a24",
      border:`1px solid ${active ? activeColor : "#2a2a3a"}`,
      color: active ? activeColor : "#a0a0b0",
      padding:"4px 10px", borderRadius:"6px", textDecoration:"none",
      fontSize:"12px", fontWeight:500, whiteSpace:"nowrap",
    }}>
      {set.symbol_url && (
        <img src={set.symbol_url} alt="" style={{ width:14, height:14, objectFit:"contain", opacity: active ? 1 : 0.6 }} />
      )}
      {set.name}
    </Link>
  );
}

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const [params, allSets] = await Promise.all([
    searchParams,
    getSets(),
  ]);

  const page = parseInt(params.page || "1");
  const showInStock = params.show_out_of_stock !== "true";
  const currentSupertype = params.supertype || "";
  const activeEraCode = params.era || "";
  const activeSetCode = params.card_set || "";

  // Group sets by era, deduplicate by name (keep first occurrence = newest release date)
  const setsByEra: Record<string, any[]> = {};
  const seenNames = new Set<string>();
  // allSets already sorted by release_date desc from API
  for (const set of allSets) {
    const ec = set.era_code || "OTHER";
    const nameKey = ec + "|" + set.name;
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    if (!setsByEra[ec]) setsByEra[ec] = [];
    setsByEra[ec].push(set);
  }

  // Identify special sets
  const specialSetCodes = new Set<string>();
  const specialGroups = SPECIAL_GROUP_DEFS.map(def => {
    const sets = allSets.filter((s: any) => {
      return def.codePatterns?.some((p: string) => s.code.startsWith(p) || s.code === p);
    });
    sets.forEach((s: any) => specialSetCodes.add(s.code));
    return { ...def, sets };
  }).filter(g => g.sets.length > 0);

  // Main era sets — exclude special ones
  const mainSetsByEra = ERA_ORDER.map(era => ({
    ...era,
    sets: (setsByEra[era.code] || []).filter((s: any) => !specialSetCodes.has(s.code)),
  }));

  // Find active era and special group
  const activeEra = mainSetsByEra.find(e => e.code === activeEraCode);
  const activeSpecialGroup = specialGroups.find(g => g.sets.some((s: any) => s.code === activeSetCode) && !activeEraCode);

  // Find active set for symbol display
  const activeSet = allSets.find((s: any) => s.code === activeSetCode);

  const subtypeOptions = currentSupertype === "Trainer" ? TRAINER_SUBTYPES
    : currentSupertype === "Energy" ? ENERGY_SUBTYPES
    : currentSupertype === "Pokemon" ? POKEMON_SUBTYPES
    : [];
  const showEnergyTypes = !currentSupertype || currentSupertype === "Pokemon";

  let data: any = { count: 0, results: [] };
  try {
    data = await getCards({
      ...(params.search && { search: params.search }),
      ...(params.rarity && { rarity: params.rarity }),
      ...(params.ordering && { ordering: params.ordering }),
      ...(params.era && { era: params.era }),
      ...(params.card_set && { card_set: params.card_set }),
      ...(params.energy_type && { energy_type: params.energy_type }),
      ...(params.supertype && { supertype: params.supertype }),
      ...(params.subtype && { subtype: params.subtype }),
      ...(params.page && { page: params.page }),
      ...(showInStock && { in_stock: "true" }),
      ...(params.legality && { legality: params.legality }),
      ...(params.pokedex && { pokedex: params.pokedex }),
      min_price: "0.01",
    });
  } catch (e) {
    data = { count: 0, results: [] };
  }

  const totalPages = Math.ceil((data.count || 0) / 32);

  const eraTabStyle = (active: boolean): React.CSSProperties => ({
    display:"block", background: active ? "#ff6b35" : "#1a1a24",
    border:`1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
    color:"#fff", padding:"6px 14px", borderRadius:"6px",
    textDecoration:"none", fontSize:"13px", fontWeight:500,
  });

  return (
    <div style={{ maxWidth:"1400px", margin:"0 auto", padding:"20px 1.5rem" }}>

      {/* ── ERA TABS ── */}
      <div style={{ marginBottom:"4px" }}>
        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
          <Link href={buildHref(params, { era: undefined, card_set: undefined, page:"1" })} style={eraTabStyle(!activeEraCode && !activeSpecialGroup)}>All</Link>
          {mainSetsByEra.map((era) => (
            <Link key={era.code} href={buildHref(params, { era: era.code, card_set: undefined, page:"1" })} style={eraTabStyle(activeEraCode === era.code && !activeSpecialGroup)}>
              {era.label}
            </Link>
          ))}
        </div>

        {/* SET CHIPS for active era */}
        {activeEra && activeEra.sets.length > 0 && !activeSpecialGroup && (
          <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderTop:"2px solid #ff6b35", borderRadius:"0 6px 6px 6px", padding:"10px 12px", display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"4px" }}>
            <Link href={buildHref(params, { card_set: undefined, page:"1" })} style={{
              display:"flex", alignItems:"center",
              background: !activeSetCode ? "#ff6b3522" : "#12121a",
              border:`1px solid ${!activeSetCode ? "#ff6b35" : "#2a2a3a"}`,
              color: !activeSetCode ? "#ff6b35" : "#a0a0b0",
              padding:"4px 10px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
            }}>All sets</Link>
            {activeEra.sets.map((s: any) => (
              <SetChip key={s.code} set={s} active={activeSetCode === s.code} href={buildHref(params, { card_set: s.code, page:"1" })} />
            ))}
          </div>
        )}
      </div>

      {/* ── SPECIAL SETS ROW ── */}
      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", alignItems:"center", marginBottom:"8px", paddingTop:"6px", borderTop:"1px solid #2a2a3a" }}>
        <span style={{ fontSize:"10px", color:"#555", fontWeight:700, letterSpacing:"0.08em", marginRight:"2px" }}>SPECIAL</span>
        {specialGroups.map((group) => {
          const isActive = group.sets.some((s: any) => s.code === activeSetCode) && !activeEraCode;
          return (
            <Link key={group.label}
              href={isActive
                ? buildHref(params, { card_set: undefined, page:"1" })
                : buildHref(params, { card_set: group.sets[0].code, era: undefined, page:"1" })}
              style={{
                background: isActive ? group.color+"22" : "#1a1a24",
                border:`1px solid ${isActive ? group.color : "#2a2a3a"}`,
                color: isActive ? group.color : "#a0a0b0",
                padding:"5px 12px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
              }}>
              {group.label}
            </Link>
          );
        })}
      </div>

      {/* SPECIAL SET PICKER */}
      {activeSpecialGroup && (
        <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderTop:`2px solid ${activeSpecialGroup.color}`, borderRadius:"6px", padding:"10px 12px", display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
          {activeSpecialGroup.sets.map((s: any) => (
            <SetChip key={s.code} set={s} active={activeSetCode === s.code} href={buildHref(params, { card_set: s.code, era: undefined, page:"1" })} color={activeSpecialGroup.color} />
          ))}
        </div>
      )}

      {/* Active set header - symbol + name only, no logo (unreliable from API) */}
      {activeSet && activeSet.symbol_url && (
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"10px", padding:"10px 14px", background:"#1a1a24", borderRadius:"8px", border:"1px solid #2a2a3a" }}>
          <img src={activeSet.symbol_url} alt="" style={{ width:24, height:24, objectFit:"contain" }} />
          <span style={{ color:"#fff", fontSize:"14px", fontWeight:600 }}>{activeSet.name}</span>
          <span style={{ color:"#555", fontSize:"12px" }}>· {activeSet.era_name}</span>
        </div>
      )}

      {/* ── SUPERTYPE ROW + IN STOCK TOGGLE ── */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"6px", flexWrap:"wrap", alignItems:"center" }}>
        {SUPERTYPES.map((t) => (
          <Link key={t.value} href={buildHref(params, { supertype: params.supertype === t.value ? undefined : t.value, energy_type: undefined, subtype: undefined, page:"1" })} style={{
            background: params.supertype === t.value ? "#ff6b3522" : "#1a1a24",
            border:`1px solid ${params.supertype === t.value ? "#ff6b35" : "#2a2a3a"}`,
            color: params.supertype === t.value ? "#ff6b35" : "#a0a0b0",
            padding:"5px 16px", borderRadius:"6px", textDecoration:"none", fontSize:"13px", fontWeight:600,
          }}>{t.label}</Link>
        ))}
        <div style={{ marginLeft:"auto" }}>
          <Link href={buildHref(params, { show_out_of_stock: showInStock ? "true" : undefined, page:"1" })} style={{
            background: !showInStock ? "#10B98122" : "#1a1a24",
            border:`1px solid ${!showInStock ? "#10B981" : "#2a2a3a"}`,
            color: !showInStock ? "#10B981" : "#a0a0b0",
            padding:"5px 14px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
            display:"flex", alignItems:"center", gap:"6px",
          }}>
            {showInStock ? "✓ In Stock Only" : "○ Show All"}
          </Link>
        </div>
      </div>

      {/* ── SUBTYPE ROW ── */}
      {subtypeOptions.length > 0 && (
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"6px" }}>
          {subtypeOptions.map((t) => (
            <Link key={t.value} href={buildHref(params, { subtype: params.subtype === t.value ? undefined : t.value, page:"1" })} style={{
              background: params.subtype === t.value ? "#ff6b3522" : "#1a1a24",
              border:`1px solid ${params.subtype === t.value ? "#ff6b35" : "#2a2a3a"}`,
              color: params.subtype === t.value ? "#ff6b35" : "#a0a0b0",
              padding:"4px 12px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
            }}>{t.label}</Link>
          ))}
        </div>
      )}

      {/* ── ENERGY TYPE ROW ── */}
      {showEnergyTypes && (
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
          {ENERGY_TYPES.map((t) => (
            <Link key={t.value} href={buildHref(params, { energy_type: params.energy_type === t.value ? undefined : t.value, page:"1" })} style={{
              background: params.energy_type === t.value ? t.color+"33" : "#1a1a24",
              border:`1px solid ${params.energy_type === t.value ? t.color : "#2a2a3a"}`,
              color: params.energy_type === t.value ? t.color : "#a0a0b0",
              padding:"4px 11px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
            }}>{t.label}</Link>
          ))}
        </div>
      )}

      {/* ── SEARCH + RARITY + SORT ── */}
      <form method="GET" style={{ display:"flex", gap:"10px", marginBottom:"12px", flexWrap:"wrap", alignItems:"center" }}>
        {params.era && <input type="hidden" name="era" value={params.era} />}
        {params.card_set && <input type="hidden" name="card_set" value={params.card_set} />}
        {params.energy_type && <input type="hidden" name="energy_type" value={params.energy_type} />}
        {params.supertype && <input type="hidden" name="supertype" value={params.supertype} />}
        {params.subtype && <input type="hidden" name="subtype" value={params.subtype} />}
        {params.show_out_of_stock && <input type="hidden" name="show_out_of_stock" value={params.show_out_of_stock} />}
        {params.legality && <input type="hidden" name="legality" value={params.legality} />}
        {params.pokedex && <input type="hidden" name="pokedex" value={params.pokedex} />}
        <input name="search" defaultValue={params.search} placeholder="Search name, set, artist..." style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 14px", color:"#fff", fontSize:"13px", flex:1, minWidth:"180px" }} />
        <input name="pokedex" defaultValue={params.pokedex} placeholder="Dex # e.g. 25" style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px", width:"120px" }} />
        <select name="rarity" defaultValue={params.rarity || ""} style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px" }}>
          {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select name="ordering" defaultValue={params.ordering || "card_number"} style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px" }}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="legality" defaultValue={params.legality || ""} style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px" }}>
          {LEGALITY_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <button type="submit" style={{ background:"#ff6b35", color:"#fff", border:"none", borderRadius:"6px", padding:"8px 18px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>Search</button>
        {(params.search || params.rarity || params.era || params.energy_type || params.supertype || params.card_set || params.subtype || params.pokedex) && (
          <Link href="/cards" style={{ color:"#a0a0b0", fontSize:"12px", textDecoration:"none", padding:"8px 12px", border:"1px solid #2a2a3a", borderRadius:"6px", background:"#1a1a24" }}>Clear all</Link>
        )}
      </form>

      {/* COUNT */}
      <div style={{ color:"#a0a0b0", fontSize:"13px", marginBottom:"16px" }}>
        <strong style={{ color:"#fff" }}>{data.count?.toLocaleString()}</strong> cards {showInStock ? "in stock" : "total"}
        {params.subtype && <span style={{ color:"#ff6b35" }}> · {params.subtype}</span>}
      </div>

      {/* TOP PAGINATION */}
      <div style={{ marginBottom:"20px" }}>
        <Paginator current={page} total={totalPages} params={params} />
      </div>

      {/* CARD GRID */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:"10px" }}>
        {data.results.map((card: any) => {
          const vk = getVariantKey(card) as VariantKey;
          const vb = VARIANT_BORDER[vk];
          const cardNum = card.card_number != null ? String(card.card_number).padStart(3,"0") : "???";
          const setCode = card.card_set?.code || "";
          const eraCode = card.card_set?.era?.code || "";
          const symbolUrl = card.card_set?.symbol_url || "";
          const hasStock = card.stock > 0;
          return (
            <div key={card.pb_id || card.id} style={{ background:"#1a1a24", border:`${vb.width} solid ${vb.color}`, borderRadius:"8px", overflow:"hidden", opacity: hasStock ? 1 : 0.6 }}>
              <Link href={`/cards/${card.id}`} style={{ textDecoration:"none" }}>
                <div style={{ position:"relative", width:"100%", aspectRatio:"3/4" }}>
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter: hasStock ? "none" : "grayscale(100%)" }} />
                  ) : (
                    <div style={{ width:"100%", height:"100%", background:"#12121a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"36px" }}>🃏</div>
                  )}
                  <VariantOverlay vk={vk} />
                </div>
                <div style={{ padding:"8px 10px" }}>
                  <div style={{ fontSize:"10px", color:"#555", marginBottom:"2px", display:"flex", alignItems:"center", gap:"4px" }}>
                    {symbolUrl && <img src={symbolUrl} alt="" style={{ width:10, height:10, objectFit:"contain", opacity:0.5 }} />}
                    {eraCode} · {setCode} · #{cardNum}
                  </div>
                  <div style={{ fontSize:"11px", color:"#ddd", marginBottom:"3px", lineHeight:1.3, fontWeight:500 }}>{card.name}</div>
                          {card.pokedex_number && <div style={{ fontSize: "9px", color: "#a0a0b0", marginBottom: "1px" }}>#{String(card.pokedex_number).padStart(4, "0")}</div>}
                          <div style={{ fontSize: "10px", color: "#555", marginBottom: "5px" }}>{card.rarity?.replace(/_/g, " ").toUpperCase()}</div>
                  <div style={{ fontWeight:700, color:"#ff6b35", fontSize:"14px" }}>R {parseFloat(card.price).toFixed(2)}</div>
                </div>
              </Link>
              <div style={{ padding:"0 10px 10px" }}>
                <AddToPileButton productId={card.id} hasStock={hasStock} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM PAGINATION */}
      <div style={{ marginTop:"32px", marginBottom:"24px" }}>
        <Paginator current={page} total={totalPages} params={params} />
      </div>

      <div style={{ padding:"16px 20px", background:"#1a1a24", borderRadius:"8px", border:"1px solid #2a2a3a", fontSize:"13px", color:"#a0a0b0" }}>
        <strong style={{ color:"#fff" }}>Local Pickup</strong> — Birchleigh North, Kempton Park<br />
        Mon-Fri: 18:30-21:00 | Sat: 10:00-18:00 | Sun: 10:00-15:00<br />
        <span style={{ color:"#ff6b35" }}>Give us 24 hours notice to prep your order!</span>
      </div>
    </div>
  );
}

