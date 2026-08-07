import Link from "next/link";
import AddToPileButton from "@/components/AddToPileButton";
import WishlistHeartButton from "@/components/WishlistHeartButton";

// Extracted from src/app/cards/page.tsx (2026-08-02) so the Pokedex card-list
// page can reuse the exact same variant badges/border colors instead of
// duplicating this logic a second time. Keep this the single source of
// truth for "what does a card tile look like" -- edit here, not in
// cards/page.tsx, and both pages pick it up.

export type VariantKey = "N" | "H" | "RH" | "ESH" | "ERH" | "RH-PB" | "RH-MB" | "BRH-FB" | "BRH-LB" | "BRH-QB" | "BRH-DB" | "BRH-R" | "DR" | "AS" | "MH" | "1ST" | "IR" | "SIR" | "HR";

export function getVariantKey(card: { variant_override: string; rarity: string; price_first_edition: string | null; }): VariantKey {
    const v = (card.variant_override || "").trim();
    const r = card.rarity || "";
    if (card.price_first_edition) return "1ST";
    if (v === "H") return "H";
    if (v === "RH" || v === "RH-H") return "RH";
    if (v === "ESH") return "ESH";
    if (v === "ERH" || v === "SE") return "ERH";
    if (v === "RH-PB") return "RH-PB";
    if (v === "RH-MB") return "RH-MB";
    if (v === "BRH-FB") return "BRH-FB";
    if (v === "BRH-LB") return "BRH-LB";
    if (v === "BRH-QB") return "BRH-QB";
    if (v === "BRH-DB") return "BRH-DB";
    if (v === "BRH-R" || v === "TRH") return "BRH-R";
    if (v === "PB" || v === "PBP") return "RH-PB";
    if (v === "MBP") return "RH-MB";
    if (v === "FB") return "BRH-FB";
    if (v === "LB") return "BRH-LB";
    if (v === "QB") return "BRH-QB";
    if (v === "DB") return "BRH-DB";
    if (v === "TR" || v === "TT") return "BRH-R";
    if (v === "CC") return "MH";
    if (v === "DR" || v === "EX") return "DR";
    if (v === "GX" || v === "V" || v === "VX" || v === "VST" || v === "UR") return "DR";
    if (v === "GS" || v === "SHN" || v === "LGD" || v === "BRK") return "DR";
    if (v === "AS") return "AS";
    if (v === "MH") return "MH";
    if (v === "1E" || v === "SH") return "1ST";
    if (v === "1E-H" || v === "1ES" || v === "SH-H" || v === "1ES-H") return "H";
    if (v === "IR") return "IR";
    if (v === "SIR") return "SIR";
    if (v === "HR") return "HR";
    if (r === "illustration_rare") return "IR";
    if (r === "special_illustration_rare") return "SIR";
    if (r === "hyper_rare") return "HR";
    return "N";
}

export const VARIANT_BORDER: Record<VariantKey, { color: string; width: string }> = {
    N: { color: "#2a2a3a", width: "1px" },
    H: { color: "#BA7517", width: "1px" },
    RH: { color: "#7F77DD", width: "1px" },
    ESH: { color: "#1D9E75", width: "1px" },
    ERH: { color: "#0F6E56", width: "1px" },
    "RH-PB": { color: "#A32D2D", width: "1px" },
    "RH-MB": { color: "#534AB7", width: "1px" },
    "BRH-FB": { color: "#3B6D11", width: "1px" },
    "BRH-LB": { color: "#993556", width: "1px" },
    "BRH-QB": { color: "#854F0B", width: "1px" },
    "BRH-DB": { color: "#085041", width: "1px" },
    "BRH-R": { color: "#A32D2D", width: "1px" },
    DR: { color: "#888780", width: "1px" },
    AS: { color: "#7F77DD", width: "1px" },
    MH: { color: "#378ADD", width: "1px" },
    "1ST": { color: "#0F6E56", width: "1px" },
    IR: { color: "#BA7517", width: "1px" },
    SIR: { color: "#BA7517", width: "2px" },
    HR: { color: "#7F77DD", width: "2px" },
};

