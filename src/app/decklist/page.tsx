"use client";
// v1.0.0 — Decklist Manager
// Ported from standalone GitHub Pages tool (cave37-coder/pokebulk-decklist)
// Phase 1: localStorage-based, standalone page. Phase 2 (future): Django persistence
// + legality checks validated against the live card database instead of the
// hardcoded set lists below.

import { useEffect, useMemo, useRef, useState } from "react";

// ════════════════════════════════════════════════
// THEME (matches src/app/about/page.tsx conventions)
// ════════════════════════════════════════════════
const COLORS_THEME = {
  bg: "#0e0e16",
  panel: "#16161f",
  panel2: "#1c1c28",
  border: "#2a2a3a",
  border2: "#3a3a4d",
  text: "#fff",
  muted: "#a0a0b0",
  hint: "#6e6e80",
  accent: "#ff6b35",
  green: "#1d9e75",
  red: "#e24b4a",
  orange: "#ef9f27",
  blue: "#378add",
};

const STATUS_COLORS: Record<
  "ok" | "bad" | "warn" | "info",
  { bg: string; border: string; text: string }
> = {
  ok: { bg: "rgba(29,158,117,0.12)", border: "rgba(29,158,117,0.35)", text: "#4ade9c" },
  bad: { bg: "rgba(226,75,74,0.12)", border: "rgba(226,75,74,0.35)", text: "#ff8a89" },
  warn: { bg: "rgba(239,159,39,0.12)", border: "rgba(239,159,39,0.35)", text: "#ffc56b" },
  info: { bg: "rgba(55,138,221,0.12)", border: "rgba(55,138,221,0.35)", text: "#7ec1f5" },
};

const DOT_COLORS = ["#ff6b35", "#378add", "#ef9f27", "#1d9e75", "#a78bfa", "#e24b4a", "#f472b6", "#2dd4bf"];

// ════════════════════════════════════════════════
// LEGALITY DATA — 2026-27 Standard Season
// Legal: H, I, J regulation marks
// G-mark rotated out: SVI, PAL, OBF, MEW, PAR, PAF, TEF
// ════════════════════════════════════════════════
const LEGAL_SETS = new Set([
  "TWM", "SFA", "SCR", "SSP", "PRE",
  "JTG", "DRI", "BLK", "WHT", "MEG", "MEE", "MEP",
  "POR", "ASC", "PFL",
  "SVP", "SVE", "M23", "M24",
  "ENE", "NRG",
]);

const ROTATED = new Set(["SVI", "PAL", "OBF", "MEW", "PAR", "PAF", "TEF"]);

const EXPANDED = new Set([
  "CRZ", "SIT", "LOR", "PGO", "ASR", "BRS", "FST", "CEL", "EVS", "CRE", "BST", "SHF",
  "VIV", "CPA", "DAA", "RCL", "SSH", "CEC", "HIF", "UNM", "UNB", "TEU", "LOT", "DRM",
  "FLI", "UPR", "CIN", "BUS", "GRI", "SUM", "PHF", "ROS", "PRC", "FFI", "XY", "DEX",
  "NVI", "EPO", "HS", "HGSS", "AR", "RR", "PL", "MD", "LA", "MT", "DP", "HP", "CG",
  "DF", "LM", "DS", "EM", "DX", "TRR", "HL", "MA", "SS", "SK", "AQ", "BS", "JU", "FO",
  "TR", "GR", "N1", "N2", "N3", "N4", "BKT", "BKP", "FCO", "STS", "EVO", "GEN",
  "EXP", "NXD", "BCR", "PLB", "LTR", "FLF", "AOR",
]);

// Trainer card names confirmed reprinted in H/I/J legal sets — an older
// printing of any name below is legal to play.
const TRAINER_REPRINTS = new Set([
  "rare candy", "ultra ball", "switch", "energy switch", "nest ball", "poke ball",
  "pokeball", "great ball", "super rod", "pal pad", "counter catcher", "escape rope",
  "energy retrieval", "max elixir", "level ball", "quick ball", "evolution incense",
  "ordinary rod", "training court", "air balloon", "tool scrapper", "exp. share",
  "float stone", "muscle band", "choice band", "rocky helmet", "heavy baton",
  "night stretcher", "buddy-buddy poffin", "potion", "super potion", "max potion",
  "full heal", "antidote", "revive", "max revive", "hyper potion", "energy loto",
  "pokemon communication", "energy spinner", "timer ball", "mysterious treasure",
  "capture energy", "turbo patch", "trekking shoes", "lost vacuum", "choice belt",
  "jet booster", "magma basin", "echoing horn", "scoop up net", "vs seeker",
  "field blower", "hammer head", "poke stop", "pokestop", "dark patch",
  "battle vip pass", "mirage gate", "hisuian heavy ball", "forest seal stone",
  "earthen vessel",
  "boss's orders", "professor's research", "iono", "arven", "irida",
  "colress's experiment", "judge", "marnie", "raihan", "piers", "hop", "gloria",
  "leon", "bede", "melony", "peonia", "klara", "avery", "dana", "elesa's sparkle",
  "flannery", "cheryl", "fan of waves", "furisode girl", "gardenia's vigor", "grant",
  "honey", "jacq", "katy", "larry", "miriam", "nemona", "penny",
  "professor sada's vitality", "professor turo's scenario", "tulip",
  "pokémon league headquarters", "pokemon league headquarters", "path to the peak",
  "collapsed stadium", "raifort's schoolroom", "mesagoza", "beach court", "artazon",
  "area zero underdepths", "future booster energy capsule",
  "ancient booster energy capsule", "technical machine: evolution",
  "technical machine: turbo boost", "technical machine: blindside",
  "technical machine: devolution", "pokégear 3.0", "pokegear 3.0", "n", "cheren",
  "bianca", "skyla", "colress", "lysandre", "shauna", "serena", "tierno", "korrina",
  "pokemon center lady", "pokémon center lady", "teammates", "sycamore",
  "professor sycamore", "birch's observations", "professor birch's observations",
  "wally's compassion", "wally", "lillie", "lillie's determination", "cynthia",
  "roark", "volkner",
]);

// ════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════
type FormatName = "Standard" | "Expanded" | "TCG Live";
const FORMATS: FormatName[] = ["Standard", "Expanded", "TCG Live"];

interface Deck {
  id: string;
  name: string;
  format: FormatName;
  pokemon: string;
  trainers: string;
  energy: string;
  notes: string;
  total: number;
  created: number;
  modified: number;
  imported: number | null;
  illegal: number;
  warn: number;
}

interface Profile {
  first: string;
  last: string;
  num: string;
  dob: string;
}

interface IllegalEntry {
  code: string;
  label: string;
  name?: string;
  fullLine?: string;
  section: "pokemon" | "trainer";
}
interface ReprintEntry {
  name: string;
  code: string | null;
}
interface LegalityResult {
  status: "ok" | "bad" | "warn" | "reprint";
  illegal: IllegalEntry[];
  reprinted: ReprintEntry[];
  unknown: string[];
}

