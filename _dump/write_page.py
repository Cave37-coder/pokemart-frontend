content = """import Link from "next/link";
import { getCards } from "@/lib/api";

export default async function HomePage() {
  const data = await getCards({ ordering: "-created_at", rarity: "holo_rare" });
  const featured = data.results.slice(0, 4);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)", padding: "80px 2rem", textAlign: "center", borderBottom: "1px solid #2a2a3a" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚡🃏🔥</div>
        <h1 style={{ fontSize: "48px", fontWeight: 800, marginBottom: "16px", lineHeight: 1.1 }}>
          South Africa&apos;s Premier<br />
          <span style={{ color: "#ff6b35" }}>Pokemon Card</span> Store
        </h1>
        <p style={{ color: "#a0a0b0", fontSize: "18px", maxWidth: "500px", margin: "0 auto 32px" }}>
          Straight outta Kempton Park - your laid-back Pokemon card community right here in Gauteng.
        </p>
        <Link href="/cards" style={{ background: "#ff6b35", color: "#fff", padding: "14px 32px", borderRadius: "12px", textDecoration: "none", fontSize: "16px", fontWeight: 700, display: "inline-block" }}>
          Browse All Cards
        </Link>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 2rem" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Featured Holos</h2>
        <p style={{ color: "#a0a0b0", marginBottom: "32px" }}>Most valuable cards in stock</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {featured.map((card) => (
            <div key={card.pb_id} style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "16px", overflow: "hidden" }}>
              <Link href={`/cards/${card.id}`} style={{ textDecoration: "none" }}>
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "3/4", background: "#12121a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🃏</div>
                )}
                <div style={{ padding: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px", color: "#fff" }}>{card.name}</div>
                  {card.name_japanese && <div style={{ color: "#a0a0b0", fontSize: "12px", marginBottom: "8px" }}>{card.name_japanese}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#a0a0b0" }}>{card.rarity.replace("_", " ").toUpperCase()}</span>
                    <span style={{ color: "#ff6b35", fontWeight: 700 }}>R {parseFloat(card.price).toFixed(2)}</span>
                  </div>
                </div>
              </Link>
              <div style={{ padding: "0 16px 16px" }}>
                <button style={{ width: "100%", background: "#ff6b35", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Add to my Pile!
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link href="/cards" style={{ border: "1px solid #2a2a3a", color: "#fff", padding: "12px 28px", borderRadius: "10px", textDecoration: "none", fontSize: "14px" }}>
            View All Cards
          </Link>
        </div>
      </div>

      <div style={{ background: "#12121a", borderTop: "1px solid #2a2a3a", padding: "40px 2rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", textAlign: "center" }}>
          {[{ num: "1,070+", label: "Cards in stock" }, { num: "11", label: "Sets available" }, { num: "ZAR", label: "Live pricing" }].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#ff6b35" }}>{stat.num}</div>
              <div style={{ color: "#a0a0b0", fontSize: "14px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>Straight Outta Kempton Park!</h2>
        <p style={{ color: "#a0a0b0", lineHeight: 1.7, marginBottom: "20px" }}>
          This is not some big corporate setup - it is run straight out of my garage, purely for the love of the game.
        </p>
        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px", textAlign: "left" }}>
          <strong style={{ color: "#ff6b35" }}>Local Pickup - Birchleigh North, Kempton Park</strong>
          <div style={{ color: "#a0a0b0", fontSize: "14px", marginTop: "8px", lineHeight: 1.8 }}>
            Mon - Fri: 18:30 - 21:00<br />
            Saturday: 10:00 - 18:00<br />
            Sunday: 10:00 - 15:00<br />
            Give us 24 hours notice to prep your cards!
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")