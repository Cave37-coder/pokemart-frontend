import PokedexGrid from "@/components/PokedexGrid";
import GenTabs from "@/components/GenTabs";
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

            <GenTabs activeGenCode={activeGen.code} allSpecies={allSpecies} />

            <PokedexGrid pokemon={genPokemon} allPokemon={allSpecies} />
        </div>
    );
}