// ════════════════════════════════════════════════
// LEGALITY ENGINE (ported 1:1 from the original tool)
// ════════════════════════════════════════════════
function extractCardName(line: string): string {
  let s = line.trim().replace(/^\d+\s+/, "");
  s = s.replace(/\s+[A-Z][A-Z0-9]{1,4}\s+\d+[a-z]?\s*$/i, "").trim();
  s = s.replace(/\s+\d+[a-z]?\s*$/, "").trim();
  return s.toLowerCase();
}

function extractSetCode(line: string): string | null {
  const m = line.trim().match(/\b([A-Z][A-Z0-9]{1,4})\s+\d{1,4}[a-z]?\s*$/);
  return m ? m[1] : null;
}

function checkLegality(pokemonText: string, trainerText: string, energyText: string): LegalityResult {
  const illegal: IllegalEntry[] = [];
  const reprinted: ReprintEntry[] = [];
  const unknown: string[] = [];

  function processSection(text: string, section: "pokemon" | "trainer" | "energy") {
    text
      .trim()
      .split("\n")
      .forEach((raw) => {
        const line = raw.trim();
        if (!line || !/^\d+\s/.test(line)) return;
        const code = extractSetCode(line);
        if (!code) return;
        if (LEGAL_SETS.has(code)) return;
        if (section === "energy") return;

        const isRotated = ROTATED.has(code);
        const isExpanded = EXPANDED.has(code);
        const isOld = isRotated || isExpanded;

        if (section === "pokemon") {
          if (isOld) {
            const cardName = extractCardName(line);
            const fullLine = line.replace(/^\d+\s+/, "").trim();
            if (!illegal.find((x) => x.fullLine === fullLine)) {
              illegal.push({
                code,
                label: isRotated ? "rotated (G)" : "expanded/old",
                name: cardName,
                fullLine,
                section: "pokemon",
              });
            }
          } else if (!unknown.includes(code)) {
            unknown.push(code);
          }
        } else if (section === "trainer") {
          const name = extractCardName(line);
          if (TRAINER_REPRINTS.has(name)) {
            if (!reprinted.find((x) => x.name === name)) reprinted.push({ name, code });
          } else if (isOld) {
            if (!illegal.find((x) => x.code === code && x.name === name)) {
              illegal.push({ code, name, label: "trainer — no reprint found", section: "trainer" });
            }
          } else if (!unknown.includes(code)) {
            unknown.push(code);
          }
        }
      });
  }

  processSection(pokemonText, "pokemon");
  processSection(trainerText, "trainer");
  processSection(energyText, "energy");

  let status: LegalityResult["status"];
  if (illegal.length > 0) status = "bad";
  else if (unknown.length > 0) status = "warn";
  else if (reprinted.length > 0) status = "reprint";
  else status = "ok";

  return { status, illegal, reprinted, unknown };
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════
const DECKS_KEY = "pokebulk_decklist_decks_v1";
const PROFILE_KEY = "pokebulk_decklist_trainer_v1";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDt(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDs(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function cntLines(txt: string): number {
  return txt
    .trim()
    .split("\n")
    .reduce((sum, l) => {
      const m = l.trim().match(/^(\d+)\s/);
      return sum + (m ? parseInt(m[1], 10) : 0);
    }, 0);
}

function getLegalMeta(d: { format: FormatName; pokemon: string; trainers: string; energy: string }) {
  if (d.format !== "Standard") return { illegal: 0, warn: 0 };
  const { illegal, unknown } = checkLegality(d.pokemon, d.trainers, d.energy);
  return { illegal: illegal.length, warn: unknown.length };
}

function parseImportedText(raw: string): { name: string; pokemon: string; trainers: string; energy: string } {
  const lines = raw.split("\n");
  let section: "pokemon" | "trainer" | "energy" = "pokemon";
  const pokemon: string[] = [];
  const trainers: string[] = [];
  const energy: string[] = [];
  let name = "Imported Deck";

  for (const rawLine of lines) {
    const tr = rawLine.trim();
    if (!tr) continue;
    if (/^#{1,2}\s/.test(tr)) {
      const n = tr.replace(/^#+\s*/, "").replace(/\[.*?\]/g, "").replace(/—.*/, "").trim();
      if (n) name = n;
      continue;
    }
    const lo = tr.toLowerCase();
    if (lo.startsWith("pokemon:") && !/^\d/.test(tr)) {
      section = "pokemon";
      continue;
    }
    if ((lo.startsWith("trainer:") || lo.startsWith("trainers:")) && !/^\d/.test(tr)) {
      section = "trainer";
      continue;
    }
    if (lo.startsWith("energy:") && !/^\d/.test(tr)) {
      section = "energy";
      continue;
    }
    if (lo.startsWith("total cards") || lo.startsWith("total:")) continue;
    if (/^\d+\s/.test(tr)) {
      if (section === "pokemon") pokemon.push(tr);
      else if (section === "trainer") trainers.push(tr);
      else energy.push(tr);
    }
  }
  return { name, pokemon: pokemon.join("\n"), trainers: trainers.join("\n"), energy: energy.join("\n") };
}

function blankDeck(name: string): Deck {
  const now = Date.now();
  return {
    id: uid(),
    name: name || "New Deck",
    format: "Standard",
    pokemon: "",
    trainers: "",
    energy: "",
    notes: "",
    total: 0,
    created: now,
    modified: now,
    imported: null,
    illegal: 0,
    warn: 0,
  };
}

// ════════════════════════════════════════════════
// CARD SEARCH — live lookup against the PokéBulk catalog
// ════════════════════════════════════════════════
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface ApiCardSet {
  id: number;
  code: string;
  name: string;
  era?: { id: number; code: string; name: string } | null;
}
interface ApiProduct {
  id: number;
  name: string;
  card_set: ApiCardSet | null;
  card_number: number | null;
  supertype: string | null;
  card_subtypes?: string | null;
  image_url: string | null;
  image_small_url: string | null;
  price: string | null;
  stock: number;
  in_stock: boolean;
  variant_override?: string | null;
}
interface ApiSearchResponse {
  count: number;
  results: ApiProduct[];
}

type CardSection = "pokemon" | "trainer" | "energy";

// supertype is unreliable in this catalog (often empty, or holds the
// evolution stage instead of the true supertype). card_subtypes is the
// reliable signal — Trainer cards come back as e.g. "Trainer - Item" or
// just "Item"/"Supporter"/"Stadium"/"Tool", and Energy cards mention
// "Energy". None of the Pokémon-side subtype vocabulary (Stage 2, Basic,
// VSTAR, Fire, Tera, etc.) overlaps with those words, so this is safe.
function classifySection(card: ApiProduct): CardSection {
  const subtypes = (card.card_subtypes || "").toLowerCase();
  const supertype = (card.supertype || "").toLowerCase().trim();
  if (supertype === "energy" || /\benergy\b/.test(subtypes)) return "energy";
  if (supertype === "trainer" || /\b(item|supporter|stadium|tool|trainer)\b/.test(subtypes)) return "trainer";
  return "pokemon";
}

function sectionLabel(s: CardSection): string {
  return s === "pokemon" ? "Pokémon" : s === "trainer" ? "Trainer" : "Energy";
}
function sectionColor(s: CardSection): string {
  return s === "pokemon" ? COLORS_THEME.accent : s === "trainer" ? COLORS_THEME.blue : COLORS_THEME.orange;
}

// Card names from the API come with a trailing " - 022/217" or " -196"
// style number suffix baked in — strip it for the clean decklist name.
function cleanCardName(name: string): string {
  return name.replace(/\s*-\s*\d+(\/\d+)?\s*$/, "").trim();
}

// Build a decklist line fragment (without the leading count) like
// "Charizard EX OBF 125". Returns null if the card has no set/number to
// build a valid line from.
function buildCardLineFragment(card: ApiProduct): string | null {
  if (!card.card_set || card.card_number == null) return null;
  const num = String(card.card_number).padStart(3, "0");
  return `${cleanCardName(card.name)} ${card.card_set.code} ${num}`;
}

// Append a new "1 X" line, or increment the count if that exact card is
// already present in the text block.
function appendOrIncrementLine(currentText: string, lineFragment: string): string {
  const lines = currentText.split("\n").filter((l) => l.trim().length > 0);
  const idx = lines.findIndex((l) => l.replace(/^\d+\s+/, "").trim() === lineFragment);
  if (idx >= 0) {
    const m = lines[idx].match(/^(\d+)\s+(.*)$/);
    const newCount = m ? parseInt(m[1], 10) + 1 : 2;
    lines[idx] = `${newCount} ${lineFragment}`;
  } else {
    lines.push(`1 ${lineFragment}`);
  }
  return lines.join("\n");
}

// ════════════════════════════════════════════════
// SMALL UI PIECES
// ════════════════════════════════════════════════
function LegalityBanner({ result, format }: { result: LegalityResult | null; format: FormatName }) {
  if (format !== "Standard") {
    return (
      <div style={{ padding: "10px 16px", fontSize: 12, color: COLORS_THEME.hint, borderBottom: `1px solid ${COLORS_THEME.border}` }}>
        {format === "Expanded" ? "Expanded format — different card pool" : "TCG Live format"}
      </div>
    );
  }
  if (!result) {
    return (
      <div style={{ padding: "10px 16px", fontSize: 12, color: COLORS_THEME.hint, borderBottom: `1px solid ${COLORS_THEME.border}` }}>
        —
      </div>
    );
  }

  const kind: "ok" | "bad" | "warn" | "info" =
    result.status === "ok" || result.status === "reprint" ? (result.status === "reprint" ? "info" : "ok") : result.status === "bad" ? "bad" : "warn";
  const c = STATUS_COLORS[kind];

  let icon = "✓";
  let title = "Standard legal — 2026-27 season";
  let detail: React.ReactNode = "All detected set codes are legal (H/I/J marks).";
  let tags: React.ReactNode = null;

  if (result.status === "bad") {
    icon = "✗";
    const poke = result.illegal.filter((x) => x.section === "pokemon");
    const trainer = result.illegal.filter((x) => x.section === "trainer");
    title = `${result.illegal.length} illegal card${result.illegal.length !== 1 ? "s" : ""} detected`;
    detail = (
      <>
        {poke.length > 0 && <div>Pokémon — verify regulation mark on card:</div>}
        {trainer.length > 0 && (
          <div>
            Trainer not in reprint list:{" "}
            {trainer.map((x, i) => (
              <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 11 }}>
                {x.name || x.code}
              </code>
            ))}
          </div>
        )}
      </>
    );
    tags = (
      <>
        {poke.length > 0 && (
          <div style={{ opacity: 0.85 }}>
            ✗ Check these:{" "}
            {poke.map((x, i) => (
              <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 10 }}>
                {x.fullLine}
              </code>
            ))}
          </div>
        )}
        {result.reprinted.length > 0 && (
          <div style={{ opacity: 0.8 }}>
            ✓ Older prints OK via reprint:{" "}
            {result.reprinted.map((x, i) => (
              <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 10 }}>
                {x.name}
              </code>
            ))}
          </div>
        )}
      </>
    );
  } else if (result.status === "warn") {
    icon = "⚠";
    title = `${result.unknown.length} unrecognised set code${result.unknown.length !== 1 ? "s" : ""} — verify manually`;
    detail = "Not found in 2026-27 legal set list. May be newer releases or typos:";
    tags = (
      <>
        {result.unknown.map((c2, i) => (
          <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 10 }}>
            {c2}?
          </code>
        ))}
        {result.reprinted.length > 0 && (
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            ✓ Older prints OK:{" "}
            {result.reprinted.map((x, i) => (
              <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 10 }}>
                {x.name}
              </code>
            ))}
          </div>
        )}
      </>
    );
  } else if (result.status === "reprint") {
    icon = "↩";
    title = "Older prints detected — legal via reprint";
    detail = "These Trainer cards are from older sets but have been reprinted in H/I/J legal sets:";
    tags = (
      <>
        {result.reprinted.map((x, i) => (
          <code key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "0 5px", marginRight: 4, fontSize: 10 }}>
            {x.name} <span style={{ opacity: 0.6 }}>({x.code})</span>
          </code>
        ))}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 16px",
        fontSize: 12,
        background: c.bg,
        color: c.text,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <div style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 800, marginBottom: 2 }}>{title}</div>
        <div>{detail}</div>
        {tags && <div style={{ fontSize: 11, marginTop: 5, opacity: 0.9, lineHeight: 1.8 }}>{tags}</div>}
      </div>
    </div>
  );
}

