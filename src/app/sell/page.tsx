// v1.1.0 — Updated buying rates
import Link from "next/link";

const s = {
  section: {
    background: "#16161f", border: "1px solid #2a2a3a",
    borderRadius: "12px", padding: "32px", marginBottom: "24px",
  } as React.CSSProperties,
  tag: {
    display: "inline-block", background: "#ff6b3520", color: "#ff6b35",
    fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.08em", padding: "4px 10px", borderRadius: "6px",
    marginBottom: "12px",
  },
  h2: { color: "#fff", fontSize: "20px", fontWeight: 700, margin: "0 0 12px 0" },
  p: { color: "#a0a0b0", fontSize: "15px", lineHeight: "1.7", margin: "0 0 12px 0" },
};

const rates = [
  { icon: "🟢", type: "Commons", desc: "Regular non-holo cards", rate: "R0.40 each" },
  { icon: "🔵", type: "Holos & Reverse Holos", desc: "Shiny or reflective cards", rate: "R1.00 each" },
  { icon: "🟣", type: "Holo Energies", desc: "Energy cards with holofoil design", rate: "R2.00 each" },
  { icon: "⚪", type: "Poké Ball Variants", desc: "Poké Ball pattern Reverse Holos", rate: "R3.00 each" },
  { icon: "⚫", type: "Master Ball Variants", desc: "Master Ball pattern Reverse Holos", rate: "R7.00 each" },
  { icon: "🔴", type: "EX's & V's", desc: "Standard EX or V cards", rate: "75% of TCG Market Price" },
];

const steps = [
  { n: "1", title: "Sort (if you want)", desc: "Separate by type if possible — Commons / Holos / EX's. Or don't, we can handle it." },
  { n: "2", title: "Contact Us First", desc: "Send us a message via the contact page or WhatsApp before sending anything — we'll confirm whether we're currently buying and how much we can take in." },
  { n: "3", title: "Get a Quote", desc: "We'll confirm current rates and how many cards we can take in right now." },
  { n: "4", title: "Send or Drop Off", desc: "Ship via PostNet or Pudo, or drop off locally in Kempton Park." },
  { n: "5", title: "Get Paid", desc: "Choose cash (EFT) or Site Credit — credit gives you even better trade value!" },
];

