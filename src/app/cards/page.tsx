import Link from "next/link";
import { getCards } from "@/lib/api";
import InfoModal from "@/components/InfoModal";
import CardTile from "@/components/CardTile";

async function getSets() {
    try {
        const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
        const r = await fetch(`${API_URL}/api/sets/`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000)
        });
        const data = await r.json();
        return data.results || [];
    } catch {
        return [];
    }
}

const ERA_ORDER = [
    { code: "WotC", label: "WotC Base" },
    { code: "WotCN", label: "Neo" },
    { code: "WotCL", label: "Legendary" },
    { code: "WotCO", label: "e-Card" },
    { code: "EX", label: "EX Era" },
    { code: "DP", label: "D&P / Platinum" },
    { code: "HGSS", label: "HG&SS" },
    { code: "BW", label: "Black & White" },
    { code: "XY", label: "XY Era" },
    { code: "SM", label: "Sun & Moon" },
    { code: "SWSH", label: "Sword & Shield" },
    { code: "SV", label: "Scarlet & Violet" },
    { code: "MEG", label: "Mega Evolution" },
];

const ALWAYS_SPECIAL_CODES = new Set([
    // Black Star Promos
    "PR-WB", "PR-NP", "PR-DPP", "PR-HS", "PR-BLW", "PR-XY", "PR-SM", "PR-SWSH", "PR-SV", "SVP", "MEP", "PR-BEST",
    // POP Series
    "POP1", "POP2", "POP3", "POP4", "POP5", "POP6", "POP7", "POP8", "POP9",
    // McDonalds
    "MCD11", "MCD12", "MCD13", "MCD14", "MCD15", "MCD16", "MCD17", "MCD18", "MCD19", "MCD21", "MCD22", "MCD23", "MCD24",
    // Trainer Gallery
    "BRSTG", "ASRTG", "LORTG", "SITTG", "CRZGG",
    // Trick or Trade
    "TT22", "TT23", "TT24",
    // Prize Pack
    "PRIZEPACK", "PPS1", "PPS2", "PPS3", "PPS4", "PPS5", "PPS6", "PPS7", "PPS8",
    // WCD & Exclusives / shells / duplicates with 0 records
    "TCGCL", "LTRRC", "GENRC", "SI1", "SI",
    "RUM", "RM", "BP", "CCC", "CELCC", "HIFSV", "SHFSV", "SMA", "FUT20",
    "BTA", "BA22", "BA24", "FPP", "RU1",
    "KWBP", "SAMPLE", "JUMBO", "WCD", "LEAGUE", "PWCP", "BSTEX", "MCAP", "ALTART", "BLE", "CCP", "PPP",
    "TK1A", "TK1B", "TK2A", "TK2B",
    "TK-DP", "TK-HS", "TK-BLW", "TK-SN", "TK-BW2", "TK-LL", "TK-PS", "SMK1", "SMK2",
    // SM empty shells (real records are in SM01-SM12/SHL etc)
    "SUM", "GRI", "BUS", "SLG", "CIN", "UPR", "FLI", "LOT", "TEU", "DET", "UNB", "UNM", "HIF", "CEC",
    // SV empty shells (real records are in SVI/PAL/OBF/PAR/PAF)
    "SV1", "SV2", "SV3", "SV3PT5", "SV4", "SV4PT5",
    // SWSH duplicates/shells
    "ST",
    // WotC duplicates
    "EXP", "PR-NB",
    // DB duplicates
    "LTRRC",
    // MEG era energy shown via MEG tab
    "MEE",
    // SVE shown via SV era tab
    "SVE",
]);

