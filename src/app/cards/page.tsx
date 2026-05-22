import Link from "next/link";
import AddToPileButton from "@/components/AddToPileButton";
import { getCards } from "@/lib/api";

const ERAS = [
  { label: "All", value: "", sets: [] },
  { label: "WotC Base Era", value: "B1", sets: [
    {code:"BS",name:"Base Set"},{code:"BSS",name:"Base Set Shadowless"},
    {code:"JU",name:"Jungle"},{code:"FO",name:"Fossil"},{code:"B2",name:"Base Set 2"},
    {code:"TR",name:"Team Rocket"},{code:"G1",name:"Gym Heroes"},{code:"G2",name:"Gym Challenge"},
    {code:"N1",name:"Neo Genesis"},{code:"N2",name:"Neo Discovery"},{code:"N3",name:"Neo Revelation"},
    {code:"N4",name:"Neo Destiny"},{code:"LC",name:"Legendary Collection"},{code:"SI1",name:"Southern Islands"},
    {code:"EXP",name:"Expedition Base Set"},{code:"AQ",name:"Aquapolis"},{code:"SK",name:"Skyridge"},
  ]},
  { label: "EX Era", value: "B2", sets: [
    {code:"RS",name:"Ruby & Sapphire"},{code:"SS",name:"Sandstorm"},{code:"DR",name:"Dragon"},
    {code:"MA",name:"Team Magma vs Team Aqua"},{code:"HL",name:"Hidden Legends"},
    {code:"RG",name:"FireRed & LeafGreen"},{code:"TRR",name:"Team Rocket Returns"},
    {code:"DX",name:"Deoxys"},{code:"EM",name:"Emerald"},{code:"UF",name:"Unseen Forces"},
    {code:"DS",name:"Delta Species"},{code:"LM",name:"Legend Maker"},
    {code:"HP",name:"Holon Phantoms"},{code:"CG",name:"Crystal Guardians"},
    {code:"DF",name:"Dragon Frontiers"},{code:"PK",name:"Power Keepers"},
  ]},
  { label: "D&P / HG&SS", value: "B3", sets: [
    {code:"DP",name:"Diamond & Pearl"},{code:"MT",name:"Mysterious Treasures"},
    {code:"SW",name:"Secret Wonders"},{code:"GE",name:"Great Encounters"},
    {code:"MD",name:"Majestic Dawn"},{code:"LA",name:"Legends Awakened"},
    {code:"SF",name:"Stormfront"},{code:"PL",name:"Platinum"},
    {code:"RR",name:"Rising Rivals"},{code:"SV",name:"Supreme Victors"},{code:"AR",name:"Arceus"},
    {code:"HS",name:"HeartGold & SoulSilver"},{code:"UL",name:"Unleashed"},
    {code:"UD",name:"Undaunted"},{code:"TM",name:"Triumphant"},{code:"CL",name:"Call of Legends"},
    {code:"RUM",name:"Rumble"},
  ]},
  { label: "Black & White", value: "B4", sets: [
    {code:"BLW",name:"Black & White"},{code:"EPO",name:"Emerging Powers"},
    {code:"NVI",name:"Noble Victories"},{code:"NXD",name:"Next Destinies"},
    {code:"DEX",name:"Dark Explorers"},{code:"DRX",name:"Dragons Exalted"},
    {code:"DRV",name:"Dragon Vault"},{code:"BCR",name:"Boundaries Crossed"},
    {code:"PLS",name:"Plasma Storm"},{code:"PLF",name:"Plasma Freeze"},
    {code:"PLB",name:"Plasma Blast"},{code:"LTR",name:"Legendary Treasures"},
    {code:"LTRRC",name:"Legendary Treasures: Radiant Collection"},
  ]},
  { label: "XY Era", value: "B5", sets: [
    {code:"XY",name:"XY"},{code:"FLF",name:"Flashfire"},{code:"FFI",name:"Furious Fists"},
    {code:"PHF",name:"Phantom Forces"},{code:"PRC",name:"Primal Clash"},
    {code:"DCR",name:"Double Crisis"},{code:"KSS",name:"Kalos Starter Set"},
    {code:"ROS",name:"Roaring Skies"},{code:"AOR",name:"Ancient Origins"},
    {code:"BKT",name:"BREAKthrough"},{code:"BKP",name:"BREAKpoint"},
    {code:"GEN",name:"Generations"},{code:"GENRC",name:"Generations: Radiant Collection"},
    {code:"FCO",name:"Fates Collide"},{code:"STS",name:"Steam Siege"},{code:"EVO",name:"Evolutions"},
  ]},
  { label: "Sun & Moon", value: "B6", sets: [
    {code:"SUM",name:"Sun & Moon"},{code:"GRI",name:"Guardians Rising"},
    {code:"BUS",name:"Burning Shadows"},{code:"SLG",name:"Shining Legends"},
    {code:"CIN",name:"Crimson Invasion"},{code:"UPR",name:"Ultra Prism"},
    {code:"FLI",name:"Forbidden Light"},{code:"CES",name:"Celestial Storm"},
    {code:"DRM",name:"Dragon Majesty"},{code:"LOT",name:"Lost Thunder"},
    {code:"TEU",name:"Team Up"},{code:"DET",name:"Detective Pikachu"},
    {code:"UNB",name:"Unbroken Bonds"},{code:"UNM",name:"Unified Minds"},
    {code:"HIF",name:"Hidden Fates"},{code:"HIFSV",name:"Hidden Fates: Shiny Vault"},
    {code:"CEC",name:"Cosmic Eclipse"},
  ]},
  { label: "Sword & Shield", value: "B7", sets: [
    {code:"SSH",name:"Sword & Shield"},{code:"RCL",name:"Rebel Clash"},
    {code:"DAA",name:"Darkness Ablaze"},{code:"CPA",name:"Champion's Path"},
    {code:"VIV",name:"Vivid Voltage"},{code:"SHF",name:"Shining Fates"},
    {code:"SHFSV",name:"Shining Fates: Shiny Vault"},{code:"BST",name:"Battle Styles"},
    {code:"CRE",name:"Chilling Reign"},{code:"EVS",name:"Evolving Skies"},
    {code:"CEL",name:"Celebrations"},{code:"CELCC",name:"Celebrations: Classic Collection"},
    {code:"FST",name:"Fusion Strike"},{code:"BRS",name:"Brilliant Stars"},
    {code:"ASR",name:"Astral Radiance"},{code:"PGO",name:"Pokemon GO"},
    {code:"LOR",name:"Lost Origin"},{code:"SIT",name:"Silver Tempest"},
    {code:"CRZ",name:"Crown Zenith"},
  ]},
  { label: "Scarlet & Violet", value: "B8", sets: [
    {code:"SV1",name:"Scarlet & Violet"},{code:"SV2",name:"Paldea Evolved"},
    {code:"SV3",name:"Obsidian Flames"},{code:"MEW",name:"151"},
    {code:"SV4",name:"Paradox Rift"},{code:"SV4PT5",name:"Paldean Fates"},
    {code:"TEF",name:"Temporal Forces"},{code:"TWM",name:"Twilight Masquerade"},
    {code:"SFA",name:"Shrouded Fable"},{code:"SCR",name:"Stellar Crown"},
    {code:"SSP",name:"Surging Sparks"},{code:"PRE",name:"Prismatic Evolutions"},
    {code:"JTG",name:"Journey Together"},{code:"DRI",name:"Destined Rivals"},
    {code:"BLK",name:"Black Bolt"},{code:"WHT",name:"White Flare"},
    {code:"SVE",name:"Scarlet & Violet Energies"},{code:"TCGCL",name:"Trading Card Game Classic"},
  ]},
  { label: "Mega Evolution", value: "B9", sets: [
    {code:"MEG",name:"Mega Evolution"},{code:"PFL",name:"Phantasmal Flames"},
    {code:"ASC",name:"Ascended Heroes"},{code:"POR",name:"Perfect Order"},
    {code:"CRI",name:"Chaos Rising"},
  ]},
];

