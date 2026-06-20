// v1.0.0 — About Page
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

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚡</div>
          <h1 style={{ color: "#fff", fontSize: "32px", fontWeight: 800, margin: "0 0 12px 0" }}>
            Welcome to Poke Bulk SA
          </h1>
          <p style={{ color: "#a0a0b0", fontSize: "16px", lineHeight: "1.7", maxWidth: "560px", margin: "0 auto 24px" }}>
            South Africa&apos;s #1 stop for affordable Pokémon singles — from bulk Commons to shining Holos, proudly based in Kempton Park, Gauteng.
          </p>
          <Link href="/cards" style={{
            display: "inline-block", background: "#ff6b35", color: "#fff",
            padding: "12px 28px", borderRadius: "10px", textDecoration: "none",
            fontWeight: 700, fontSize: "15px",
          }}>
            Browse Cards →
          </Link>
        </div>

        {/* About Me */}
        <div style={s.section}>
          <div style={s.tag}>About Us</div>
          <h2 style={s.h2}>Built by a Collector, for Collectors</h2>
          <p style={s.p}>
            I&apos;m just a passionate Pokémon fan running this operation out of my garage — because I love the game!
            This isn&apos;t a big company — it&apos;s a labour of love I juggle alongside my day job.
          </p>
          <p style={s.p}>
            Poke Bulk SA started as a way to help collectors complete their sets without breaking the bank,
            and it&apos;s grown into something pretty special thanks to the community.
            When I&apos;m not at work, I&apos;m sorting stacks of cards, restocking the site, and chatting with fellow trainers.
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            Whether you&apos;re chasing that last Reverse Holo to finish a binder page or just love flipping through stacks —
            you&apos;re in the right place. 😄
          </p>
        </div>

        {/* Gengar Games */}
        <div style={s.section}>
          <div style={s.tag}>Partnership</div>
          <h2 style={s.h2}>Poke Bulk SA × Gengar Games 🎉</h2>
          <p style={s.p}>
            We&apos;ve teamed up with <strong style={{ color: "#fff" }}>Gengar Games</strong> to make your collecting journey even better!
            You&apos;ll find links between our stores — visit Gengar Games for premium TCG products, sealed items, and collector essentials,
            then come back here for your bulk singles and binder fillers.
          </p>
          <p style={{ ...s.p, margin: 0 }}>
            Two communities, one shared goal: helping collectors complete their collections!
          </p>
          <a
            href="https://www.gengargames.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", marginTop: "16px",
              border: "1px solid #2a2a3a", color: "#a0a0b0",
              padding: "10px 20px", borderRadius: "8px", textDecoration: "none",
              fontSize: "14px", fontWeight: 600,
            }}
          >
            Visit Gengar Games →
          </a>
        </div>

        {/* What We Sell */}
        <div style={s.section}>
          <div style={s.tag}>Our Stock</div>
          <h2 style={s.h2}>What You&apos;ll Find Here</h2>
          <p style={s.p}>
            We stock singles from across the <strong style={{ color: "#fff" }}>Scarlet &amp; Violet</strong> and{" "}
            <strong style={{ color: "#fff" }}>Sword &amp; Shield</strong> eras, with more sets added all the time:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
            {[
              ["🟢", "Commons & Uncommons"],
              ["🔵", "Reverse Holos"],
              ["✨", "Holofoils"],
              ["🔴", "V's & EX's"],
              ["⚪", "Poké Ball Variants"],
              ["⚫", "Master Ball Variants"],
            ].map(([icon, label]) => (
              <div key={label} style={{
                background: "#1a1a2e", border: "1px solid #2a2a3a",
                borderRadius: "8px", padding: "12px 16px",
                color: "#a0a0b0", fontSize: "14px",
              }}>
                {icon} {label}
              </div>
            ))}
          </div>
        </div>

        {/* Got Bulk CTA */}
        <div style={{
          background: "#1a1a2e", border: "1px solid #ff6b3540",
          borderRadius: "12px", padding: "28px", textAlign: "center",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>💰</div>
          <h2 style={{ ...s.h2, textAlign: "center" }}>Got Cards to Sell?</h2>
          <p style={{ ...s.p, textAlign: "center", maxWidth: "480px", margin: "0 auto 20px" }}>
            We buy bulk Pokémon cards from collectors across South Africa — Commons, Holos, Reverse Holos, and more.
            Fair prices, fast payouts, friendly service.
          </p>
          <Link href="/sell" style={{
            display: "inline-block", background: "#ff6b35", color: "#fff",
            padding: "12px 28px", borderRadius: "10px", textDecoration: "none",
            fontWeight: 700, fontSize: "15px",
          }}>
            See Our Buying Rates →
          </Link>
        </div>

        {/* Thank You */}
        <div style={{ textAlign: "center", marginTop: "48px", paddingBottom: "40px" }}>
          <p style={{ color: "#555", fontSize: "14px", lineHeight: "1.7" }}>
            Every visit, every trade, and every order keeps this community running strong.<br />
            Thanks for being part of the Poke Bulk SA family. Happy collecting! ⚡
          </p>
        </div>

      </div>
    </div>
  );
}
