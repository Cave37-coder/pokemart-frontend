import Link from "next/link";
import { GENERATIONS } from "@/lib/pokedex";

// Same generation-tab structure as the Pokedex's own GenTabs (2026-09-29,
// Michael: "work off the pokedex structure") but deliberately a SEPARATE,
// simpler component rather than adding modes to GenTabs itself -- GenTabs is
// wired to usePokedexCollection for its "2 of 184" caught counters and
// hardcodes href="/pokedex?gen=...", neither of which apply here (this
// picker has no ownership concept of its own -- it just routes to a
// specific species' Single Collection page) and Michael was explicit: "I
// want the pokedex left like it is". A plain server component is enough --
// no per-customer data to fetch, so no "use client" needed.
export default function CollectionsGenTabs({ activeGenCode }: { activeGenCode: string }) {
    return (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "20px" }}>
            {GENERATIONS.map(gen => {
                const active = gen.code === activeGenCode;
                return (
                    <Link
                        key={gen.code}
                        href={`/collections?gen=${gen.code}`}
                        style={{
                            display: "flex", alignItems: "center",
                            background: active ? "#ff6b35" : "#1a1a24",
                            border: `1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
                            color: "#fff", padding: "6px 14px", borderRadius: "6px",
                            textDecoration: "none", fontSize: "13px", fontWeight: 500,
                        }}
                    >
                        {gen.label}
                    </Link>
                );
            })}
        </div>
    );
}