const SPECIAL_GROUPS: { label: string; color: string; sets: {code:string;name:string}[] }[] = [
  { label: "Promos", color: "#F59E0B", sets: [
    {code:"PR-WB",name:"Wizards Black Star Promos"},
    {code:"PR-NB",name:"Nintendo Black Star Promos"},
    {code:"PR-DPP",name:"DP Black Star Promos"},
    {code:"PR-HS",name:"HGSS Black Star Promos"},
    {code:"PR-BLW",name:"BW Black Star Promos"},
    {code:"PR-XY",name:"XY Black Star Promos"},
    {code:"PR-SM",name:"SM Black Star Promos"},
    {code:"PR-SW",name:"SWSH Black Star Promos"},
    {code:"SVP",name:"SV Promos"},
  ]},
  { label: "POP Series", color: "#10B981", sets: [
    {code:"POP1",name:"POP Series 1"},{code:"POP2",name:"POP Series 2"},
    {code:"POP3",name:"POP Series 3"},{code:"POP4",name:"POP Series 4"},
    {code:"POP5",name:"POP Series 5"},{code:"POP6",name:"POP Series 6"},
    {code:"POP7",name:"POP Series 7"},{code:"POP8",name:"POP Series 8"},
    {code:"POP9",name:"POP Series 9"},
  ]},
  { label: "McDonalds", color: "#EF4444", sets: [
    {code:"MCD11",name:"McDonalds 2011"},{code:"MCD12",name:"McDonalds 2012"},
    {code:"MCD14",name:"McDonalds 2014"},{code:"MCD15",name:"McDonalds 2015"},
    {code:"MCD16",name:"McDonalds 2016"},{code:"MCD17",name:"McDonalds 2017"},
    {code:"MCD18",name:"McDonalds 2018"},{code:"MCD19",name:"McDonalds 2019"},
    {code:"MCD21",name:"McDonalds 25th Anniversary"},
    {code:"MCD22",name:"McDonalds 2022"},{code:"MCD23",name:"McDonalds 2023"},
    {code:"MCD24",name:"McDonalds 2024"},
  ]},
  { label: "Trainer Gallery", color: "#8B5CF6", sets: [
    {code:"BRSTG",name:"Brilliant Stars TG"},
    {code:"ASRTG",name:"Astral Radiance TG"},
    {code:"LORTG",name:"Lost Origin TG"},
    {code:"SITTG",name:"Silver Tempest TG"},
    {code:"CRZGG",name:"Crown Zenith GG"},
  ]},
  { label: "Trick or Trade", color: "#EC4899", sets: [
    {code:"TTBB",name:"Trick or Trade 2022"},
    {code:"TTBB23",name:"Trick or Trade 2023"},
    {code:"TTBB24",name:"Trick or Trade 2024"},
  ]},
  { label: "Battle Academy", color: "#14B8A6", sets: [
    {code:"BTA",name:"Battle Academy"},
    {code:"BA22",name:"Battle Academy 2022"},
    {code:"BA24",name:"Battle Academy 2024"},
  ]},
  { label: "Prize Pack", color: "#F97316", sets: [
    {code:"PRIZEPACK",name:"Prize Pack Series"},
  ]},
  { label: "WCD & Exclusives", color: "#6B7280", sets: [
    {code:"WCD",name:"World Championship Decks"},
    {code:"BLE",name:"Blister Exclusives"},
    {code:"MCAP",name:"Miscellaneous Cards"},
    {code:"LEAGUE",name:"League & Championship Cards"},
    {code:"JUMBO",name:"Jumbo Cards"},
    {code:"ALTART",name:"Alternate Art Promos"},
    {code:"PPP",name:"Professor Program Promos"},
    {code:"CCP",name:"Countdown Calendar Promos"},
    {code:"PWCP",name:"Pikachu World Collection"},
    {code:"KWBP",name:"Kids WB Promos"},
    {code:"BKP-BK",name:"Burger King Promos"},
    {code:"SAMPLE",name:"e-Reader Sample Cards"},
  ]},
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

const ENERGY_SUBTYPES = [
  { label: "Special Energy", value: "Special" },
];

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
  { label: "Grass", value: "Grass", color: "#4ade80" },
  { label: "Fire", value: "Fire", color: "#f97316" },
  { label: "Water", value: "Water", color: "#38bdf8" },
  { label: "Lightning", value: "Lightning", color: "#facc15" },
  { label: "Psychic", value: "Psychic", color: "#c084fc" },
  { label: "Fighting", value: "Fighting", color: "#fb923c" },
  { label: "Darkness", value: "Darkness", color: "#94a3b8" },
  { label: "Metal", value: "Metal", color: "#cbd5e1" },
  { label: "Dragon", value: "Dragon", color: "#818cf8" },
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
  if (v === "RH") return "RH";
  if (v === "ERH") return "ERH";
  if (v === "RH-PB") return "RH-PB";
  if (v === "RH-MB") return "RH-MB";
  if (v === "BRH-FB") return "BRH-FB";
  if (v === "BRH-LB") return "BRH-LB";
  if (v === "BRH-QB") return "BRH-QB";
  if (v === "BRH-DB") return "BRH-DB";
  if (v === "BRH-R") return "BRH-R";
  if (v === "DR") return "DR";
  if (v === "AS") return "AS";
  if (v === "MH") return "MH";
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

// ── VARIANT OVERLAY — DO NOT REMOVE OR ALTER (except adding new variants) ──
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
    case "DR": return (<>{diag("rgba(180,178,169,0.12)")}{badge("DR","#444441","#D3D1C7")}<div style={{ position:"absolute",bottom:4,right:4,fontSize:9,fontWeight:600,color:"#B4B2A9",zIndex:3 }}>EX</div></>);
    case "AS": return (<>{aceBorder}{badge("ACE","linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)","#fff")}</>);
    case "MH": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(55,138,221,0.1) 4px,rgba(55,138,221,0.1) 5px)" }}/><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(55,138,221,0.07) 4px,rgba(55,138,221,0.07) 5px)" }}/>{badge("MH","#0C447C","#B5D4F4")}</>);
    case "1ST": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",boxShadow:"inset 0 0 0 2px rgba(29,158,117,0.3)" }}/>{badge("1st ED","#085041","#9FE1CB","tl")}</>);
    case "IR": return (<>{diag("rgba(186,117,23,0.1)")}{badge("IR","#633806","#FAC775")}{stars(1,["#EF9F27"])}</>);
    case "SIR": return (<><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(60deg,transparent,transparent 4px,rgba(239,159,39,0.15) 4px,rgba(239,159,39,0.15) 5px)" }}/><div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(-60deg,transparent,transparent 4px,rgba(239,159,39,0.08) 4px,rgba(239,159,39,0.08) 5px)" }}/>{badge("SIR","#412402","#FAC775")}{stars(2,["#EF9F27","#EF9F27"])}</>);
    case "HR": return (<>{aceBorder}{badge("HR","linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)","#fff")}{stars(3,["#E24B4A","#EF9F27","#7F77DD"])}</>);
    default: return null;
  }
}
// ── END VARIANT OVERLAY — DO NOT REMOVE OR ALTER ──

function buildHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...current, ...overrides, page: "1" };
  if ("page" in overrides) merged.page = overrides.page || "1";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) { if (v) p.set(k, v); }
  return `/cards?${p.toString()}`;
}

function Paginator({ current, total, params }: { current: number; total: number; params: Record<string, string | undefined> }) {
  if (total <= 1) return null;
  const pages: (number | "...")[] = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current - 2 > 2) pages.push("...");
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i);
    if (current + 2 < total - 1) pages.push("...");
    pages.push(total);
  }
  const btn: React.CSSProperties = { padding:"7px 12px", borderRadius:"6px", fontSize:"13px", textDecoration:"none", fontWeight:500, display:"inline-block", border:"1px solid #2a2a3a", minWidth:"36px", textAlign:"center" };
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:"4px", flexWrap:"wrap", alignItems:"center" }}>
      {current > 1 && <Link href={buildHref(params, { page: String(current-1) })} style={{ ...btn, background:"#1a1a24", color:"#fff" }}>prev</Link>}
      {pages.map((p,i) => p === "..." ? <span key={`e${i}`} style={{ ...btn, background:"transparent", border:"none", color:"#555" }}>...</span> : <Link key={p} href={buildHref(params, { page: String(p) })} style={{ ...btn, background:p===current?"#ff6b35":"#1a1a24", color:"#fff", borderColor:p===current?"#ff6b35":"#2a2a3a" }}>{p}</Link>)}
      {current < total && <Link href={buildHref(params, { page: String(current+1) })} style={{ ...btn, background:"#1a1a24", color:"#fff" }}>next</Link>}
      <span style={{ color:"#555", fontSize:"12px", marginLeft:"8px" }}>Page {current} of {total}</span>
    </div>
  );
}

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const activeEra = ERAS.find(e => e.value === (params.era || "")) || ERAS[0];
  const activeSpecialGroup = SPECIAL_GROUPS.find(g => g.sets.some(s => s.code === params.card_set) && !params.era);
  const showInStock = params.show_out_of_stock !== "true";
  const currentSupertype = params.supertype || "";

  // Determine which subtype row to show
  const subtypeOptions = currentSupertype === "Trainer" ? TRAINER_SUBTYPES
    : currentSupertype === "Energy" ? ENERGY_SUBTYPES
    : currentSupertype === "Pokemon" ? POKEMON_SUBTYPES
    : [];
  const showEnergyTypes = !currentSupertype || currentSupertype === "Pokemon";

  const data = await getCards({
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
    min_price: "0.01",
  });

  const totalPages = Math.ceil((data.count || 0) / 32);

  const eraTabStyle = (active: boolean): React.CSSProperties => ({
    display:"block", background: active ? "#ff6b35" : "#1a1a24",
    border:`1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
    color:"#fff", padding:"6px 14px", borderRadius:"6px",
    textDecoration:"none", fontSize:"13px", fontWeight:500,
  });

  const filterChip = (active: boolean, color = "#ff6b35"): React.CSSProperties => ({
    background: active ? color+"22" : "#1a1a24",
    border:`1px solid ${active ? color : "#2a2a3a"}`,
    color: active ? color : "#a0a0b0",
    padding:"4px 12px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:500,
  });

  return (
    <div style={{ maxWidth:"1400px", margin:"0 auto", padding:"20px 1.5rem" }}>

      {/* ── ERA TABS ── */}
      <div style={{ marginBottom:"4px" }}>
        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
          {ERAS.map((era) => {
            const isActive = (params.era || "") === era.value && !activeSpecialGroup;
            return (
              <Link key={era.value} href={buildHref(params, { era: era.value || undefined, card_set: undefined, page:"1" })} style={eraTabStyle(isActive)}>
                {era.label}
              </Link>
            );
          })}
        </div>

        {/* SET DROPDOWN for active era */}
        {activeEra.sets.length > 0 && !activeSpecialGroup && (
          <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderTop:"2px solid #ff6b35", borderRadius:"0 6px 6px 6px", padding:"10px 12px", display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"4px" }}>
            <Link href={buildHref(params, { card_set: undefined, page:"1" })} style={filterChip(!params.card_set)}>All sets</Link>
            {activeEra.sets.map((s) => (
              <Link key={s.code} href={buildHref(params, { card_set: s.code, page:"1" })} style={filterChip(params.card_set === s.code)}>{s.name}</Link>
            ))}
          </div>
        )}
      </div>

      {/* ── SPECIAL SETS ROW ── */}
      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", alignItems:"center", marginBottom:"8px", paddingTop:"6px", borderTop:"1px solid #2a2a3a" }}>
        <span style={{ fontSize:"10px", color:"#555", fontWeight:700, letterSpacing:"0.08em", marginRight:"2px" }}>SPECIAL</span>
        {SPECIAL_GROUPS.map((group) => {
          const isActive = group.sets.some(s => s.code === params.card_set) && !params.era;
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

      {/* SPECIAL SET PICKER — shows individual sets when a group is active */}
      {activeSpecialGroup && (
        <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderTop:`2px solid ${activeSpecialGroup.color}`, borderRadius:"6px", padding:"10px 12px", display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
          {activeSpecialGroup.sets.map((s) => (
            <Link key={s.code} href={buildHref(params, { card_set: s.code, era: undefined, page:"1" })}
              style={filterChip(params.card_set === s.code, activeSpecialGroup.color)}>
              {s.name}
            </Link>
          ))}
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

      {/* ── SUBTYPE ROW — changes based on supertype ── */}
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

      {/* ── ENERGY TYPE ROW — only for Pokemon ── */}
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
        <input name="search" defaultValue={params.search} placeholder="Search name, set..." style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 14px", color:"#fff", fontSize:"13px", flex:1, minWidth:"180px" }} />
        <select name="rarity" defaultValue={params.rarity || ""} style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px" }}>
          {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select name="ordering" defaultValue={params.ordering || "card_number"} style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px" }}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="submit" style={{ background:"#ff6b35", color:"#fff", border:"none", borderRadius:"6px", padding:"8px 18px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>Search</button>
        {(params.search || params.rarity || params.era || params.energy_type || params.supertype || params.card_set || params.subtype) && (
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
                  <div style={{ fontSize:"10px", color:"#555", marginBottom:"2px" }}>{eraCode} · {setCode} · #{cardNum}</div>
                  <div style={{ fontSize:"11px", color:"#ddd", marginBottom:"3px", lineHeight:1.3, fontWeight:500 }}>{card.name}</div>
                  <div style={{ fontSize:"10px", color:"#555", marginBottom:"5px" }}>{card.rarity?.replace(/_/g," ").toUpperCase()}</div>
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







