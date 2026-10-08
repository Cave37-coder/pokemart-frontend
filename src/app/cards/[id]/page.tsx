import { notFound } from "next/navigation";
import axios from "axios";
import { getCard } from "@/lib/api";
import AddToPileButton from "./AddToPileButton";
import ViewItemTracker from "./ViewItemTracker";
import BackButton from "./BackButton";
import WishlistHeartButton from "@/components/WishlistHeartButton";

const TYPE_COLORS: Record<string, string> = {
  Fire: "#fb923c", Water: "#60a5fa", Grass: "#4ade80",
  Lightning: "#fbbf24", Psychic: "#c084fc", Fighting: "#f97316",
  Colorless: "#a0a0b0", Darkness: "#6b7280", Metal: "#94a3b8",
  Dragon: "#818cf8", Fairy: "#f9a8d4",
};

// Energy cost as a row of coloured circles ("Grass,Grass,Colorless").
const ENERGY_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  Grass: { bg: "#4ade80", fg: "#052e16", label: "G" },
  Fire: { bg: "#fb923c", fg: "#431407", label: "R" },
  Water: { bg: "#60a5fa", fg: "#082f49", label: "W" },
  Lightning: { bg: "#fbbf24", fg: "#422006", label: "L" },
  Psychic: { bg: "#c084fc", fg: "#2e1065", label: "P" },
  Fighting: { bg: "#f97316", fg: "#431407", label: "F" },
  Darkness: { bg: "#4b5563", fg: "#f3f4f6", label: "D" },
  Metal: { bg: "#94a3b8", fg: "#0f172a", label: "M" },
  Dragon: { bg: "#818cf8", fg: "#1e1b4b", label: "N" },
  Fairy: { bg: "#f9a8d4", fg: "#500724", label: "Y" },
  Colorless: { bg: "#d1d5db", fg: "#111827", label: "C" },
};

function EnergyCost({ cost }: { cost?: string }) {
  const types = (cost || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!types.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: "3px", marginRight: "8px", verticalAlign: "middle" }}>
      {types.map((t, i) => {
        const s = ENERGY_STYLE[t] || { bg: "#d1d5db", fg: "#111827", label: t[0] || "?" };
        return (
          <span
            key={i}
            title={t}
            style={{
              width: "20px", height: "20px", borderRadius: "50%", background: s.bg, color: s.fg,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", fontWeight: 800, border: "1px solid rgba(0,0,0,0.35)",
            }}
          >
            {s.label}
          </span>
        );
      })}
    </span>
  );
}

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
      <ViewItemTracker
        item={{
          item_id: card.sku || String(card.id),
          item_name: card.name,
          item_category: card.card_set?.code,
          price: parseFloat(card.price),
        }}
      />

      <BackButton fallbackHref="/cards" style={{ marginBottom: "24px" }} />

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
          {card.card_set && (
            <div style={{ color: "#a0a0b0", fontSize: "14px", marginBottom: card.name_japanese ? "4px" : "16px" }}>
              {card.card_set.name}
              {card.card_set.era?.name ? ` · ${card.card_set.era.name}` : ""}
              {(card.number || card.card_number) ? ` · #${card.number || card.card_number}` : ""}
            </div>
          )}
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
          <WishlistHeartButton productId={card.id} variant="inline" />

          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", marginBottom: "16px", marginTop: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#a0a0b0", letterSpacing: "1px" }}>CARD INFO</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
              <div><span style={{ color: "#a0a0b0" }}>HP: </span><span style={{ fontWeight: 600 }}>{card.hp || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Artist: </span><span style={{ fontWeight: 600 }}>{card.artist || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Set: </span><span style={{ fontWeight: 600 }}>{card.card_set?.name || "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Stage: </span><span style={{ fontWeight: 600 }}>{card.stage || card.card_subtypes || "-"}</span></div>
              {card.evolves_from && (
                <div><span style={{ color: "#a0a0b0" }}>Evolves from: </span><span style={{ fontWeight: 600 }}>{card.evolves_from}</span></div>
              )}
              {card.evolves_to && (
                <div><span style={{ color: "#a0a0b0" }}>Evolves to: </span><span style={{ fontWeight: 600 }}>{card.evolves_to}</span></div>
              )}
              {card.card_level && (
                <div><span style={{ color: "#a0a0b0" }}>Level: </span><span style={{ fontWeight: 600 }}>{card.card_level}</span></div>
              )}
              <div><span style={{ color: "#a0a0b0" }}>Weakness: </span><span style={{ fontWeight: 600 }}>{card.weakness_type ? `${card.weakness_type} ${card.weakness_value}` : "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Resistance: </span><span style={{ fontWeight: 600 }}>{card.resistance_type ? `${card.resistance_type} ${card.resistance_value}` : "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>Retreat: </span><span style={{ fontWeight: 600 }}>{card.retreat_cost ?? "-"}</span></div>
              <div><span style={{ color: "#a0a0b0" }}>SKU: </span><span style={{ fontWeight: 600, fontSize: "11px" }}>{card.sku}</span></div>
            </div>
          </div>

          {card.ancient_trait && (
            <div style={{ background: "#1a1a24", border: "1px solid #f59e0b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "4px" }}>ANCIENT TRAIT</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{card.ancient_trait}</div>
            </div>
          )}

          {[
            { name: card.ability_name, type: card.ability_type, text: card.ability_text },
            { name: card.ability_2_name, type: card.ability_2_type, text: card.ability_2_text },
          ].filter((a) => a.name).map((a, i) => (
            <div key={`ab${i}`} style={{ background: "#1a1a24", border: "1px solid #c084fc", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ color: "#c084fc", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "4px" }}>{(a.type || "Ability").toUpperCase()}</div>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>{a.name}</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{a.text}</div>
            </div>
          ))}

          {card.attack_1_name && (
            <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#a0a0b0", letterSpacing: "1px" }}>ATTACKS</h3>
              {[
                { name: card.attack_1_name, damage: card.attack_1_damage, text: card.attack_1_text, cost: card.attack_1_cost },
                { name: card.attack_2_name, damage: card.attack_2_damage, text: card.attack_2_text, cost: card.attack_2_cost },
                { name: card.attack_3_name, damage: card.attack_3_damage, text: card.attack_3_text, cost: card.attack_3_cost },
              ].filter((a) => a.name).map((a, i, arr) => (
                <div key={`atk${i}`} style={{ marginBottom: i < arr.length - 1 ? "12px" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span><EnergyCost cost={a.cost} /><span style={{ fontWeight: 700 }}>{a.name}</span></span>
                    {a.damage && <span style={{ color: "#ff6b35", fontWeight: 700 }}>{a.damage}</span>}
                  </div>
                  {a.text && <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{a.text}</div>}
                </div>
              ))}
            </div>
          )}

          {card.rules_text && (
            <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "4px" }}>RULES</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: 1.5 }}>{card.rules_text}</div>
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