export function VariantOverlay({ vk }: { vk: VariantKey }) {
    const badge = (label: string, bg: string, color: string, pos: "tr" | "tl" = "tr") => (
        <div style={{ position: "absolute", ...(pos === "tr" ? { top: 5, right: 5 } : { top: 5, left: 5 }), background: bg, color, fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 10, zIndex: 4, letterSpacing: "0.3px", lineHeight: 1.4 }}>{label}</div>
    );
    const diag = (rgba: string) => (
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: `repeating-linear-gradient(45deg,transparent,transparent 5px,${rgba} 5px,${rgba} 6px)` }} />
    );
    const ball = (top: string, bot: string, line: string, dot?: string, stripe?: boolean, heart?: boolean) => {
        if (heart) return (
            <div style={{ position: "absolute", bottom: 5, right: 5, zIndex: 3 }}>
                <svg width="18" height="16" viewBox="0 0 18 16"><path d="M9 14C3.5 9.5 1 7 1 4.2 1 2.2 2.8 1 5 1c1.8 0 3.2 1.2 4 2.5C9.8 2.2 11.2 1 13 1c2.2 0 4 1.2 4 3.2C17 7 14.5 9.5 9 14Z" fill={top} /></svg>
            </div>
        );
        return (
            <div style={{ position: "absolute", bottom: 5, right: 5, width: 18, height: 18, borderRadius: "50%", overflow: "hidden", border: "0.5px solid #33333355", zIndex: 3 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: top }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: bot }} />
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: line, transform: "translateY(-50%)" }} />
                {dot && <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: dot }} />}
                {stripe && <div style={{ position: "absolute", top: 1, right: 3, width: 3, height: 7, background: top, borderRadius: 1 }} />}
            </div>
        );
    };
    const stars = (count: number, colors: string[]) => (
        <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, zIndex: 3 }}>
            {Array.from({ length: count }).map((_, i) => <span key={i} style={{ fontSize: 11, color: colors[i] || colors[0], lineHeight: 1 }}>★</span>)}
        </div>
    );
    const aceBorder = <div style={{ position: "absolute", inset: 3, borderRadius: 3, zIndex: 2, pointerEvents: "none", border: "1.5px solid transparent", backgroundImage: "linear-gradient(#0000,#0000),linear-gradient(135deg,#e24b4a,#ef9f27,#639922,#1d9e75,#378add,#7f77dd)", backgroundOrigin: "border-box", backgroundClip: "padding-box,border-box" }} />;
    switch (vk) {
        case "H": return (<>{diag("rgba(186,117,23,0.12)")}{badge("HOLO", "#633806", "#FAC775")}<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#EF9F27", zIndex: 2 }} /></>);
        case "RH": return (<>{diag("rgba(127,119,221,0.15)")}{badge("RH", "#3C3489", "#CECBF6")}</>);
        case "ESH": return (<>{diag("rgba(29,158,117,0.15)")}{badge("ESH", "#134E4A", "#8FE9D0")}</>);
        case "ERH": return (<>{diag("rgba(29,158,117,0.15)")}{badge("ERH", "#085041", "#9FE1CB")}<div style={{ position: "absolute", bottom: 5, right: 5, width: 16, height: 16, borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "#E1F5EE", zIndex: 3 }}>E</div></>);
        case "RH-PB": return (<>{badge("PB", "#791F1F", "#F7C1C1")}{ball("#E24B4A", "#f5f5f5", "#333")}</>);
        case "RH-MB": return (<>{badge("MB", "#3C3489", "#CECBF6")}{ball("#7F77DD", "#f0f0f0", "#333", "#EEEDFE")}</>);
        case "BRH-FB": return (<>{badge("FB", "#27500A", "#C0DD97")}{ball("#639922", "#e8f5d0", "#333")}</>);
        case "BRH-LB": return (<>{badge("LB", "#72243E", "#F4C0D1")}{ball("#D4537E", "#D4537E", "#D4537E", undefined, undefined, true)}</>);
        case "BRH-QB": return (<>{badge("QB", "#633806", "#FAC775")}{ball("#EF9F27", "#f5f5e0", "#333", undefined, true)}</>);
        case "BRH-DB": return (<>{badge("DB", "#04342C", "#5DCAA5")}{ball("#0F6E56", "#c0c0b0", "#222", "#1D9E75")}</>);
        case "BRH-R": return (<>{diag("rgba(226,75,74,0.15)")}{badge("R", "#791F1F", "#F7C1C1")}{badge("R", "#791F1F", "#F7C1C1")}<div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 14, fontWeight: 700, color: "#E24B4A", zIndex: 3, lineHeight: 1 }}>R</div></>);
        case "DR": return (<>{diag("rgba(180,178,169,0.12)")}{badge("EX", "#444441", "#D3D1C7")}</>);
        case "AS": return (<>{aceBorder}{badge("ACE", "linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)", "#fff")}</>);
        case "MH": return (<><div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(55,138,221,0.1) 4px,rgba(55,138,221,0.1) 5px)" }} /><div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(55,138,221,0.07) 4px,rgba(55,138,221,0.07) 5px)" }} />{badge("MH", "#0C447C", "#B5D4F4")}</>);
        case "1ST": return (<><div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", boxShadow: "inset 0 0 0 2px rgba(29,158,117,0.3)" }} />{badge("1st ED", "#085041", "#9FE1CB", "tl")}</>);
        case "IR": return (<>{diag("rgba(186,117,23,0.1)")}{badge("IR", "#633806", "#FAC775")}{stars(1, ["#EF9F27"])}</>);
        case "SIR": return (<><div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "repeating-linear-gradient(60deg,transparent,transparent 4px,rgba(239,159,39,0.15) 4px,rgba(239,159,39,0.15) 5px)" }} /><div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "repeating-linear-gradient(-60deg,transparent,transparent 4px,rgba(239,159,39,0.08) 4px,rgba(239,159,39,0.08) 5px)" }} />{badge("SIR", "#412402", "#FAC775")}{stars(2, ["#EF9F27", "#EF9F27"])}</>);
        case "HR": return (<>{aceBorder}{badge("HR", "linear-gradient(90deg,#a32d2d,#854F0B,#27500A,#185FA5,#534AB7)", "#fff")}{stars(3, ["#E24B4A", "#EF9F27", "#7F77DD"])}</>);
        default: return null;
    }
}

