import type { Card } from "@/lib/api";
import { getSpeciesName, pokemonArtworkUrl } from "@/lib/pokedex";
import PokedexCardList from "@/components/PokedexCardList";
import BackButton from "@/components/BackButton";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Pulls every catalogued print (in stock or not -- no in_stock filter) for
// this pokedex number, following pagination fully rather than capping at
// one page, same pattern used elsewhere in this app (checklists' product
// fetch) for exhaustive results.
async function getAllCardsForPokedex(id: string): Promise<Card[]> {
    const results: Card[] = [];
    let url: string | null =
        `${API_URL}/api/products/?pokedex=${encodeURIComponent(id)}&min_price=0.01&page_size=200&ordering=-card_set__release_date,card_number,variant_sort`;
    let guard = 0;
    while (url && guard < 25) {
        const res: Response = await fetch(url, { cache: "no-store" });
        if (!res.ok) break;
        const data: { results?: Card[]; next?: string | null } = await res.json();
        results.push(...(data.results || []));
        url = data.next || null;
        guard++;
    }
    return results;
}

export default async function PokedexEntryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dexId = parseInt(id, 10);

    if (!Number.isFinite(dexId) || dexId < 1) {
        return (
            <div style={{ maxWidth: "680px", margin: "60px auto", padding: "0 1.5rem", textAlign: "center" }}>
                <div style={{ color: "#EF4444", marginBottom: 16 }}>Invalid Pokédex number.</div>
                <BackButton fallbackHref="/pokedex" style={{ color: "#ff6b35" }}>Back to Pokédex</BackButton>
            </div>
        );
    }

    const [name, cards] = await Promise.all([
        getSpeciesName(dexId),
        getAllCardsForPokedex(id),
    ]);

    if (!name) {
        return (
            <div style={{ maxWidth: "680px", margin: "60px auto", padding: "0 1.5rem", textAlign: "center" }}>
                <div style={{ color: "#EF4444", marginBottom: 16 }}>Pokémon not found.</div>
                <BackButton fallbackHref="/pokedex" style={{ color: "#ff6b35" }}>Back to Pokédex</BackButton>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 1.5rem" }}>
            <BackButton fallbackHref="/pokedex" style={{ fontSize: "13px", color: "#a0a0b0", display: "inline-block", marginBottom: "16px" }}>
                ← Back to Pokédex
            </BackButton>

            <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "24px", flexWrap: "wrap" }}>
                <img
                    src={pokemonArtworkUrl(dexId)}
                    alt={name}
                    style={{ width: "88px", height: "88px", objectFit: "contain" }}
                />
                <div>
                    <div style={{ fontSize: "12px", color: "#ff6b35", fontWeight: 700, letterSpacing: "0.05em" }}>
                        #{String(dexId).padStart(3, "0")}
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 700, color: "#fff" }}>{name}</div>
                    <div style={{ fontSize: "13px", color: "#a0a0b0" }}>
                        {cards.length} card{cards.length === 1 ? "" : "s"} in our catalog
                    </div>
                </div>
            </div>

            {cards.length === 0 ? (
                <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "40px 20px", textAlign: "center", color: "#555", fontSize: "13px" }}>
                    We don&apos;t have any {name} cards catalogued yet.
                </div>
            ) : (
                <PokedexCardList cards={cards} speciesId={dexId} />
            )}

            <div style={{ marginTop: "32px", padding: "16px 20px", background: "#1a1a24", borderRadius: "8px", border: "1px solid #2a2a3a", fontSize: "13px", color: "#a0a0b0" }}>
                <strong style={{ color: "#fff" }}>Local Pickup</strong> — Birchleigh North, Kempton Park<br />
                Mon-Fri: 18:30-21:00 | Sat: 10:00-18:00 | Sun: 10:00-15:00<br />
                <span style={{ color: "#ff6b35" }}>Give us 24 hours notice to prep your order!</span>
            </div>
        </div>
    );
}