export default function SellPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
          <h1 style={{ color: "#fff", fontSize: "32px", fontWeight: 800, margin: "0 0 12px 0" }}>
            We Buy Your Bulk Pokémon Cards!
          </h1>
          <p style={{ color: "#a0a0b0", fontSize: "16px", lineHeight: "1.7", maxWidth: "560px", margin: "0 auto 24px" }}>
            Got stacks of cards taking up space? We&apos;ll turn them into cash or site credit —
            fair prices, fast payouts, friendly service.
          </p>
          {/* Cash flow notice */}
          <div style={{
            display: "inline-block", background: "#1a1a2e", border: "1px solid #4444aa60",
            borderRadius: "10px", padding: "14px 20px", maxWidth: "520px",
            textAlign: "left",
          }}>
            <p style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
              <strong style={{ color: "#fff" }}>⚠️ Please Note:</strong> Our ability to buy bulk cards depends on
              current cash flow and storage availability. We may not always be able to purchase immediately —
              please <strong style={{ color: "#fff" }}>contact us first</strong> before sending any cards to confirm
              we&apos;re currently buying.
            </p>
          </div>
        </div>

        {/* Rates Table */}
        <div style={s.section}>
          <div style={s.tag}>Buying Rates</div>
          <h2 style={s.h2}>What We Pay — Per Card</h2>
          <p style={s.p}>
            These are the prices <strong style={{ color: "#fff" }}>we pay YOU</strong> when you sell us your cards:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rates.map((r) => (
              <div key={r.type} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#1a1a2e", border: "1px solid #2a2a3a",
                borderRadius: "8px", padding: "14px 18px", gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <span style={{ fontSize: "20px" }}>{r.icon}</span>
                  <div>
                    <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{r.type}</div>
                    <div style={{ color: "#555", fontSize: "12px" }}>{r.desc}</div>
                  </div>
                </div>
                <div style={{
                  color: "#ff6b35", fontWeight: 700, fontSize: "14px",
                  whiteSpace: "nowrap", textAlign: "right",
                }}>{r.rate}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: "16px", background: "#2a1a1a", border: "1px solid #ff444430",
            borderRadius: "8px", padding: "12px 16px",
            color: "#ff6b6b", fontSize: "13px",
          }}>
            ❌ We don&apos;t buy <strong>Hits</strong> or special art cards that fall outside the main set numbering
            (e.g. card numbered 123/90 or 210/165 — these are Secret Rares, not standard singles).
          </div>
        </div>

        {/* Lazy Section — VERY CLEAR */}
        <div style={{
          ...s.section,
          border: "1px solid #ff6b3540",
          background: "#1a1510",
        }}>
          <div style={s.tag}>Too Lazy to Sort?</div>
          <h2 style={s.h2}>Sell Us a Full Box — No Sorting Needed 📦</h2>

          {/* Big clear disclaimer */}
          <div style={{
            background: "#2a1a0a", border: "1px solid #ff6b3560",
            borderRadius: "10px", padding: "16px 20px", marginBottom: "20px",
          }}>
            <p style={{ color: "#ff6b35", fontWeight: 700, fontSize: "14px", margin: "0 0 6px 0" }}>
              ⚠️ Important — Please Read Before Contacting Us
            </p>
            <p style={{ color: "#a0a0b0", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
              This section is about <strong style={{ color: "#fff" }}>YOU selling YOUR cards TO US</strong>.
              We are <strong style={{ color: "#fff" }}>not</strong> selling ETBs (Elite Trainer Boxes) or bulk boxes of cards <strong style={{ color: "#fff" }}>to you</strong>.
              If you want to buy cards from us, head to the{" "}
              <Link href="/cards" style={{ color: "#ff6b35" }}>Browse Cards</Link> page.
            </p>
          </div>

          <p style={s.p}>
            Don&apos;t want to count or sort every single card? No problem — just box them up and we&apos;ll do the rest.
            Here&apos;s how our flat-rate buy-in works when <strong style={{ color: "#fff" }}>you sell us</strong> a full box:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "8px 0 0 0" }}>
            <div style={{
              background: "#1a1a2e", border: "1px solid #2a2a3a",
              borderRadius: "10px", padding: "20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>💼</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}>R200</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>
                We pay <strong style={{ color: "#fff" }}>you R200</strong> for an ETB-sized box<br />
                filled with <strong style={{ color: "#fff" }}>Commons</strong>
              </div>
            </div>
            <div style={{
              background: "#1a1a2e", border: "1px solid #2a2a3a",
              borderRadius: "10px", padding: "20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>💼</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}>R350</div>
              <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>
                We pay <strong style={{ color: "#fff" }}>you R350</strong> for an ETB-sized box<br />
                filled with <strong style={{ color: "#fff" }}>Holos or Reverse Holos</strong>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div style={s.section}>
          <div style={s.tag}>How It Works</div>
          <h2 style={s.h2}>5 Simple Steps to Sell Your Cards</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {steps.map((step) => (
              <div key={step.n} style={{
                display: "flex", gap: "16px", alignItems: "flex-start",
                background: "#1a1a2e", border: "1px solid #2a2a3a",
                borderRadius: "8px", padding: "16px",
              }}>
                <div style={{
                  width: "32px", height: "32px", minWidth: "32px",
                  background: "#ff6b35", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "14px",
                }}>{step.n}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{step.title}</div>
                  <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Sell */}
        <div style={s.section}>
          <div style={s.tag}>Why Us</div>
          <h2 style={s.h2}>Why Sell to Poke Bulk SA?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              ["✅", "Fair pricing", "No lowball offers, no hidden deductions — what we quote is what you get."],
              ["✅", "Fast payouts", "Once we've checked the cards, you get paid. No waiting around."],
              ["✅", "Friendly service", "You're dealing directly with a fellow collector who gets it."],
              ["✅", "Community impact", "Every card you sell helps another trainer complete their set!"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{
                display: "flex", gap: "12px",
                background: "#1a1a2e", border: "1px solid #2a2a3a",
                borderRadius: "8px", padding: "14px 16px",
              }}>
                <span style={{ fontSize: "16px" }}>{icon}</span>
                <div>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{title} — </span>
                  <span style={{ color: "#a0a0b0", fontSize: "14px" }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div style={s.section}>
          <div style={s.tag}>Tips</div>
          <h2 style={s.h2}>Get the Most Value From Your Bulk</h2>
          <ul style={{ color: "#a0a0b0", fontSize: "14px", lineHeight: "2", paddingLeft: "20px", margin: 0 }}>
            <li>Keep cards in good condition — no creases or heavy bends.</li>
            <li>Don&apos;t mix Pokémon with Trainer or Energy cards unless specified.</li>
            <li>Label your boxes if you can — Commons / Holos / Mix.</li>
            <li>Ask us first before sending rare promos or unique variants — some are worth more individually!</li>
          </ul>
        </div>

        {/* Site Credit */}
        <div style={{
          ...s.section,
          background: "#1a1a2e", border: "1px solid #4444aa40",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>🧾</div>
          <h2 style={{ ...s.h2, textAlign: "center" }}>Prefer Site Credit?</h2>
          <p style={{ ...s.p, textAlign: "center", maxWidth: "480px", margin: "0 auto 0" }}>
            Instead of cash, choose <strong style={{ color: "#fff" }}>Site Credit</strong> — you&apos;ll often get even better value.
            Use it anytime on Poke Bulk SA to grab the cards you actually need.
            Perfect for smaller bundles or partial trades.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "40px", paddingBottom: "40px" }}>
          <p style={{ color: "#a0a0b0", fontSize: "15px", marginBottom: "20px" }}>
            Ready to sell? Get in touch and let&apos;s make a deal!
          </p>
          <Link href="/contact" style={{
            display: "inline-block", background: "#ff6b35", color: "#fff",
            padding: "14px 32px", borderRadius: "10px", textDecoration: "none",
            fontWeight: 700, fontSize: "15px", marginRight: "12px",
          }}>
            Contact Us →
          </Link>
          <Link href="/cards" style={{
            display: "inline-block", border: "1px solid #2a2a3a", color: "#a0a0b0",
            padding: "14px 32px", borderRadius: "10px", textDecoration: "none",
            fontWeight: 600, fontSize: "15px",
          }}>
            Browse Cards Instead
          </Link>
        </div>

      </div>
    </div>
  );
}
