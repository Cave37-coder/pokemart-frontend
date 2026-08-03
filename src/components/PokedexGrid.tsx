"use client";
import { useState } from "react";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import { usePokedexCollection } from "@/lib/usePokedexCollection";
import { NATIONAL_DEX_TOTAL } from "@/lib/pokedex";

interface PokedexEntry { id: number; name: string }

function CardStrip({ title, cards }: { title: string; cards: any[] }) {
    if (cards.length === 0) return null;
    return (
        <div style={{ flex: "1 1 340px", minWidth: "300px", marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#a0a0b0", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                {title}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 160px))", gap: "10px" }}>
                {cards.map(card => <CardTile key={card.pb_id || card.id} card={card} forceColor />)}
            </div>
        </div>
    );
}

export default function PokedexGrid({ pokemon, allPokemon }: { pokemon: PokedexEntry[]; allPokemon?: PokedexEntry[] }) {
    const [search, setSearch] = useState("");
    const { loading, loggedIn, caughtNumbers, caughtCardImages, speciesCollected, collectionValue, topValued, recentlyAdded } = usePokedexCollection();

    // Searching should span every generation, not just whichever gen tab is
    // currently active -- otherwise typing "Zekrom" while on the Gen 1 tab
    // silently returns nothing even though Zekrom exists in the data. So a
    // non-empty query searches the full species list (allPokemon) instead of
    // the gen-sliced one; the default (no query) browse view still respects
    // the active tab.
    const searchPool = search.trim() ? (allPokemon ?? pokemon) : pokemon;
    const filtered = search.trim()
        ? searchPool.filter(p =>
            p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            String(p.id).includes(search.trim())
        )
        : searchPool;

    return (
        <div>
            {!loading && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px",
                    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "12px 16px",
                    flexWrap: "wrap",
                }}>
                    {loggedIn ? (
                        <>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                                {speciesCollected}/{NATIONAL_DEX_TOTAL} Collected
                            </div>
                            <div style={{ flex: 1, minWidth: "140px" }}>
                                <div style={{ height: "6px", borderRadius: "3px", background: "#12121a", overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", width: `${Math.min(100, (speciesCollected / NATIONAL_DEX_TOTAL) * 100)}%`,
                                        background: "#ff6b35", borderRadius: "3px", transition: "width 0.2s ease",
                                    }} />
                                </div>
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#ff6b35", whiteSpace: "nowrap" }}>
                                R {collectionValue.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: "13px", color: "#a0a0b0" }}>Track your own Pokédex collection, separate from your Checklist.</div>
                            <Link href="/auth/login" style={{ fontSize: "12px", color: "#ff6b35", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                                Log in to start →
                            </Link>
                        </>
                    )}
                </div>
            )}

            {loggedIn && !loading && (topValued.length > 0 || recentlyAdded.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "4px" }}>
                    <CardStrip title="Top 3 Most Valued" cards={topValued} />
                    <CardStrip title="3 Most Recently Added" cards={recentlyAdded} />
                </div>
            )}

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
                    {filtered.map(p => {
                        const caught = caughtNumbers.has(p.id);
                        const cardImg = caughtCardImages[p.id];
                        return (
                            <Link
                                key={p.id}
                                href={`/pokedex/${p.id}`}
                                style={{
                                    background: "#1a1a24", border: `1px solid ${caught ? "#ff6b35" : "#2a2a3a"}`, borderRadius: "8px",
                                    padding: cardImg ? "0 0 10px" : "14px 10px", textDecoration: "none", textAlign: "center",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                                    position: "relative", overflow: "hidden",
                                }}
                                className="pb-pokedex-tile"
                            >
                                {caught && (
                                    <div style={{
                                        position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%",
                                        background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700,
                                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
                                    }}>✓</div>
                                )}
                                {cardImg ? (
                                    // Own at least one print of this species -- show the actual card
                                    // art (in colour) instead of the generic silhouette-y sprite.
                                    <img
                                        src={cardImg}
                                        alt={p.name}
                                        loading="lazy"
                                        style={{ width: "100%", aspectRatio: "5/7", objectFit: "cover", display: "block" }}
                                    />
                                ) : (
                                    <img
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                                        alt={p.name}
                                        loading="lazy"
                                        style={{ width: "64px", height: "64px", objectFit: "contain", imageRendering: "auto" }}
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                                    />
                                )}
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginTop: cardImg ? "4px" : 0 }}>{p.name}</div>
                                <div style={{ fontSize: "11px", color: "#555" }}>#{String(p.id).padStart(3, "0")}</div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <style>{`
                .pb-pokedex-tile { transition: border-color 0.15s ease, transform 0.1s ease; }
                .pb-pokedex-tile:hover { border-color: #ff6b35 !important; transform: translateY(-2px); }
            `}</style>
        </div>
    );
}
