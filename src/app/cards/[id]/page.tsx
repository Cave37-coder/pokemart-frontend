import Link from "next/link";
import { notFound } from "next/navigation";
import axios from "axios";
import { getCard } from "@/lib/api";
import AddToPileButton from "./AddToPileButton";

const TYPE_COLORS: Record<string, string> = {
  Fire: "#fb923c", Water: "#60a5fa", Grass: "#4ade80",
  Lightning: "#fbbf24", Psychic: "#c084fc", Fighting: "#f97316",
  Colorless: "#a0a0b0", Darkness: "#6b7280", Metal: "#94a3b8",
  Dragon: "#818cf8", Fairy: "#f9a8d4",
};

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsedId = parseInt(id);
  if (isNaN(parsedId)) {
    notFound();
  }

  let card;
  try {
    card = await getCard(parsedId);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      notFound();
    }
    // Anything else (network failure, 500 from Railway, timeout, etc.)
    // is a real error and should still surface as one.
    throw err;
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 2rem" }}>
      <Link href="/cards" style={{ color: "#a0a0b0", textDecoration: "none", fontSize: "14px", display: "inline-block", marginBottom: "24px" }}>
        Back to Cards
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        <div>
          {card.image_url ? (
            <img src={card.image_url} alt={card.name} style={{ width: "100%", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "3/4", background: "#1a1a24", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px" }}>🃏</div>
          )}
        </div>

        <div>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "#a0a0b0" }}>
              {card.rarity.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "4px" }}>{card.name}</h1>
          {card.name_japanese && (
            <div style={{ color: "#a0a0b0", fontSize: "18px", marginBottom: "16px" }}>{card.name_japanese}</div>
          )}

          {card.pokemon_types?.length > 0 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {card.pokemon_types.map((t) => (
                <span key={t.id} style={{
                  background: TYPE_COLORS[t.name] || "#a0a0b0",
                  color: "#000", padding: "4px 12px",
                  borderRadius: "99px", fontSize: "12px", fontWeight: 700,
                }}>{t.name}</span>
              ))}
            </div>
          )}

          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#ff6b35", marginBottom: "8px" }}>
              R {parseFloat(card.price).toFixed(2)}
            </div>
            {card.price_holo && parseFloat(card.price_holo) > 0 && (
              <div style={{ color: "#a0a0b0", fontSize: "13px" }}>Holo: R {parseFloat(card.price_holo).toFixed(2)}</div>
            )}
            {card.price_normal && parseFloat(card.price_normal) > 0 && (
              <div style={{ color: "#a0a0b0", fontSize: "13px" }}>Normal: R {parseFloat(card.price_normal).toFixed(2)}</div>
            )}
            <div style={{ marginTop: "12px", fontSize: "13px", color: card.in_stock ? "#4ade80" : "#f43f5e" }}>
              {card.in_stock ? `In Stock (${card.stock})` : "Out of Stock"}
            </div>
          </div>

          <AddToPileButton card={card} />

          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#a0a0b0", letterSpacing: "1px" }}>CARD INFO</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
              <div><span style={{ color: "#a0a0b0" }}>HP: </span><span style={{ fontWeight: 600 }}>{card.hp || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Artist: </span><span style={{ fontWeight: 600 }}>{card.artist || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Set: </span><span style={{ fontWeight: 600 }}>{card.card_set?.name || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Stage: </span><span style={{ fontWeight: 600 }}>{card.card_subtypes || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Weakness: </span><span style={{ fontWeight: 600 }}>{card.weakness_type ? `${card.weakness_type} ${card.weakness_value}` : "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Resistance: </span><span style={{ fontWeight: 600 }}>{card.resistance_type ? `${card.resistance_type} ${card.resistance_value}` : "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Retreat: </span><span style={{ fontWeight: 600 }}>{card.retreat_cost ?? "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>SKU: </span><span style={{ fontWeight: 600, fontSize: "11px" }}>{card.sku}</span></div>
            </div>
          </div>

          {card.ability_name && (
            <div style={{ background: "#1a1a24", border: "1px solid #c084fc", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ color: "#c084fc", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "4px" }}>{card.ability_type?.toUpperCase()}</div>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>{card.ability_name}</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{card.ability_text}</div>
            </div>
          )}

          {card.attack_1_name && (
            <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#a0a0b0", letterSpacing: "1px" }}>ATTACKS</h3>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700 }}>{card.attack_1_name}</span>
                  {card.attack_1_damage && <span style={{ color: "#ff6b35", fontWeight: 700 }}>{card.attack_1_damage}</span>}
                </div>
                {card.attack_1_text && <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{card.attack_1_text}</div>}
              </div>
              {card.attack_2_name && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700 }}>{card.attack_2_name}</span>
                    {card.attack_2_damage && <span style={{ color: "#ff6b35", fontWeight: 700 }}>{card.attack_2_damage}</span>}
                  </div>
                  {card.attack_2_text && <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{card.attack_2_text}</div>}
                </div>
              )}
            </div>
          )}

          {card.flavour_text && (
            <div style={{ padding: "16px", borderLeft: "3px solid #ff6b35", color: "#a0a0b0", fontSize: "13px", fontStyle: "italic", lineHeight: 1.6 }}>
              {card.flavour_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