function NamePromptModal({
  open,
  defaultName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  defaultName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultName);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, defaultName]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: COLORS_THEME.panel,
          border: `1px solid ${COLORS_THEME.border2}`,
          borderRadius: 12,
          padding: 22,
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ color: COLORS_THEME.accent, fontSize: 14, fontWeight: 700 }}>Name Your Deck</div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(value.trim());
            if (e.key === "Escape") onCancel();
          }}
          placeholder="e.g. Alakazam ex — Regionals"
          style={{
            width: "100%",
            fontSize: 15,
            fontWeight: 700,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${COLORS_THEME.border2}`,
            background: COLORS_THEME.bg,
            color: COLORS_THEME.text,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnGhost}>
            Cancel
          </button>
          <button onClick={() => onConfirm(value.trim())} style={btnPrimary}>
            Create Deck
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// SHARED INLINE STYLE OBJECTS
// ════════════════════════════════════════════════
const btnGhost: React.CSSProperties = {
  padding: "7px 15px",
  borderRadius: 8,
  border: `1px solid ${COLORS_THEME.border2}`,
  background: "transparent",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  color: COLORS_THEME.muted,
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 15px",
  borderRadius: 8,
  border: "none",
  background: COLORS_THEME.accent,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

// ════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════
export default function DecklistPage() {
  const [hydrated, setHydrated] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [profile, setProfile] = useState<Profile>({ first: "", last: "", num: "", dob: "" });
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [deckTitle, setDeckTitle] = useState("");
  const [format, setFormat] = useState<FormatName>("Standard");
  const [pokemonText, setPokemonText] = useState("");
  const [trainersText, setTrainersText] = useState("");
  const [energyText, setEnergyText] = useState("");
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<number | null>(null);
  const [modified, setModified] = useState<number | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [namePromptOpen, setNamePromptOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importDeckName, setImportDeckName] = useState("");

  const [submitOpen, setSubmitOpen] = useState(false);
  const [recheckState, setRecheckState] = useState<"idle" | "checking" | "ok" | "bad" | "warn">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recheckResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Card search ──
  const [cardQuery, setCardQuery] = useState("");
  const [cardResults, setCardResults] = useState<ApiProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = cardQuery.trim();
    if (q.length < 2) {
      setCardResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    searchDebounce.current = setTimeout(() => {
      if (searchAbort.current) searchAbort.current.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearching(true);
      setSearchError(false);
      fetch(`${API_URL}/api/products/?search=${encodeURIComponent(q)}&page_size=24`, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<ApiSearchResponse>;
        })
        .then((data) => {
          const seen = new Set<string>();
          const deduped: ApiProduct[] = [];
          for (const c of data.results || []) {
            if (c.variant_override === "CC") continue; // digital code cards
            const key = `${c.card_set?.code || ""}-${c.card_number ?? ""}-${cleanCardName(c.name)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(c);
            if (deduped.length >= 10) break;
          }
          setCardResults(deduped);
          setSearching(false);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setSearchError(true);
          setSearching(false);
        });
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [cardQuery]);

  function handleAddCard(card: ApiProduct) {
    const fragment = buildCardLineFragment(card);
    if (!fragment) {
      toast("Card is missing set/number data — can't add");
      return;
    }
    const section = classifySection(card);
    if (section === "pokemon") setPokemonText((prev) => appendOrIncrementLine(prev, fragment));
    else if (section === "trainer") setTrainersText((prev) => appendOrIncrementLine(prev, fragment));
    else setEnergyText((prev) => appendOrIncrementLine(prev, fragment));
    toast(`Added to ${sectionLabel(section)}`);
  }

  // ── Load from localStorage on mount ──
  useEffect(() => {
    let loadedDecks: Deck[] = [];
    let loadedProfile: Profile = { first: "", last: "", num: "", dob: "" };
    try {
      loadedDecks = JSON.parse(localStorage.getItem(DECKS_KEY) || "[]");
    } catch {
      loadedDecks = [];
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      loadedProfile = {
        first: parsed.first || "",
        last: parsed.last || "",
        num: parsed.num || "",
        dob: parsed.dob || "",
      };
    } catch {
      // keep default
    }
    setDecks(loadedDecks);
    setProfile(loadedProfile);

    if (loadedDecks.length > 0) {
      applyDeckToEditor(loadedDecks[0]);
      setCurrentId(loadedDecks[0].id);
    } else {
      setNamePromptOpen(true);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autofill Trainer Profile first/last name from the logged-in account,
  // but only if those fields are still empty — never overwrite a name the
  // person has already set in this tool. ──
  useEffect(() => {
    if (!hydrated) return;
    if (profile.first || profile.last) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/api/auth/profile/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { first_name?: string; last_name?: string } | null) => {
        if (!data) return;
        const first = data.first_name || "";
        const last = data.last_name || "";
        if (first || last) {
          setProfile((prev) => {
            if (prev.first || prev.last) return prev; // race guard
            const next = { ...prev, first, last };
            localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
            return next;
          });
        }
      })
      .catch(() => {
        // not logged in, expired token, or API unreachable — fine, fields stay manual
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function applyDeckToEditor(d: Deck) {
    setDeckTitle(d.name || "");
    setPokemonText(d.pokemon || "");
    setTrainersText(d.trainers || "");
    setEnergyText(d.energy || "");
    setNotes(d.notes || "");
    setFormat(d.format || "Standard");
    setCreated(d.created || null);
    setModified(d.modified || null);
    setImported(d.imported || null);
  }

  const legality = useMemo<LegalityResult | null>(() => {
    if (!pokemonText.trim() && !trainersText.trim() && !energyText.trim()) return null;
    return checkLegality(pokemonText, trainersText, energyText);
  }, [pokemonText, trainersText, energyText]);

  const pCount = useMemo(() => cntLines(pokemonText), [pokemonText]);
  const tCount = useMemo(() => cntLines(trainersText), [trainersText]);
  const eCount = useMemo(() => cntLines(energyText), [energyText]);
  const total = pCount + tCount + eCount;
  const pct = Math.min(100, Math.round((total / 60) * 100));
  const totalColor = total === 60 ? COLORS_THEME.green : total > 60 ? COLORS_THEME.red : COLORS_THEME.blue;

  function toast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2300);
  }

  function persistDecks(next: Deck[]) {
    setDecks(next);
    localStorage.setItem(DECKS_KEY, JSON.stringify(next));
  }

  function saveProfile(next: Profile) {
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  // ── Autosave current deck whenever editable fields change ──
  useEffect(() => {
    if (!hydrated || !currentId) return;
    const now = Date.now();
    setDecks((prev) => {
      const idx = prev.findIndex((x) => x.id === currentId);
      if (idx < 0) return prev;
      const updated: Deck = {
        ...prev[idx],
        name: deckTitle,
        pokemon: pokemonText,
        trainers: trainersText,
        energy: energyText,
        notes,
        format,
        total,
        modified: now,
      };
      const lm = getLegalMeta(updated);
      updated.illegal = lm.illegal;
      updated.warn = lm.warn;
      const next = [...prev];
      next[idx] = updated;
      localStorage.setItem(DECKS_KEY, JSON.stringify(next));
      return next;
    });
    setModified(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckTitle, pokemonText, trainersText, energyText, notes, format]);

  function loadDeck(id: string) {
    const d = decks.find((x) => x.id === id);
    if (!d) return;
    setCurrentId(id);
    applyDeckToEditor(d);
  }

  function newDeck() {
    setNamePromptOpen(true);
  }

  function confirmNewDeck(name: string) {
    setNamePromptOpen(false);
    const d = blankDeck(name);
    const next = [d, ...decks];
    persistDecks(next);
    setCurrentId(d.id);
    applyDeckToEditor(d);
    if (typeof window !== "undefined" && window.innerWidth <= 680) setSidebarOpen(false);
  }

  function delDeck(id: string) {
    const next = decks.filter((x) => x.id !== id);
    persistDecks(next);
    if (currentId === id) {
      if (next.length > 0) {
        setCurrentId(next[0].id);
        applyDeckToEditor(next[0]);
      } else {
        setCurrentId(null);
        setDeckTitle("");
        setPokemonText("");
        setTrainersText("");
        setEnergyText("");
        setNotes("");
      }
    }
    toast("Deck deleted");
  }

  function cycleFormat() {
    const idx = (FORMATS.indexOf(format) + 1) % FORMATS.length;
    setFormat(FORMATS[idx]);
  }

  function recheckLegality() {
    setRecheckState("checking");
    if (recheckTimer.current) clearTimeout(recheckTimer.current);
    if (recheckResetTimer.current) clearTimeout(recheckResetTimer.current);
    recheckTimer.current = setTimeout(() => {
      if (format !== "Standard") {
        setRecheckState("idle");
        return;
      }
      const { status } = checkLegality(pokemonText, trainersText, energyText);
      const next = status === "ok" || status === "reprint" ? "ok" : status === "bad" ? "bad" : "warn";
      setRecheckState(next);
      recheckResetTimer.current = setTimeout(() => setRecheckState("idle"), 3000);
    }, 420);
  }

  function copyLive() {
    const p = pokemonText.trim();
    const t = trainersText.trim();
    const e = energyText.trim();
    const out = `Pokemon: ${cntLines(p)}\n${p}\n\nTrainer: ${cntLines(t)}\n${t}\n\nEnergy: ${cntLines(e)}\n${e}\n\nTotal Cards: ${
      cntLines(p) + cntLines(t) + cntLines(e)
    }`;
    navigator.clipboard
      .writeText(out)
      .then(() => toast("Copied for TCG Live!"))
      .catch(() => toast("Copy failed"));
  }

  function openImportModal() {
    setImportText("");
    setImportDeckName("");
    setImportOpen(true);
    navigator.clipboard
      .readText()
      .then((txt) => {
        if (txt && txt.trim()) setImportText(txt.trim());
      })
      .catch(() => {
        /* clipboard read blocked — fine, user pastes manually */
      });
  }

  function doImport() {
    const raw = importText.trim();
    if (!raw) {
      toast("Nothing to import");
      return;
    }
    const parsed = parseImportedText(raw);
    const now = Date.now();
    const d: Deck = {
      id: uid(),
      name: importDeckName.trim() || parsed.name || "Imported Deck",
      format: "Standard",
      pokemon: parsed.pokemon,
      trainers: parsed.trainers,
      energy: parsed.energy,
      notes: "",
      total: cntLines(parsed.pokemon) + cntLines(parsed.trainers) + cntLines(parsed.energy),
      created: now,
      modified: now,
      imported: now,
      illegal: 0,
      warn: 0,
    };
    const lm = getLegalMeta(d);
    d.illegal = lm.illegal;
    d.warn = lm.warn;
    const next = [d, ...decks];
    persistDecks(next);
    setImportOpen(false);
    setCurrentId(d.id);
    applyDeckToEditor(d);
    toast("Deck imported!");
  }

  function buildPrintHTML(): string {
    const p = pokemonText.trim();
    const t = trainersText.trim();
    const e = energyText.trim();
    const name = deckTitle || "My Deck";
    const date = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
    const trainerName = (profile.first || "") + (profile.last ? " " + profile.last : "") || "Trainer";
    const pC = cntLines(p);
    const tC = cntLines(t);
    const eC = cntLines(e);
    const totalC = pC + tC + eC;
    const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/decklist-logo.jpg` : "/decklist-logo.jpg";

    const lr = format === "Standard" ? checkLegality(p, t, e) : null;
    let legalBlock = "";
    if (lr) {
      const colors =
        lr.status === "ok" || lr.status === "reprint"
          ? { bg: "#EAF3DE", color: "#27500A", border: "#C0DD97" }
          : lr.status === "warn"
            ? { bg: "#FAEEDA", color: "#633806", border: "#FAC775" }
            : { bg: "#FCEBEB", color: "#791F1F", border: "#F7C1C1" };
      let text = "✓ Standard legal (2026-27) — all set codes verified.";
      if (lr.status === "reprint") {
        text = `✓ Legal — older Trainer prints legal via reprint: ${lr.reprinted.map((x) => `${x.name} (${x.code})`).join(", ")}`;
      } else if (lr.status === "warn") {
        text = `⚠ Unverified set codes: ${lr.unknown.join(", ")}. Please verify these are from legal H/I/J sets.`;
      } else if (lr.status === "bad") {
        const poke = lr.illegal.filter((x) => x.section === "pokemon").map((x) => x.fullLine).join(", ");
        const trainer = lr.illegal.filter((x) => x.section === "trainer").map((x) => x.name || x.code).join(", ");
        text = `✗ Illegal cards detected. ${poke ? "Pokémon — verify reg mark: " + poke + ". " : ""}${
          trainer ? "Trainer not in reprint list: " + trainer : ""
        }`;
      }
      legalBlock = `<div style="padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:9pt;font-weight:700;background:${colors.bg};color:${colors.color};border:1px solid ${colors.border}">${text}</div>`;
    }

    const colsHTML = (text: string) =>
      text
        .split("\n")
        .map((l) => `<div>${l}</div>`)
        .join("");

    return `<!DOCTYPE html><html><head><title>Decklist — ${name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Nunito:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;font-size:11pt;color:#111;background:#fff;padding:14mm}
.hdr{display:flex;align-items:center;gap:12px;border-bottom:3px solid #ff6b35;padding-bottom:10px;margin-bottom:14px}
.brand{font-family:'Cinzel',serif;font-size:17pt;font-weight:700}
.brand span{color:#ff6b35}
.info{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin-bottom:13px;display:grid;grid-template-columns:1fr 1fr;gap:5px 20px}
.ir{display:flex;gap:8px;font-size:10pt}
.ik{color:#666;min-width:96px}.iv{font-weight:700}
.dh{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.dn{font-family:'Cinzel',serif;font-size:13pt;font-weight:700}
.fb{padding:2px 9px;border-radius:20px;font-size:9pt;font-weight:700;background:#FFE8DC;color:#B3401B;border:1px solid #FFC8AA}
.sm{display:flex;gap:18px;margin:9px 0;padding:9px 14px;background:#f9f9f9;border-radius:6px;font-size:10pt}
.si{display:flex;gap:5px}.sk{color:#666}.sv{font-weight:700}
.st{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#999;margin:11px 0 4px;border-top:1px solid #eee;padding-top:7px}
.cl{columns:2;column-gap:18px;font-size:10pt;line-height:1.9}
.cl div{break-inside:avoid;padding:1px 0}
.sig{margin-top:26px;display:flex;justify-content:space-between}
.sb{border-top:1px solid #111;padding-top:4px;min-width:155px;text-align:center;font-size:9pt;color:#555}
.ft{margin-top:18px;padding-top:9px;border-top:1px solid #eee;font-size:9pt;color:#999;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><img src="${logoUrl}" alt="PokéBulk SA" style="height:52px;width:52px;object-fit:cover;border-radius:8px;flex-shrink:0;"><div><div class="brand">Poké<span>Bulk</span> SA</div><div style="font-size:9pt;color:#666">Tournament Decklist — Official Record</div></div></div>
<div class="info">
  <div class="ir"><span class="ik">Player Name:</span><span class="iv">${trainerName}</span></div>
  <div class="ir"><span class="ik">Trainer Number:</span><span class="iv">${profile.num || "N/A"}</span></div>
  <div class="ir"><span class="ik">Year of Birth:</span><span class="iv">${profile.dob || "N/A"}</span></div>
  <div class="ir"><span class="ik">Date:</span><span class="iv">${date}</span></div>
</div>
${legalBlock}
<div class="dh"><div class="dn">${name}</div><div class="fb">${format}</div></div>
<div class="sm">
  <div class="si"><span class="sk">Total:</span><span class="sv">${totalC}/60</span></div>
  <div class="si"><span class="sk">Pokémon:</span><span class="sv">${pC}</span></div>
  <div class="si"><span class="sk">Trainers:</span><span class="sv">${tC}</span></div>
  <div class="si"><span class="sk">Energy:</span><span class="sv">${eC}</span></div>
</div>
<div class="st">Pokémon — ${pC}</div>
<div class="cl">${colsHTML(p)}</div>
<div class="st">Trainers — ${tC}</div>
<div class="cl">${colsHTML(t)}</div>
<div class="st">Energy — ${eC}</div>
<div class="cl">${colsHTML(e)}</div>
${notes ? `<div class="st">Notes</div><p style="font-size:10pt;line-height:1.7;color:#444">${notes}</p>` : ""}
<div class="sig">
  <div class="sb">Player Signature</div>
  <div class="sb">Judge Signature</div>
  <div class="sb">Head Judge</div>
</div>
<div class="ft"><span>PokéBulk SA — pokebulk.co.za</span><span>Printed: ${date}</span></div>
</body></html>`;
  }

  function doPrint() {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      toast("Allow popups to print");
      return;
    }
    win.document.write(buildPrintHTML());
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 600);
    setSubmitOpen(false);
  }

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS_THEME.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: COLORS_THEME.muted, fontSize: 14 }}>Loading deck builder…</div>
      </div>
    );
  }

  const recheckLabel =
    recheckState === "checking"
      ? "⟳ Checking..."
      : recheckState === "ok"
        ? "✓ Legal"
        : recheckState === "bad"
          ? "✗ Illegal"
          : recheckState === "warn"
            ? "⚠ Verify"
            : "⟳ Check Legality";
  const recheckColor =
    recheckState === "ok" ? COLORS_THEME.green : recheckState === "bad" ? COLORS_THEME.red : recheckState === "warn" ? COLORS_THEME.orange : COLORS_THEME.muted;

  return (
    <div style={{ minHeight: "100vh", background: COLORS_THEME.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-block",
              background: "#ff6b3520",
              color: COLORS_THEME.accent,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "4px 10px",
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            Beta
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: "0 0 8px 0" }}>Deck Builder</h1>
          <p style={{ color: COLORS_THEME.muted, fontSize: 14, margin: 0 }}>
            Still in testing — please flag anything that looks off. Decks are saved locally in this browser.
          </p>
        </div>

        {/* App shell */}
        <div
          style={{
            background: COLORS_THEME.panel,
            border: `1px solid ${COLORS_THEME.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "10px 14px",
              borderBottom: `1px solid ${COLORS_THEME.border}`,
            }}
          >
            <button onClick={openImportModal} style={btnGhost}>
              ⬇ Import from Clipboard
            </button>
            <button onClick={() => setSubmitOpen(true)} style={btnPrimary}>
              🖨 Print Decklist
            </button>
          </div>

          <div className="dl-layout">
            {/* Sidebar */}
            <aside
              className="dl-sidebar"
              style={{
                background: COLORS_THEME.panel2,
                borderRight: `1px solid ${COLORS_THEME.border}`,
                display: sidebarOpen ? "flex" : "none",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "12px 14px 10px",
                  borderBottom: `1px solid ${COLORS_THEME.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS_THEME.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Decklists <span style={{ color: COLORS_THEME.hint, fontWeight: 600 }}>· {decks.length}</span>
                </span>
                <button
                  className="dl-mobile-toggle"
                  onClick={() => setSidebarOpen((s) => !s)}
                  style={{ background: "transparent", border: "none", color: COLORS_THEME.muted, fontSize: 18, cursor: "pointer" }}
                >
                  ☰
                </button>
              </div>

              {/* Trainer profile */}
              <div
                style={{
                  margin: 12,
                  background: COLORS_THEME.panel,
                  border: `1px solid ${COLORS_THEME.border}`,
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS_THEME.hint }}>
                  Trainer Profile
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <ProfileField
                    label="First Name"
                    value={profile.first}
                    placeholder="Ash"
                    onChange={(v) => saveProfile({ ...profile, first: v })}
                  />
                  <ProfileField
                    label="Surname"
                    value={profile.last}
                    placeholder="Ketchum"
                    onChange={(v) => saveProfile({ ...profile, last: v })}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <ProfileField
                    label="Trainer №"
                    value={profile.num}
                    placeholder="TRN-00001"
                    onChange={(v) => saveProfile({ ...profile, num: v })}
                  />
                  <ProfileField
                    label="Year of Birth"
                    value={profile.dob}
                    placeholder="1990"
                    maxLength={4}
                    onChange={(v) => saveProfile({ ...profile, dob: v })}
                  />
                </div>
              </div>

              <div className="dl-decklist" style={{ flex: 1, overflowY: "auto", padding: 7 }}>
                {decks.map((d, i) => (
                  <DeckRow
                    key={d.id}
                    deck={d}
                    color={DOT_COLORS[i % DOT_COLORS.length]}
                    active={d.id === currentId}
                    onClick={() => {
                      loadDeck(d.id);
                      if (typeof window !== "undefined" && window.innerWidth <= 680) setSidebarOpen(false);
                    }}
                    onDelete={() => delDeck(d.id)}
                  />
                ))}
              </div>

              <div
                style={{
                  padding: 9,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  borderTop: `1px solid ${COLORS_THEME.border}`,
                }}
              >
                <button onClick={openImportModal} style={{ ...btnGhost, width: "100%", border: `1px solid #378add`, color: "#7ec1f5", background: "rgba(55,138,221,0.1)" }}>
                  ⬇ Import from Clipboard
                </button>
                <button
                  onClick={newDeck}
                  style={{ ...btnGhost, width: "100%", border: `1px dashed ${COLORS_THEME.border2}` }}
                >
                  + New Decklist
                </button>
              </div>
            </aside>

            {/* Main editor */}
            <main style={{ display: "flex", flexDirection: "column", background: COLORS_THEME.panel }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "10px 13px",
                  borderBottom: `1px solid ${COLORS_THEME.border}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS_THEME.hint }}>
                    Deck Name
                  </label>
                  <input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="e.g. Charizard ex — Regionals"
                    style={{
                      width: "100%",
                      border: `1px solid ${COLORS_THEME.border2}`,
                      background: COLORS_THEME.panel2,
                      borderRadius: 7,
                      fontSize: 16,
                      fontWeight: 700,
                      color: COLORS_THEME.text,
                      padding: "8px 11px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span
                    onClick={cycleFormat}
                    title="Click to change format"
                    style={{
                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      background: "#ff6b3520",
                      color: COLORS_THEME.accent,
                      border: "1px solid #ff6b3550",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {format}
                  </span>
                  <button
                    onClick={recheckLegality}
                    style={{
                      height: 30,
                      padding: "0 11px",
                      borderRadius: 7,
                      border: `1px solid ${recheckColor}`,
                      background: "transparent",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      color: recheckColor,
                    }}
                  >
                    {recheckLabel}
                  </button>
                  <button onClick={copyLive} style={btnGhost}>
                    Copy TCG Live
                  </button>
                </div>
              </div>

              <LegalityBanner result={legality} format={format} />

              <div className="dl-editor-grid">
                <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 5, borderRight: `1px solid ${COLORS_THEME.border}`, overflowY: "auto" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS_THEME.hint, padding: "3px 0 2px" }}>
                  Add Cards
                </div>
                <input
                  value={cardQuery}
                  onChange={(e) => setCardQuery(e.target.value)}
                  placeholder="Search any card by name…"
                  style={{
                    width: "100%",
                    border: `1px solid ${COLORS_THEME.border2}`,
                    borderRadius: 7,
                    background: COLORS_THEME.panel2,
                    fontSize: 13,
                    color: COLORS_THEME.text,
                    padding: "9px 11px",
                    outline: "none",
                  }}
                />
                {cardQuery.trim().length >= 2 && (
                  <div
                    style={{
                      border: `1px solid ${COLORS_THEME.border}`,
                      borderRadius: 7,
                      background: COLORS_THEME.bg,
                      maxHeight: 280,
                      overflowY: "auto",
                      marginBottom: 4,
                    }}
                  >
                    {searching && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS_THEME.hint }}>Searching…</div>
                    )}
                    {!searching && searchError && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS_THEME.red }}>Search unavailable — try again</div>
                    )}
                    {!searching && !searchError && cardResults.length === 0 && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS_THEME.hint }}>No cards found</div>
                    )}
                    {!searching &&
                      !searchError &&
                      cardResults.map((card) => {
                        const section = classifySection(card);
                        const num = card.card_number != null ? String(card.card_number).padStart(3, "0") : "—";
                        return (
                          <div
                            key={card.id}
                            className="dl-search-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              padding: "7px 10px",
                              borderBottom: `1px solid ${COLORS_THEME.border}`,
                            }}
                          >
                            {card.image_small_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={card.image_small_url}
                                alt=""
                                style={{ width: 30, height: 42, objectFit: "cover", borderRadius: 3, flexShrink: 0, background: COLORS_THEME.panel2 }}
                              />
                            ) : (
                              <div style={{ width: 30, height: 42, borderRadius: 3, background: COLORS_THEME.panel2, flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS_THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {cleanCardName(card.name)}
                              </div>
                              <div style={{ fontSize: 10, color: COLORS_THEME.hint, display: "flex", gap: 6, alignItems: "center", marginTop: 1 }}>
                                <span>
                                  {card.card_set?.code || "?"} {num}
                                </span>
                                {card.price && <span>R{parseFloat(card.price).toFixed(2)}</span>}
                                <span style={{ color: sectionColor(section), fontWeight: 700 }}>{sectionLabel(section)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddCard(card)}
                              style={{
                                flexShrink: 0,
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                border: `1px solid ${COLORS_THEME.accent}`,
                                background: "transparent",
                                color: COLORS_THEME.accent,
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: "pointer",
                                lineHeight: 1,
                              }}
                              title="Add to deck"
                            >
                              +
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                <TextSection label="Pokémon" value={pokemonText} onChange={setPokemonText} minHeight={148} placeholder={"4 Charizard ex TWM 125\n2 Iron Crown ex SCR 082\n2 Terapagos ex SCR 128"} />
                  <TextSection label="Trainers" value={trainersText} onChange={setTrainersText} minHeight={108} placeholder={"4 Professor's Research SSP 189\n4 Arven SSP 186\n3 Boss's Orders RCL 154\n4 Ultra Ball SVI 196"} />
                  <TextSection label="Energy" value={energyText} onChange={setEnergyText} minHeight={68} placeholder={"10 Fire Energy SVE 002\n4 Basic Fire Energy JTG 152"} />
                  <TextSection label="Notes" value={notes} onChange={setNotes} minHeight={56} placeholder="Tournament notes, matchup tips, sideboard plans..." />
                </div>

                <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 9, overflowY: "auto" }}>
                  <div style={{ background: COLORS_THEME.panel2, borderRadius: 7, padding: "9px 11px", border: `1px solid ${COLORS_THEME.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS_THEME.hint, marginBottom: 3 }}>
                      Total Cards
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: totalColor, lineHeight: 1 }}>{total}</div>
                    <div style={{ fontSize: 11, color: COLORS_THEME.hint, marginTop: 2 }}>
                      {total === 60 ? "✓ Complete!" : total < 60 ? `${60 - total} more needed` : `${total - 60} over limit`}
                    </div>
                    <div style={{ marginTop: 4, height: 5, background: COLORS_THEME.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: totalColor, borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <BreakdownRow color={COLORS_THEME.accent} label="Pokémon" value={pCount} />
                    <BreakdownRow color={COLORS_THEME.blue} label="Trainers" value={tCount} />
                    <BreakdownRow color={COLORS_THEME.orange} label="Energy" value={eCount} />
                  </div>

                  <div style={{ background: COLORS_THEME.panel2, borderRadius: 7, padding: "9px 11px", border: `1px solid ${COLORS_THEME.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS_THEME.hint, marginBottom: 3 }}>
                      Legality
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5, color: legality ? "inherit" : COLORS_THEME.hint }}>
                      {format !== "Standard"
                        ? format === "Expanded" ? "Expanded format" : "TCG Live format"
                        : !legality
                          ? "—"
                          : legality.status === "ok"
                            ? "✓ Standard legal"
                            : legality.status === "reprint"
                              ? `↩ ${legality.reprinted.length} older reprint${legality.reprinted.length !== 1 ? "s" : ""}`
                              : legality.status === "bad"
                                ? `✗ ${legality.illegal.length} illegal`
                                : `⚠ Verify: ${legality.unknown.join(", ")}`}
                    </div>
                  </div>

                  <div style={{ background: COLORS_THEME.panel2, borderRadius: 7, padding: "9px 11px", border: `1px solid ${COLORS_THEME.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS_THEME.hint, marginBottom: 3 }}>
                      Dates
                    </div>
                    <DateRow label="Created" value={fmtDt(created)} />
                    <DateRow label="Modified" value={fmtDt(modified)} />
                    <DateRow label="Imported" value={imported ? fmtDt(imported) : "—"} />
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Import modal */}
      {importOpen && (
        <Modal onClose={() => setImportOpen(false)} title="Import Decklist">
          <p style={{ fontSize: 12, color: COLORS_THEME.muted, lineHeight: 1.6 }}>
            Paste a decklist below. Legality is checked automatically:
            <br />• <strong>Pokémon</strong> — strict set code check (no reprints)
            <br />• <strong>Trainers</strong> — reprint whitelist applied
            <br />• <strong>Energy</strong> — always legal regardless of set code
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: COLORS_THEME.hint, textTransform: "uppercase" }}>Deck Name</label>
            <input
              value={importDeckName}
              onChange={(e) => setImportDeckName(e.target.value)}
              placeholder="e.g. Alakazam ex — Regionals"
              style={{
                width: "100%",
                fontSize: 14,
                fontWeight: 700,
                padding: "8px 10px",
                borderRadius: 7,
                border: `1px solid ${COLORS_THEME.border2}`,
                background: COLORS_THEME.bg,
                color: COLORS_THEME.text,
                outline: "none",
              }}
            />
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Paste your decklist here...\n\nPokemon: 12\n4 Charizard ex TWM 125\n...\n\nTrainer: 36\n4 Boss's Orders RCL 154\n...\n\nEnergy: 12\n10 Fire Energy SVE 002"}
            style={{
              width: "100%",
              minHeight: 155,
              fontSize: 12,
              padding: "9px 11px",
              borderRadius: 7,
              border: `1px solid ${COLORS_THEME.border2}`,
              background: COLORS_THEME.bg,
              color: COLORS_THEME.text,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 3 }}>
            <button onClick={() => setImportOpen(false)} style={btnGhost}>
              Cancel
            </button>
            <button onClick={doImport} style={btnPrimary}>
              Import &amp; Check Legality
            </button>
          </div>
        </Modal>
      )}

      {/* Print modal */}
      {submitOpen && (
        <Modal onClose={() => setSubmitOpen(false)} title="Print Decklist">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: COLORS_THEME.muted }}>
            <strong style={{ color: COLORS_THEME.text }}>{(profile.first || "") + (profile.last ? " " + profile.last : "") || "Trainer"}</strong>
            {" · "}Trainer #: <strong style={{ color: COLORS_THEME.text }}>{profile.num || "—"}</strong>
            {" · "}Born: <strong style={{ color: COLORS_THEME.text }}>{profile.dob || "—"}</strong>
            <br />
            Deck: <strong style={{ color: COLORS_THEME.text }}>{deckTitle || "My Deck"}</strong>
            {" · "}Format: <strong style={{ color: COLORS_THEME.text }}>{format}</strong>
            {" · "}Cards: <strong style={{ color: COLORS_THEME.text }}>{total}/60</strong>
          </p>
          <div
            style={{
              background: COLORS_THEME.panel2,
              borderRadius: 7,
              border: `1px solid ${COLORS_THEME.border}`,
              padding: 10,
              fontSize: 11,
              color: COLORS_THEME.muted,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              maxHeight: 185,
              overflowY: "auto",
              fontFamily: "monospace",
            }}
          >
            {`Pokemon: ${pCount}\n${pokemonText}\n\nTrainer: ${tCount}\n${trainersText}\n\nEnergy: ${eCount}\n${energyText}`}
          </div>
          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 3 }}>
            <button onClick={() => setSubmitOpen(false)} style={btnGhost}>
              Cancel
            </button>
            <button onClick={doPrint} style={btnPrimary}>
              🖨 Print
            </button>
          </div>
        </Modal>
      )}

      <NamePromptModal open={namePromptOpen} defaultName="" onCancel={() => setNamePromptOpen(false)} onConfirm={confirmNewDeck} />

      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#000",
            color: "#fff",
            padding: "9px 18px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            zIndex: 999,
            whiteSpace: "nowrap",
          }}
        >
          {toastMsg}
        </div>
      )}

      <style>{`
        .dl-layout { display: grid; grid-template-columns: 250px 1fr; min-height: 560px; }
        .dl-editor-grid { display: grid; grid-template-columns: 1fr 200px; flex: 1; }
        .dl-mobile-toggle { display: none; }
        @media (max-width: 760px) {
          .dl-layout { grid-template-columns: 1fr; }
          .dl-editor-grid { grid-template-columns: 1fr; }
          .dl-mobile-toggle { display: block; }
          .dl-decklist { max-height: 200px; }
        }
        textarea::placeholder, input::placeholder { color: ${COLORS_THEME.hint}; }
        .dl-search-row:hover { background: ${COLORS_THEME.panel2}; }
        .dl-search-row:last-child { border-bottom: none; }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════
// SMALL SUB-COMPONENTS
// ════════════════════════════════════════════════
function ProfileField({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: COLORS_THEME.hint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1px solid ${COLORS_THEME.border}`,
          borderRadius: 5,
          background: COLORS_THEME.bg,
          fontSize: 13,
          color: COLORS_THEME.text,
          padding: "6px 9px",
          outline: "none",
          width: "100%",
        }}
      />
    </div>
  );
}

function TextSection({
  label,
  value,
  onChange,
  minHeight,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minHeight: number;
  placeholder: string;
}) {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS_THEME.hint, padding: "3px 0 2px" }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          minHeight,
          border: `1px solid ${COLORS_THEME.border}`,
          borderRadius: 7,
          background: COLORS_THEME.panel2,
          fontSize: 13,
          color: COLORS_THEME.text,
          padding: "9px 11px",
          resize: "none",
          outline: "none",
          lineHeight: 1.7,
          fontFamily: "inherit",
        }}
      />
    </>
  );
}

function BreakdownRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ color: COLORS_THEME.muted, flex: 1 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 12, color: COLORS_THEME.text }}>{value}</div>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 5, fontSize: 11 }}>
      <span style={{ color: COLORS_THEME.hint }}>{label}</span>
      <span style={{ color: COLORS_THEME.muted, fontWeight: 700, fontSize: 10 }}>{value}</span>
    </div>
  );
}

