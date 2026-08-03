"use client";
import Link from "next/link";
import { GENERATIONS } from "@/lib/pokedex";
import { usePokedexCollection } from "@/lib/usePokedexCollection";

interface PokedexEntry { id: number; name: string }

// Michael, 2026-08-04: "Can we add a progress counter on each Gen box '2 of
// 184'" -- each tab now shows how many of that generation's species are
// caught vs. its total. Needs to be a client component (unlike the plain
// server-rendered Link tabs this replaces) since "caught" only exists for a
// logged-in customer's collection, fetched client-side by
// usePokedexCollection -- same hook /pokedex and /pokedex/[id] already use.
export default function GenTabs({ activeGenCode, allSpecies }: { activeGenCode: string; allSpecies: PokedexEntry[] }) {
    const { loggedIn, loading, caughtNumbers } = usePokedexCollection();

    return (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "20px" }}>
            {GENERATIONS.map(gen => {
                const active = gen.code === activeGenCode;
                const genSpecies = allSpecies.filter(p => p.id >= gen.start && p.id <= gen.end);
                const total = genSpecies.length;
                const caught = loggedIn ? genSpecies.filter(p => caughtNumbers.has(p.id)).length : 0;
                return (
                    <Link
                        key={gen.code}
                        href={`/pokedex?gen=${gen.code}`}
                        style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                            background: active ? "#ff6b35" : "#1a1a24",
                            border: `1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
                            color: "#fff", padding: "6px 14px", borderRadius: "6px",
                            textDecoration: "none", fontSize: "13px", fontWeight: 500,
                        }}
                    >
                        <span>{gen.label}</span>
                        {loggedIn && !loading && total > 0 && (
                            <span style={{
                                fontSize: "10px", fontWeight: 700,
                                color: active ? "rgba(255,255,255,0.85)" : "#a0a0b0",
                            }}>
                                {caught} of {total}
                            </span>
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
