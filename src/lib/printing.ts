// WotC-era print runs (2026-11-06), modelled on Collectr / TCGplayer.
// Michael: "can we copy what Collectr did and give the definition of the
// variant, especially for the WOTC Era cards".
//
//   Base Set (Unlimited)                 BS   -> every card is "Unlimited"
//   Base Set (1st Edition & Shadowless)  BSS  -> FE = "1st Edition", N/H = "Shadowless"
//   Jungle, Fossil, Team Rocket, Gym Heroes/Challenge, Neo 1-4
//                                             -> FE = "1st Edition", N/H = "Unlimited"
// Full spec: project doc claude/wotc_print_runs_spec.md.

export type PrintingKey = "1ST" | "SHADOWLESS" | "UNLIMITED";

export interface Printing {
    key: PrintingKey;
    label: string;      // "1st Edition"
    color: string;      // text colour
    bg: string;         // pill background
    howToTell: string;  // one-line identification guide
}

const FIRST_ED_SETS = new Set(["BSS", "JU", "FO", "TR", "G1", "G2", "N1", "N2", "N3", "N4"]);

const PRINTINGS: Record<PrintingKey, Printing> = {
    "1ST": {
        key: "1ST", label: "1st Edition", color: "#9FE1CB", bg: "#085041",
        howToTell: "Black “Edition 1” stamp just below the bottom-left corner of the artwork. The first print run.",
    },
    SHADOWLESS: {
        key: "SHADOWLESS", label: "Shadowless", color: "#FAC775", bg: "#633806",
        howToTell: "No 1st Edition stamp and no drop shadow along the right edge of the art box. The second Base Set print run.",
    },
    UNLIMITED: {
        key: "UNLIMITED", label: "Unlimited", color: "#cfd3dc", bg: "#2a2a3a",
        howToTell: "No 1st Edition stamp. In Base Set the art box has a drop shadow on its right edge. The common later print run.",
    },
};

type CardLike = { variant_override?: string | null; card_set?: { code?: string } | null };

// Returns the print run for WotC-era cards that have one, or null for every
// other card (modern sets have no 1st Edition / Unlimited split).
export function getPrinting(card: CardLike): Printing | null {
    const code = card.card_set?.code || "";
    const v = (card.variant_override || "").trim();
    if (v === "FE") return PRINTINGS["1ST"];
    if (code === "BSS") return PRINTINGS.SHADOWLESS;
    if (code === "BS") return PRINTINGS.UNLIMITED;
    if (FIRST_ED_SETS.has(code)) return PRINTINGS.UNLIMITED;
    return null;
}

// The printings a WotC set comes in, for the explainer on the card page.
export function printingsForSet(code: string): Printing[] {
    if (code === "BSS") return [PRINTINGS["1ST"], PRINTINGS.SHADOWLESS];
    if (code === "BS") return [PRINTINGS.UNLIMITED];
    if (FIRST_ED_SETS.has(code)) return [PRINTINGS["1ST"], PRINTINGS.UNLIMITED];
    return [];
}