function DeckRow({
  deck,
  color,
  active,
  onClick,
  onDelete,
}: {
  deck: Deck;
  color: string;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const hasIllegal = deck.illegal > 0;
  const hasWarn = deck.warn > 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 7,
        padding: "8px 9px",
        borderRadius: 7,
        cursor: "pointer",
        border: `1px solid ${active ? COLORS_THEME.border2 : "transparent"}`,
        background: active ? COLORS_THEME.panel : "transparent",
        marginBottom: 3,
      }}
    >
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS_THEME.text }}>
          {deck.name || "Unnamed Deck"}
        </div>
        <div style={{ fontSize: 10, color: COLORS_THEME.hint, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
          {hasIllegal && <span style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS_THEME.red }} />}
          {!hasIllegal && hasWarn && <span style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS_THEME.orange }} />}
          <span>{deck.format || "Standard"}</span>
          {deck.modified && <span>· {fmtDs(deck.modified)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: COLORS_THEME.hint }}>{deck.total || 0}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            fontSize: 10,
            padding: "1px 5px",
            borderRadius: 4,
            border: `1px solid ${COLORS_THEME.border}`,
            background: "transparent",
            color: COLORS_THEME.hint,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: COLORS_THEME.panel,
          border: `1px solid ${COLORS_THEME.border2}`,
          borderRadius: 12,
          padding: 18,
          width: "100%",
          maxWidth: 430,
          display: "flex",
          flexDirection: "column",
          gap: 11,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS_THEME.accent, margin: 0 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