const SPECIAL_GROUP_DEFS = [
    { label: "Promos", color: "#F59E0B", codePatterns: ["PR-", "SVP", "MEP"] },
    { label: "POP Series", color: "#10B981", codePatterns: ["POP1", "POP2", "POP3", "POP4", "POP5", "POP6", "POP7", "POP8", "POP9"] },
    { label: "McDonalds", color: "#EF4444", codePatterns: ["MCD"] },
    { label: "Trainer Gallery", color: "#8B5CF6", codePatterns: ["BRSTG", "ASRTG", "LORTG", "SITTG", "CRZGG"] },
    { label: "Trick or Trade", color: "#EC4899", codePatterns: ["TT22", "TT23", "TT24"] },
    { label: "Prize Pack", color: "#F97316", codePatterns: ["PPS1", "PPS2", "PPS3", "PPS4", "PPS5", "PPS6", "PPS7", "PPS8", "PRIZEPACK"] },
    { label: "Radiant Collections", color: "#06B6D4", codePatterns: ["GENRC", "LTRRC"] },
    { label: "Shiny Vault", color: "#6366F1", codePatterns: ["HIFSV", "SHFSV"] },
    { label: "Celebrations: Classic Collection", color: "#FACC15", codePatterns: ["CCC"] },
    { label: "Rumble", color: "#84CC16", codePatterns: ["RUM"] },
    {
        label: "WCD & Exclusives", color: "#6B7280", codePatterns: [
            "WCD", "BLE", "MCAP", "LEAGUE", "JUMBO", "ALTART", "PPP", "CCP", "PWCP", "KWBP", "SAMPLE", "BSTEX", "PR-BEST",
            "TCGCL", "SI1", "SI", "RM", "SMA", "FUT20",
            "BTA", "BA22", "BA24", "FPP",
            "TK1A", "TK1B", "TK2A", "TK2B",
            "TK-DP", "TK-HS", "TK-BLW", "TK-SN", "TK-BW2", "TK-LL", "TK-PS", "SMK1", "SMK2",
        ]
    },
];

const LEGALITY_OPTIONS = [
    { value: "all", label: "All formats" },
    { value: "standard", label: "Standard 2026 (H/I/J)" },
    { value: "expanded", label: "Expanded (D/E/F+)" },
    { value: "rotated_g", label: "Rotated — SV era (G)" },
    { value: "rotated_f", label: "Rotated — SwSh era (F)" },
];

const SUPERTYPES = [
    { label: "Pokemon", value: "Pokémon" },
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
    { value: "pokedex_number", label: "Pokedex # (low to high)" },
    { value: "-pokedex_number", label: "Pokedex # (high to low)" },
    { value: "price", label: "Price (low to high)" },
    { value: "-price", label: "Price (high to low)" },
    { value: "name", label: "Name A to Z" },
];

// Variant badge/border/overlay logic now lives in @/components/CardTile so
// the Pokedex card-list page can reuse it too -- see CardTile.tsx.

function buildHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
    const merged = { ...current, prize_pack_series: undefined, ...overrides, page: "1" };
    if ("page" in overrides) merged.page = overrides.page || "1";
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) { if (v) p.set(k, v); }
    return `/cards?${p.toString()}`;
}

