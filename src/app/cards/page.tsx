import Link from "next/link";
import { getCards } from "@/lib/api";

const ERAS = [
  { label: "All Cards", value: "" },
  { label: "WotC Base Era", value: "B1" },
  { label: "EX Era", value: "B2" },
  { label: "Diamond & Pearl Era", value: "B3" },
  { label: "Black & White Era", value: "B4" },
  { label: "XY Era", value: "B5" },
  { label: "Sun & Moon Era", value: "B6" },
  { label: "Sword & Shield Era", value: "B7" },
  { label: "Scarlet & Violet Era", value: "B8" },
];

const TYPES = [
  "Grass", "Fire", "Water", "Lightning", "Psychic",
  "Fighting", "Darkness", "Metal", "Dragon", "Colorless",
];

const TRAINER_TYPES = [
  "Trainer", "Supporter", "Stadium", "Item", "Tool",
  "Special Energy", "Ace Spec",
];

const RARITIES = [
  { value: "", label: "All Rarities" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "holo_rare", label: "Holo Rare" },
  { value: "ultra_rare", label: "Ultra Rare" },
  { value: "secret_rare", label: "Secret Rare" },
  { value: "legendary", label: "Legendary" },
];

const SORT_OPTIONS = [
  { value: "", label: "None" },
  { value: "price", label: "Price (low to high)" },
  { value: "-price", label: "Price (high to low)" },
  { value: "-created_at", label: "Date (newest first)" },
];

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const data = await getCards({
    ...(params.search && { search: params.search }),
    ...(params.rarity && { rarity: params.rarity }),
    ...(params.ordering && { ordering: params.ordering }),
    ...(params.page && { page: params.page }),
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 2rem" }}>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", borderBottom: "1px solid #2a2a3a", paddingBottom: "16px" }}>
        {ERAS.map((era) => (
          <Link key={era.label} href={`/cards?era=${era.value}`} style={{
            background: params.era === era.value ? "#ff6b35" : "#1a1a24",
            border: "1px solid #2a2a3a", color: "#fff",
            padding: "6px 14px", borderRadius: "6px",
            textDecoration: "none", fontSize: "13px", fontWeight: 500,
          }}>{era.label}</Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        {TYPES.map((type) => (
          <Link key={type} href={`/cards?type=${type}`} style={{
            background: params.type === type ? "#ff6b35" : "#1a1a24",
            border: "1px solid #2a2a3a",
            color: params.type === type ? "#fff" : "#a0a0b0",
            padding: "4px 12px", borderRadius: "6px",
            textDecoration: "none", fontSize: "12px",
          }}>{type}</Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {TRAINER_TYPES.map((type) => (
          <Link key={type} href={`/cards?type=${type}`} style={{
            background: params.type === type ? "#4facfe" : "#1a1a24",
            border: "1px solid #2a2a3a",
            color: params.type === type ? "#fff" : "#a0a0b0",
            padding: "4px 12px", borderRadius: "6px",
            textDecoration: "none", fontSize: "12px",
          }}>{type}</Link>
        ))}
      </div>

      <form method="GET" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Text search..."
          style={{
            background: "#1a1a24", border: "1px solid #2a2a3a",
            borderRadius: "6px", padding: "8px 14px", color: "#fff",
            fontSize: "13px", flex: 1, minWidth: "200px",
          }}
        />
        <select name="rarity" defaultValue={params.rarity} style={{
          background: "#1a1a24", border: "1px solid #2a2a3a",
          borderRadius: "6px", padding: "8px 14px", color: "#fff", fontSize: "13px",
        }}>
          {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select name="ordering" defaultValue={params.ordering} style={{
          background: "#1a1a24", border: "1px solid #2a2a3a",
          borderRadius: "6px", padding: "8px 14px", color: "#fff", fontSize: "13px",
        }}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="submit" style={{
          background: "#ff6b35", color: "#fff", border: "none",
          borderRadius: "6px", padding: "8px 20px", fontSize: "13px",
          fontWeight: 600, cursor: "pointer",
        }}>Search</button>
      </form>

      <p style={{ color: "#a0a0b0", fontSize: "13px", marginBottom: "20px" }}>
        {data.count} cards available
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
        {data.results.map((card) => (
          <div key={card.pb_id} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px", overflow: "hidden" }}>
            <Link href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
              {card.image_url ? (
                <img src={card.image_url} alt={card.name} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "3/4", background: "#12121a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>🃏</div>
              )}
              <div style={{ padding: "10px" }}>
                <div style={{ fontSize: "11px", color: "#fff", marginBottom: "4px", lineHeight: 1.3 }}>
                  {card.card_set ? card.card_set.code : ""} - {card.card_number ? String(card.card_number).padStart(3, "0") : ""} - {card.name} - {card.rarity.replace("_", " ").toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, color: "#ff6b35", fontSize: "14px" }}>
                  R {parseFloat(card.price).toFixed(2)}
                </div>
              </div>
            </Link>
            <div style={{ padding: "0 10px 10px" }}>
              <button style={{
                width: "100%", background: card.in_stock ? "#ff6b35" : "#2a2a3a",
                color: "#fff", border: "none", borderRadius: "6px",
                padding: "7px", fontSize: "12px", fontWeight: 600,
                cursor: card.in_stock ? "pointer" : "not-allowed",
              }}>
                {card.in_stock ? "Add to my Pile!" : "Out of Stock"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px", flexWrap: "wrap" }}>
        {data.previous && (
          <Link href={`/cards?page=${(parseInt(params.page || "1") - 1)}`} style={{
            background: "#1a1a24", border: "1px solid #2a2a3a", color: "#fff",
            padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px",
          }}>Previous</Link>
        )}
        <span style={{ color: "#a0a0b0", padding: "8px 16px", fontSize: "13px" }}>
          Page {params.page || 1}
        </span>
        {data.next && (
          <Link href={`/cards?page=${(parseInt(params.page || "1") + 1)}`} style={{
            background: "#ff6b35", color: "#fff",
            padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: 600,
          }}>Next</Link>
        )}
      </div>

      <div style={{ marginTop: "40px", padding: "20px", background: "#1a1a24", borderRadius: "8px", border: "1px solid #2a2a3a", fontSize: "13px", color: "#a0a0b0" }}>
        <strong style={{ color: "#fff" }}>Local Pickup Available</strong> - Birchleigh North, Kempton Park<br />
        Mon-Fri: 18:30-21:00 | Sat: 10:00-18:00 | Sun: 10:00-15:00<br />
        Give us 24 hours notice to prep your cards!
      </div>
    </div>
  );
}
