import CollectionsPickerGrid from "@/components/CollectionsPickerGrid";
import CollectionsGenTabs from "@/components/CollectionsGenTabs";
import { GENERATIONS, getAllSpecies } from "@/lib/pokedex";

// "My Collections" (2026-09-29, Michael: "Single pokemon collections must
// be seperate page, but work off the pokedex structure, where you can
// select the pokemon, but that selection is moved to a page, where it can
// be tracked on its own"). Structurally mirrors /pokedex (gen tabs + a
// species grid) since that's the picker pattern Michael asked to reuse, but
// every tile here routes into this feature's OWN per-species page
// (/collections/[id]) with its own separate tracking -- see
// useSingleCollection's header comment for the storage split from the real
// Pokedex.
export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const params = await searchParams;
    const activeGenCode = params.gen || "1";
    const activeGen = GENERATIONS.find(g => g.code === activeGenCode) || GENERATIONS[0];

    const allSpecies = await getAllSpecies();
    const genPokemon = allSpecies.filter(p => p.id >= activeGen.start && p.id <= activeGen.end);

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 1.5rem" }}>
            <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>My Collections</div>
                <div style={{ fontSize: "13px", color: "#a0a0b0" }}>
                    Track one Pokémon at a time, start to finish — separate from your Pokédex.
                </div>
            </div>

            <CollectionsGenTabs activeGenCode={activeGen.code} />

            <CollectionsPickerGrid pokemon={genPokemon} allPokemon={allSpecies} />
        </div>
    );
}