function Paginator({ current, total, params }: { current: number; total: number; params: Record<string, string | undefined> }) {
    if (total <= 1) return null;
    const safeCurrent = Math.min(current, total);
    const displayTotal = total;
    const isCapped = false;
    const pages: (number | "...")[] = [];
    if (displayTotal <= 7) { for (let i = 1; i <= displayTotal; i++) pages.push(i); }
    else {
        pages.push(1);
        if (safeCurrent - 2 > 2) pages.push("...");
        for (let i = Math.max(2, safeCurrent - 2); i <= Math.min(displayTotal - 1, safeCurrent + 2); i++) pages.push(i);
        if (safeCurrent + 2 < displayTotal - 1) pages.push("...");
        pages.push(displayTotal);
    }
    const btn: React.CSSProperties = { padding: "7px 12px", borderRadius: "6px", fontSize: "13px", textDecoration: "none", fontWeight: 500, display: "inline-block", border: "1px solid #2a2a3a", minWidth: "36px", textAlign: "center" };
    return (
        <div style={{ display: "flex", justifyContent: "center", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
            {safeCurrent > 1 && <Link href={buildHref(params, { page: String(safeCurrent - 1) })} style={{ ...btn, background: "#1a1a24", color: "#fff" }}>prev</Link>}
            {pages.map((p, i) => p === "..." ? <span key={`e${i}`} style={{ ...btn, background: "transparent", border: "none", color: "#555" }}>...</span> : <Link key={p} href={buildHref(params, { page: String(p) })} style={{ ...btn, background: p === safeCurrent ? "#ff6b35" : "#1a1a24", color: "#fff", borderColor: p === safeCurrent ? "#ff6b35" : "#2a2a3a" }}>{p}</Link>)}
            {safeCurrent < displayTotal && <Link href={buildHref(params, { page: String(safeCurrent + 1) })} style={{ ...btn, background: "#1a1a24", color: "#fff" }}>next</Link>}
            <span style={{ color: "#555", fontSize: "12px", marginLeft: "8px" }}>
                Page {safeCurrent} of {total}
            </span>
        </div>
    );
}

function SetChip({ set, active, href, color }: { set: any; active: boolean; href: string; color?: string }) {
    const activeColor = color || "#ff6b35";
    return (
        <Link href={href} style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: active ? activeColor + "22" : "#1a1a24",
            border: `1px solid ${active ? activeColor : "#2a2a3a"}`,
            color: active ? activeColor : "#a0a0b0",
            padding: "4px 10px", borderRadius: "6px", textDecoration: "none",
            fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap",
        }}>
            {set.symbol_url && (
                <img src={set.symbol_url} alt="" style={{ width: 14, height: 14, objectFit: "contain", opacity: active ? 1 : 0.6 }} />
            )}
            {set.name}
        </Link>
    );
}

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const [params, allSets] = await Promise.all([searchParams, getSets()]);

    const page = parseInt(params.page || "1");
    const showInStock = params.show_out_of_stock !== "true";
    const effectiveLegality = params.legality || "all";
    const currentSupertype = params.supertype || "";
    const activeEraCode = params.era || "";
    const activeSetCode = params.card_set || "";

    const setsByEra: Record<string, any[]> = {};
    const seenCodes = new Set<string>();
    for (const set of allSets) {
        if (seenCodes.has(set.code)) continue;
        seenCodes.add(set.code);
        if (ALWAYS_SPECIAL_CODES.has(set.code)) continue;
        const ec = set.era_code || "OTHER";
        if (!setsByEra[ec]) setsByEra[ec] = [];
        setsByEra[ec].push(set);
    }
    for (const ec of Object.keys(setsByEra)) {
        setsByEra[ec].sort((a: any, b: any) =>
            (b.release_date || "0000").localeCompare(a.release_date || "0000")
        );
    }

    const specialGroups = SPECIAL_GROUP_DEFS.map(def => {
        const seen = new Set<string>();
        const sets = allSets.filter((s: any) => {
            if (seen.has(s.code)) return false;
            const match = def.codePatterns.some((p: string) => s.code === p || s.code.startsWith(p));
            if (match) seen.add(s.code);
            return match;
        });
        if (def.label === "Prize Pack") {
            sets.sort((a: any, b: any) => {
                const na = parseInt(a.code.replace(/\D/g, "") || "0");
                const nb = parseInt(b.code.replace(/\D/g, "") || "0");
                return na - nb;
            });
        } else {
            sets.sort((a: any, b: any) =>
                (a.release_date || "9999").localeCompare(b.release_date || "9999")
            );
        }
        return { ...def, sets };
    }).filter(g => g.sets.length > 0);

    const mainSetsByEra = ERA_ORDER.map(era => ({
        ...era,
        sets: setsByEra[era.code] || [],
    }));

    const activeEra = mainSetsByEra.find(e => e.code === activeEraCode);
    const activeSpecialGroup = specialGroups.find(g =>
        g.sets.some((s: any) => s.code === activeSetCode) && !activeEraCode
    );
    const activeSet = allSets.find((s: any) => s.code === activeSetCode);

    const subtypeOptions = currentSupertype === "Trainer" ? TRAINER_SUBTYPES
        : currentSupertype === "Energy" ? ENERGY_SUBTYPES
            : currentSupertype === "Pokémon" ? POKEMON_SUBTYPES
                : [];
    const showEnergyTypes = !currentSupertype || currentSupertype === "Pokémon";

    let data: any = { count: 0, results: [] };
    try {
        data = await getCards({
            ...(params.search && { search: params.search }),
            ...(params.rarity && { rarity: params.rarity }),
            ...(params.ordering && { ordering: params.ordering }),
            ...(params.era && { era: params.era }),
            ...(params.card_set && { card_set: params.card_set }),
            ...(params.prize_pack_series && { prize_pack_series: params.prize_pack_series }),
            ...(params.energy_type && { energy_type: params.energy_type }),
            ...(params.supertype && { supertype: params.supertype }),
            ...(params.subtype && { subtype: params.subtype }),
            ...(params.page && { page: params.page }),
            ...(showInStock && { in_stock: "true" }),
            ...(effectiveLegality !== "all" && { legality: effectiveLegality }),
            ...(params.pokedex && { pokedex: params.pokedex }),
            min_price: "0.01",
        });
    } catch {
        data = { count: 0, results: [] };
    }

    const totalPages = Math.ceil((data.count || 0) / 32);

    const eraTabStyle = (active: boolean): React.CSSProperties => ({
        display: "block", background: active ? "#ff6b35" : "#1a1a24",
        border: `1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
        color: "#fff", padding: "6px 14px", borderRadius: "6px",
        textDecoration: "none", fontSize: "13px", fontWeight: 500,
    });

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 1.5rem" }}>
            <InfoModal />

            {/* ERA TABS */}
            <div style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    <Link href={buildHref(params, { era: undefined, card_set: undefined, page: "1" })} style={eraTabStyle(!activeEraCode && !activeSpecialGroup)}>All</Link>
                    {mainSetsByEra.map((era) => (
                        <Link key={era.code} href={buildHref(params, { era: era.code, card_set: undefined, page: "1" })} style={eraTabStyle(activeEraCode === era.code && !activeSpecialGroup)}>
                            {era.label}
                        </Link>
                    ))}
                </div>

                {activeEra && activeEra.sets.length > 0 && !activeSpecialGroup && (
                    <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderTop: "2px solid #ff6b35", borderRadius: "0 6px 6px 6px", padding: "10px 12px", display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <Link href={buildHref(params, { card_set: undefined, page: "1" })} style={{
                            display: "flex", alignItems: "center",
                            background: !activeSetCode ? "#ff6b3522" : "#12121a",
                            border: `1px solid ${!activeSetCode ? "#ff6b35" : "#2a2a3a"}`,
                            color: !activeSetCode ? "#ff6b35" : "#a0a0b0",
                            padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                        }}>All sets</Link>
                        {activeEra.sets.map((s: any) => (
                            <SetChip key={s.code} set={s} active={activeSetCode === s.code} href={buildHref(params, { card_set: s.code, page: "1" })} />
                        ))}
                    </div>
                )}
            </div>

            {/* SPECIAL SETS ROW */}
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px", paddingTop: "6px", borderTop: "1px solid #2a2a3a" }}>
                <span style={{ fontSize: "10px", color: "#555", fontWeight: 700, letterSpacing: "0.08em", marginRight: "2px" }}>SPECIAL</span>
                {specialGroups.map((group) => {
                    const isActive = group.sets.some((s: any) => s.code === activeSetCode) && !activeEraCode;
                    return (
                        <Link key={group.label}
                            href={isActive
                                ? buildHref(params, { card_set: undefined, page: "1" })
                                : buildHref(params, { card_set: group.sets[0].code, era: undefined, page: "1" })}
                            style={{
                                background: isActive ? group.color + "22" : "#1a1a24",
                                border: `1px solid ${isActive ? group.color : "#2a2a3a"}`,
                                color: isActive ? group.color : "#a0a0b0",
                                padding: "5px 12px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                            }}>
                            {group.label}
                        </Link>
                    );
                })}
            </div>

            {activeSpecialGroup && activeSpecialGroup.label === "Prize Pack" && (
                <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderTop: `2px solid ${activeSpecialGroup.color}`, borderRadius: "6px", padding: "10px 12px", display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <Link href={buildHref(params, { card_set: "PRIZEPACK", prize_pack_series: undefined, era: undefined, page: "1" })} style={{
                        background: !params.prize_pack_series ? activeSpecialGroup.color + "22" : "#12121a",
                        border: `1px solid ${!params.prize_pack_series ? activeSpecialGroup.color : "#2a2a3a"}`,
                        color: !params.prize_pack_series ? activeSpecialGroup.color : "#a0a0b0",
                        padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                    }}>All Series</Link>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                        <Link key={n}
                            href={buildHref(params, { card_set: "PRIZEPACK", prize_pack_series: String(n), era: undefined, page: "1" })}
                            style={{
                                background: params.prize_pack_series === String(n) ? activeSpecialGroup.color + "22" : "#12121a",
                                border: `1px solid ${params.prize_pack_series === String(n) ? activeSpecialGroup.color : "#2a2a3a"}`,
                                color: params.prize_pack_series === String(n) ? activeSpecialGroup.color : "#a0a0b0",
                                padding: "4px 10px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                            }}>
                            Series {n}
                        </Link>
                    ))}
                </div>
            )}

            {activeSpecialGroup && activeSpecialGroup.label !== "Prize Pack" && (
                <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderTop: `2px solid ${activeSpecialGroup.color}`, borderRadius: "6px", padding: "10px 12px", display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {activeSpecialGroup.sets.map((s: any) => (
                        <SetChip key={s.code} set={s} active={activeSetCode === s.code} href={buildHref(params, { card_set: s.code, era: undefined, page: "1" })} color={activeSpecialGroup.color} />
                    ))}
                </div>
            )}

            {activeSet && activeSet.symbol_url && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", padding: "10px 14px", background: "#1a1a24", borderRadius: "8px", border: "1px solid #2a2a3a" }}>
                    <img src={activeSet.symbol_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{activeSet.name}</span>
                    <span style={{ color: "#555", fontSize: "12px" }}>· {activeSet.era_name}</span>
                </div>
            )}

            {/* SUPERTYPE + IN STOCK */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {SUPERTYPES.map((t) => (
                    <Link key={t.value} href={buildHref(params, { supertype: params.supertype === t.value ? undefined : t.value, energy_type: undefined, subtype: undefined, page: "1" })} style={{
                        background: params.supertype === t.value ? "#ff6b3522" : "#1a1a24",
                        border: `1px solid ${params.supertype === t.value ? "#ff6b35" : "#2a2a3a"}`,
                        color: params.supertype === t.value ? "#ff6b35" : "#a0a0b0",
                        padding: "5px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: 600,
                    }}>{t.label}</Link>
                ))}
                <div style={{ marginLeft: "auto" }}>
                    <Link href={buildHref(params, { show_out_of_stock: showInStock ? "true" : undefined, page: "1" })} style={{
                        background: !showInStock ? "#10B98122" : "#1a1a24",
                        border: `1px solid ${!showInStock ? "#10B981" : "#2a2a3a"}`,
                        color: !showInStock ? "#10B981" : "#a0a0b0",
                        padding: "5px 14px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                        display: "flex", alignItems: "center", gap: "6px",
                    }}>
                        {showInStock ? "✓ In Stock Only" : "○ Show All"}
                    </Link>
                </div>
            </div>

            {subtypeOptions.length > 0 && (
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" }}>
                    {subtypeOptions.map((t) => (
                        <Link key={t.value} href={buildHref(params, { subtype: params.subtype === t.value ? undefined : t.value, page: "1" })} style={{
                            background: params.subtype === t.value ? "#ff6b3522" : "#1a1a24",
                            border: `1px solid ${params.subtype === t.value ? "#ff6b35" : "#2a2a3a"}`,
                            color: params.subtype === t.value ? "#ff6b35" : "#a0a0b0",
                            padding: "4px 12px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                        }}>{t.label}</Link>
                    ))}
                </div>
            )}

            {showEnergyTypes && (
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {ENERGY_TYPES.map((t) => (
                        <Link key={t.value} href={buildHref(params, { energy_type: params.energy_type === t.value ? undefined : t.value, page: "1" })} style={{
                            background: params.energy_type === t.value ? t.color + "33" : "#1a1a24",
                            border: `1px solid ${params.energy_type === t.value ? t.color : "#2a2a3a"}`,
                            color: params.energy_type === t.value ? t.color : "#a0a0b0",
                            padding: "4px 11px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500,
                        }}>{t.label}</Link>
                    ))}
                </div>
            )}

            {/* SEARCH */}
            <form method="GET" style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
                {params.era && <input type="hidden" name="era" value={params.era} />}
                {params.card_set && <input type="hidden" name="card_set" value={params.card_set} />}
                {params.energy_type && <input type="hidden" name="energy_type" value={params.energy_type} />}
                {params.supertype && <input type="hidden" name="supertype" value={params.supertype} />}
                {params.subtype && <input type="hidden" name="subtype" value={params.subtype} />}
                {params.show_out_of_stock && <input type="hidden" name="show_out_of_stock" value={params.show_out_of_stock} />}
                {params.pokedex && <input type="hidden" name="pokedex" value={params.pokedex} />}
                <input name="search" defaultValue={params.search} placeholder="Search name, set, artist..." style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "8px 14px", color: "#fff", fontSize: "13px", flex: 1, minWidth: "180px" }} />
                <input name="pokedex" defaultValue={params.pokedex} placeholder="Dex # e.g. 25" style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px", width: "120px" }} />
                <select name="rarity" defaultValue={params.rarity || ""} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px" }}>
                    {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select name="ordering" defaultValue={params.ordering || "card_number"} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px" }}>
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select name="legality" defaultValue={effectiveLegality} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px" }}>
                    {LEGALITY_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <button type="submit" style={{ background: "#ff6b35", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Search</button>
                {(params.search || params.rarity || params.era || params.energy_type || params.supertype || params.card_set || params.subtype || params.pokedex) && (
                    <Link href="/cards" style={{ color: "#a0a0b0", fontSize: "12px", textDecoration: "none", padding: "8px 12px", border: "1px solid #2a2a3a", borderRadius: "6px", background: "#1a1a24" }}>Clear all</Link>
                )}
            </form>

            <div style={{ color: "#a0a0b0", fontSize: "13px", marginBottom: "16px" }}>
                <strong style={{ color: "#fff" }}>{data.count?.toLocaleString()}</strong> cards {showInStock ? "in stock" : "total"}
                {params.subtype && <span style={{ color: "#ff6b35" }}> · {params.subtype}</span>}
            </div>

            <div style={{ marginBottom: "20px" }}>
                <Paginator current={page} total={totalPages} params={params} />
            </div>

            {/* CARD GRID */}
            {(() => {
                const nmCards = data.results.filter((c: any) => !c.condition || c.condition === 'NM');
                const playedCards = data.results.filter((c: any) => c.condition && c.condition !== 'NM' && c.stock > 0);
                const playedByProductId: Record<number, any[]> = {};
                for (const p of playedCards) {
                    const pid = p.tcgcsv_product_id;
                    if (pid) {
                        if (!playedByProductId[pid]) playedByProductId[pid] = [];
                        playedByProductId[pid].push(p);
                    }
                }
                const renderCard = (card: any, isPlayed: boolean) => (
                    <CardTile key={(card.pb_id || card.id) + (isPlayed ? '-played' : '')} card={card} isPlayed={isPlayed} />
                );
                const gridItems: React.ReactNode[] = [];
                for (const card of nmCards) {
                    gridItems.push(renderCard(card, false));
                    const siblings = playedByProductId[card.tcgcsv_product_id] || [];
                    for (const played of siblings) {
                        gridItems.push(renderCard(played, true));
                    }
                }
                const pairedIds = new Set(nmCards.map((c: any) => c.tcgcsv_product_id).filter(Boolean));
                for (const played of playedCards) {
                    if (!pairedIds.has(played.tcgcsv_product_id)) {
                        gridItems.push(renderCard(played, true));
                    }
                }
                return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "10px" }}>
                        {gridItems}
                    </div>
                );
            })()}

            <div style={{ marginTop: "32px", marginBottom: "24px" }}>
                <Paginator current={page} total={totalPages} params={params} />
            </div>

            <div style={{ padding: "16px 20px", background: "#1a1a24", borderRadius: "8px", border: "1px solid #2a2a3a", fontSize: "13px", color: "#a0a0b0" }}>
                <strong style={{ color: "#fff" }}>Local Pickup</strong> — Birchleigh North, Kempton Park<br />
                Mon-Fri: 18:30-21:00 | Sat: 10:00-18:00 | Sun: 10:00-15:00<br />
                <span style={{ color: "#ff6b35" }}>Give us 24 hours notice to prep your order!</span>
            </div>
        </div>
    );
}
