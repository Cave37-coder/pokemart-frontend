"use client";
import { useState } from "react";
import Link from "next/link";
import { pokemonSpriteUrl } from "@/lib/pokedex";

interface SpeciesEntry { id: number; name: string }

// The species-picker half of "My Collections" (2026-09-29, Michael: "work
// off the pokedex structure, where you can select the pokemon, but that
// selection is moved to a page, where it can be tracked on its own"). Same
// search + tile-grid pattern as PokedexGrid, deliberately a separate,
// simpler component rather than reusing PokedexGrid directly -- PokedexGrid
// is wired to usePokedexCollection for its caught badges/progress bar/value
// strips, none of which apply to a plain "pick a Pokemon to start tracking"
// screen, and Michael was explicit the real Pokedex stays untouched. This
// grid carries no ownership state of its own -- every tile links to
// /collections/[id], which is where that specific Single Collection is
// actually tracked.
export default function CollectionsPickerGrid({ pokemon, allPokemon }: {
    pokemon: SpeciesEntry[];
    allPokemon?: SpeciesEntry[];
}) {
    const [search, setSearch] = useState("");

    // Same full-catalog search behaviour as PokedexGrid -- a query searches
    // every generation, not just whichever gen tab is active.
    const searchPool = search.trim() ? (allPokemon ?? pokemon) : pokemon;
    const filtered = search.trim()
        ? searchPool.filter(p =>
            p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            String(p.id).includes(search.trim())
        )
        : searchPool;

    return (
        <div>
            <div style={{ fontSize: "13px", color: "#a0a0b0", marginBottom: "14px" }}>
                Pick a Pokémon to start (or keep tracking) its own collection — separate from your Pokédex.
            </div>

            <input
                type="text"
                placeholder="Search Pokémon..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    width: "100%", maxWidth: "420px", background: "#1a1a24", border: "1px solid #2a2a3a",
                    borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px",
                    marginBottom: "20px", outline: "none",
                }}
            />

            {filtered.length === 0 ? (
                <div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
                    No Pokémon match &quot;{search}&quot;.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                    {filtered.map(p => (
                        <Link
                            key={p.id}
                            href={`/collections/${p.id}`}
                            style={{
                                background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px",
                                padding: "14px 10px", textDecoration: "none", textAlign: "center",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                            }}
                            className="pb-collections-tile"
                        >
                            <img
                                src={pokemonSpriteUrl(p.id)}
                                alt={p.name}
                                loading="lazy"
                                style={{ width: "64px", height: "64px", objectFit: "contain" }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                            />
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{p.name}</div>
                            <div style={{ fontSize: "11px", color: "#555" }}>#{String(p.id).padStart(3, "0")}</div>
                        </Link>
                    ))}
                </div>
            )}

            <style>{`
                .pb-collections-tile { transition: border-color 0.15s ease, transform 0.1s ease; }
                .pb-collections-tile:hover { border-color: #ff6b35 !important; transform: translateY(-2px); }
            `}</style>
        </div>
    );
}
