import Link from "next/link";
import PokedexGrid from "@/components/PokedexGrid";
import { GENERATIONS, getAllSpecies } from "@/lib/pokedex";

export default async function PokedexPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const params = await searchParams;
    const activeGenCode = params.gen || "1";
    const activeGen = GENERATIONS.find(g => g.code === activeGenCode) || GENERATIONS[0];

    const allSpecies = await getAllSpecies();
    const genPokemon = allSpecies.filter(p => p.id >= activeGen.start && p.id <= activeGen.end);

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 1.5rem" }}>
            <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Pokédex</div>
                <div style={{ fontSize: "13px", color: "#a0a0b0" }}>
                    Browse by Pokémon — pick one to see every card of it we carry.
                </div>
            </div>

            {/* Gen tabs -- server-rendered links, same pattern as the era tabs on /cards */}
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "20px" }}>
                {GENERATIONS.map(gen => {
                    const active = gen.code === activeGen.code;
                    return (
                        <Link
                            key={gen.code}
                            href={`/pokedex?gen=${gen.code}`}
                            style={{
                                display: "block", background: active ? "#ff6b35" : "#1a1a24",
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

            <PokedexGrid pokemon={genPokemon} />
        </div>
    );
}
