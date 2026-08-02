// Shared between /pokedex (grid) and /pokedex/[id] (per-Pokemon card list).

export const GENERATIONS = [
    { code: "1", label: "Gen I", start: 1, end: 151 },
    { code: "2", label: "Gen II", start: 152, end: 251 },
    { code: "3", label: "Gen III", start: 252, end: 386 },
    { code: "4", label: "Gen IV", start: 387, end: 493 },
    { code: "5", label: "Gen V", start: 494, end: 649 },
    { code: "6", label: "Gen VI", start: 650, end: 721 },
    { code: "7", label: "Gen VII", start: 722, end: 809 },
    { code: "8", label: "Gen VIII", start: 810, end: 905 },
    { code: "9", label: "Gen IX", start: 906, end: 1025 },
];

// Kebab-case-to-display-name overrides for the handful of species PokeAPI's
// slug doesn't round-trip cleanly (apostrophes/accents get stripped from
// slugs, and some multi-word names use a hyphen in the slug where the real
// name uses a space, or vice versa). Everything not listed here falls back
// to a generic "capitalize each hyphen-segment" formatter, which is correct
// for the large majority of the dex.
const NAME_OVERRIDES: Record<string, string> = {
    "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂",
    "mr-mime": "Mr. Mime", "mr-rime": "Mr. Rime", "mime-jr": "Mime Jr.",
    "farfetchd": "Farfetch'd", "sirfetchd": "Sirfetch'd",
    "type-null": "Type: Null", "ho-oh": "Ho-Oh", "porygon-z": "Porygon-Z",
    "flabebe": "Flabébé",
    "jangmo-o": "Jangmo-o", "hakamo-o": "Hakamo-o", "kommo-o": "Kommo-o",
    "tapu-koko": "Tapu Koko", "tapu-lele": "Tapu Lele", "tapu-bulu": "Tapu Bulu", "tapu-fini": "Tapu Fini",
    "ting-lu": "Ting-Lu", "chien-pao": "Chien-Pao", "wo-chien": "Wo-Chien", "chi-yu": "Chi-Yu",
    "great-tusk": "Great Tusk", "scream-tail": "Scream Tail", "brute-bonnet": "Brute Bonnet",
    "flutter-mane": "Flutter Mane", "slither-wing": "Slither Wing", "sandy-shocks": "Sandy Shocks",
    "iron-treads": "Iron Treads", "iron-bundle": "Iron Bundle", "iron-hands": "Iron Hands",
    "iron-jugulis": "Iron Jugulis", "iron-moth": "Iron Moth", "iron-thorns": "Iron Thorns",
    "roaring-moon": "Roaring Moon", "iron-valiant": "Iron Valiant", "walking-wake": "Walking Wake",
    "iron-leaves": "Iron Leaves", "gouging-fire": "Gouging Fire", "raging-bolt": "Raging Bolt",
    "iron-boulder": "Iron Boulder", "iron-crown": "Iron Crown",
};

export function formatPokemonName(slug: string): string {
    if (NAME_OVERRIDES[slug]) return NAME_OVERRIDES[slug];
    return slug.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function pokemonSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function pokemonArtworkUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

interface SpeciesListResult { name: string; url: string }

export async function getAllSpecies(): Promise<{ id: number; name: string }[]> {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=1025&offset=0", {
        next: { revalidate: 60 * 60 * 24 * 30 }, // this data never changes -- cache for 30 days
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: SpeciesListResult[] = data.results || [];
    return results
        .map(r => {
            const match = r.url.match(/\/pokemon-species\/(\d+)\//);
            const id = match ? parseInt(match[1], 10) : 0;
            return { id, name: formatPokemonName(r.name) };
        })
        .filter(p => p.id > 0)
        .sort((a, b) => a.id - b.id);
}

// Single-species lookup for the detail page -- same cached fetch, tiny
// payload, no need to pull the full 1025-entry list just to get one name.
export async function getSpeciesName(id: number): Promise<string | null> {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`, {
        next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.name ? formatPokemonName(data.name) : null;
}
