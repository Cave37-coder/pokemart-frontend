"use client";
import { useState } from "react";
import Link from "next/link";

interface PokedexEntry { id: number; name: string }

export default function PokedexGrid({ pokemon }: { pokemon: PokedexEntry[] }) {
    const [search, setSearch] = useState("");

    const filtered = search.trim()
        ? pokemon.filter(p =>
            p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            String(p.id).includes(search.trim())
        )
        : pokemon;

    return (
        <div>
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
                            href={`/pokedex/${p.id}`}
                            style={{
                                background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px",
                                padding: "14px 10px", textDecoration: "none", textAlign: "center",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                            }}
                            className="pb-pokedex-tile"
                        >
                            <img
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                                alt={p.name}
                                loading="lazy"
                                style={{ width: "64px", height: "64px", objectFit: "contain", imageRendering: "auto" }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                            />
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{p.name}</div>
                            <div style={{ fontSize: "11px", color: "#555" }}>#{String(p.id).padStart(3, "0")}</div>
                        </Link>
                    ))}
                </div>
            )}

            <style>{`
                .pb-pokedex-tile { transition: border-color 0.15s ease, transform 0.1s ease; }
                .pb-pokedex-tile:hover { border-color: #ff6b35 !important; transform: translateY(-2px); }
            `}</style>
        </div>
    );
}