// Small inline Poke Ball icon -- used on the "Catch"/"Caught!" button so
// marking a card owned feels like actually catching it, not just ticking a
// checkbox. `dim` renders the greyed-out "not caught yet" version.
export function PokeballIcon({ size = 14, dim = false }: { size?: number; dim?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block", flexShrink: 0 }}>
            <circle cx="10" cy="10" r="9" fill={dim ? "#3a3a4a" : "#E24B4A"} stroke={dim ? "#5a5a6a" : "#7a1f1f"} strokeWidth="1" />
            <path d="M1 10a9 9 0 0 0 18 0Z" fill={dim ? "#2a2a3a" : "#f5f5f5"} />
            <rect x="1" y="9.3" width="18" height="1.4" fill={dim ? "#5a5a6a" : "#222"} />
            <circle cx="10" cy="10" r="3" fill={dim ? "#2a2a3a" : "#f5f5f5"} stroke={dim ? "#5a5a6a" : "#222"} strokeWidth="1.2" />
            <circle cx="10" cy="10" r="1.3" fill={dim ? "#5a5a6a" : "#222"} />
        </svg>
    );
}

export function PrizePackOverlay({ series, vk }: { series: string; vk: VariantKey }) {
    if (!series) return null;
    // Per the official Play! Pokémon rules: Prize Pack foils use Cosmos Holofoil,
    // except ex/ACE SPEC/V/etc cards which keep their normal foil pattern.
    // vk === "H" specifically means a plain Holo print (not DR/AS/IR/etc),
    // so this naturally only flags the cards that are genuinely Cosmos Holo.
    const isCosmosHolo = vk === "H";
    return (
        <div style={{ position: "absolute", bottom: 5, left: 5, zIndex: 4, display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
            <img
                src="https://images.pokebulk.co.za/sets/symbols/prizepack_stamp.png"
                alt="Play! Pokemon stamp"
                style={{ width: 22, height: 16, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
            />
            {isCosmosHolo && (
                <div style={{ background: "#3C3489", color: "#CECBF6", fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 8, letterSpacing: "0.3px", lineHeight: 1.4 }}>
                    ✦ COSMOS
                </div>
            )}
        </div>
    );
}

// The actual card tile -- image + variant overlay + name/number/price + Add
// to Pile. `isPlayed` controls the yellow-tint "played condition sibling"
// treatment used on /cards (a second, lower-condition copy of the same
// product_id shown right after its NM copy). Defaults to false for callers
// (like the Pokedex page) that don't have that pairing concept.
//
// `showPokedexToggle`/`isOwned`/`onToggleOwned` are opt-in, only used by the
// Pokedex collection ( /pokedex/[id] ) -- a completely separate feature from
// Checklists, per Michael's explicit "not tie in into Checklist" requirement.
// Left undefined/false, /cards renders exactly as before.
export default function CardTile({
    card, isPlayed = false, showPokedexToggle = false, isOwned = false, onToggleOwned, forceColor = false,
}: {
    card: any; isPlayed?: boolean;
    showPokedexToggle?: boolean; isOwned?: boolean; onToggleOwned?: () => void;
    // Michael, 2026-08-02: "all image to be colour on selection page and on
    // the landing page" -- Pokedex collection views (owned-card checkbox
    // list, Top Valued/Recently Added strips) show cards you already own,
    // so the /cards "greyed out = out of stock" convention doesn't apply
    // there; forceColor skips that dimming/greyscale regardless of current
    // shop stock. /cards never passes this, so its behaviour is unchanged.
    forceColor?: boolean;
}) {
    const vk = getVariantKey(card) as VariantKey;
    const vb = VARIANT_BORDER[vk];
    const cardNum = card.number || (card.card_number != null ? String(card.card_number).padStart(3, "0") : "???");
    const setCode = card.card_set?.code || "";
    const eraCode = card.card_set?.era?.code || "";
    const symbolUrl = card.card_set?.symbol_url || "";
    const hasStock = card.stock > 0;
    const showAsInStock = forceColor ? true : hasStock; // display-only; AddToPileButton still gets the real hasStock
    const condLabel = card.condition || 'NM';
    return (
        <div style={{
            background: isPlayed ? "#1a1510" : "#1a1a24",
            border: isPlayed ? "1px solid #b45309" : `${vb.width} solid ${vb.color}`,
            borderRadius: "8px", overflow: "hidden",
            opacity: showAsInStock ? 1 : 0.6,
            position: "relative",
        }}>
            {showPokedexToggle && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleOwned?.(); }}
                    title={isOwned ? "Caught! Click to remove from your Pokédex collection" : "Click to mark this card caught"}
                    style={{
                        position: "absolute", top: 6, left: 6, zIndex: 10,
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 9px 3px 5px", borderRadius: 12,
                        background: isOwned ? "#16a34a" : "rgba(18,18,26,0.85)",
                        border: `1.5px solid ${isOwned ? "#22c55e" : "#666"}`,
                        color: isOwned ? "#eafff1" : "#ccc",
                        fontSize: 10, fontWeight: 700, lineHeight: 1, letterSpacing: "0.2px",
                        cursor: "pointer",
                        transition: "transform 0.15s ease, background 0.15s ease",
                        transform: isOwned ? "scale(1.04)" : "scale(1)",
                    }}
                >
                    <PokeballIcon size={13} dim={!isOwned} />
                    {isOwned ? "Caught!" : "Catch"}
                </button>
            )}
            {isPlayed && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(234,179,8,0.08)",
                    pointerEvents: "none", zIndex: 1, borderRadius: "8px"
                }} />
            )}
            <Link href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "3/4" }}>
                    {card.image_url ? (
                        <img src={card.image_url} alt={card.name}
                            style={{
                                position: "absolute", inset: 0,
                                width: "100%", height: "100%", objectFit: "cover", display: "block",
                                filter: isPlayed
                                    ? `grayscale(15%) sepia(40%) hue-rotate(5deg) brightness(0.85)${!showAsInStock ? " grayscale(100%)" : ""}`
                                    : (showAsInStock ? "none" : "grayscale(100%)")
                            }} />
                    ) : (
                        <div style={{ position: "absolute", inset: 0, background: "#12121a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>🃏</div>
                    )}
                    <VariantOverlay vk={vk} />
                    <PrizePackOverlay series={card.prize_pack_series || ""} vk={vk} />
                    {isPlayed && (
                        <div style={{
                            position: "absolute", top: 5, left: 5, zIndex: 5,
                            background: "#92400e", color: "#fde68a",
                            fontSize: 9, fontWeight: 700, padding: "2px 7px",
                            borderRadius: 10, letterSpacing: "0.4px", lineHeight: 1.4,
                        }}>{condLabel}</div>
                    )}
                </div>
                <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        {symbolUrl && <img src={symbolUrl} alt="" style={{ width: 10, height: 10, objectFit: "contain", opacity: 0.5 }} />}
                        {eraCode} · {setCode} · {cardNum}
                    </div>
                    <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "3px", lineHeight: 1.3, fontWeight: 500 }}>{card.name}</div>
                    {card.pokedex_number && <div style={{ fontSize: "9px", color: "#a0a0b0", marginBottom: "1px" }}>#{String(card.pokedex_number).padStart(4, "0")}</div>}
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "5px" }}>{card.rarity?.replace(/_/g, " ").toUpperCase()}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <div style={{ fontWeight: 700, color: isPlayed ? "#fbbf24" : "#ff6b35", fontSize: "14px" }}>R {parseFloat(card.price).toFixed(2)}</div>
                        <WishlistHeartButton productId={card.id} variant="tile" />
                    </div>
                </div>
            </Link>
            <div style={{ padding: "0 10px 10px" }}>
                <AddToPileButton productId={card.id} hasStock={hasStock} size="sm" />
            </div>
        </div>
    );
}
