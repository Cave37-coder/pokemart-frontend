// Site-wide price display (2026-11-06, Michael: "if there is no price
// available ... please put 'TBC' in place of the R1.50, it looks bad if you
// looking at R1500 pikachu red cheeks and the 1st Edition shows R1.50!").
// The API stores price = 0 for "no price yet" (TCGCSV has no figure); the
// nightly sync fills in the real price as soon as TCGCSV has one, and the
// cart refuses a 0-priced card.
export function isPriceTbc(price: string | number | null | undefined): boolean {
    const n = typeof price === "number" ? price : parseFloat(price ?? "");
    return !Number.isFinite(n) || n <= 0;
}

export function formatPrice(price: string | number | null | undefined, opts: { space?: boolean; decimals?: number } = {}): string {
    if (isPriceTbc(price)) return "TBC";
    const n = typeof price === "number" ? price : parseFloat(price as string);
    return `R${opts.space === false ? "" : " "}${n.toFixed(opts.decimals ?? 2)}`;
}
