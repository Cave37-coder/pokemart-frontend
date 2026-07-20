export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getCards } from "@/lib/api";

const ERAS = [
  { label: "WotC", code: "B1", emoji: "🏆", desc: "1999-2003" },
  { label: "EX Era", code: "B2", emoji: "⚡", desc: "2003-2007" },
  { label: "D&P / HG&SS", code: "B3", emoji: "💎", desc: "2007-2011" },
  { label: "Black & White", code: "B4", emoji: "⚫", desc: "2011-2014" },
  { label: "XY Era", code: "B5", emoji: "🧬", desc: "2014-2016" },
  { label: "Sun & Moon", code: "B6", emoji: "☀️", desc: "2017-2019" },
  { label: "Sword & Shield", code: "B7", emoji: "⚔️", desc: "2020-2023" },
  { label: "Scarlet & Violet", code: "B8", emoji: "🔮", desc: "2023-2025" },
  { label: "Mega Evolution", code: "B9", emoji: "🌀", desc: "2025-Now" },
];

// The same rainbow already used on HR / ACE SPEC card badges (products/cards_page.tsx
// aceBorder gradient) — reused here as the site's connective foil-stripe signature.
const FOIL_STRIPE = ["#E24B4A", "#ff6b35", "#EF9F27", "#1D9E75", "#378ADD", "#7F77DD"];

// Google Maps "Search" URL format -- no API key required, opens the native
// Maps app on mobile or maps.google.com on desktop, centered on this query
// with directions one tap away.
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Sunkist+Village+11+Heliose+Street+Birchleigh+North+Kempton+Park";

function FoilStripe({ height = 3 }: { height?: number }) {
  return (
    <div style={{ display: "flex", height: `${height}px`, width: "100%" }}>
      {FOIL_STRIPE.map((c) => (
        <div key={c} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [featuredData, allData] = await Promise.all([
    getCards({ ordering: "-price", in_stock: "true", min_price: "0.01", page_size: "8" }),
    getCards({ in_stock: "true", min_price: "0.01" }),
  ]);
  const featured = featuredData.results.slice(0, 4);
  const totalCards = allData.count || 0;

  return (
    <div>
      <style>{`
        .pb-card { transition: border-color 0.2s ease, transform 0.2s ease; }
        .pb-card:hover { border-color: #ff6b35 !important; transform: translateY(-2px); }
        .pb-btn-primary { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .pb-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,53,0.25); }
        .pb-btn-outline { transition: border-color 0.15s ease, color 0.15s ease; }
        .pb-btn-outline:hover { border-color: #ff6b35; color: #ff6b35; }
        .pb-era-card { transition: border-color 0.2s ease, transform 0.2s ease; }
        .pb-era-card:hover { border-color: #ff6b35; transform: translateY(-2px); }
      `}</style>

      {/* HERO */}
      <div style={{ background:"linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)", padding:"80px 2rem", textAlign:"center", borderBottom:"1px solid #2a2a3a" }}>
        <img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height:"120px", width:"120px", objectFit:"contain", marginBottom:"16px" }} />
        <h1 style={{ fontSize:"clamp(32px, 6vw, 56px)", fontWeight:800, marginBottom:"16px", lineHeight:1.1 }}>
          South Africa&apos;s Premier Bulk<br />
          <span style={{ color:"#ff6b35" }}>Pokemon Card</span> Store
        </h1>
        <p style={{ color:"#a0a0b0", fontSize:"18px", maxWidth:"500px", margin:"0 auto 32px" }}>
          Straight outta Kempton Park — your laid-back Pokémon card community right here in Gauteng.
        </p>
        <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/cards" className="pb-btn-primary" style={{ background:"#ff6b35", color:"#fff", padding:"14px 32px", borderRadius:"12px", textDecoration:"none", fontSize:"16px", fontWeight:700, display:"inline-block" }}>
            Browse All Cards
          </Link>
          <Link href="/cards?supertype=Trainer&ordering=-card_set__release_date" className="pb-btn-outline" style={{ background:"transparent", color:"#fff", padding:"14px 32px", borderRadius:"12px", textDecoration:"none", fontSize:"16px", fontWeight:600, display:"inline-block", border:"1px solid #2a2a3a" }}>
            Shop Trainers
          </Link>
        </div>
      </div>

      <FoilStripe />

      {/* LIVE STATS */}
      <div style={{ background:"#12121a", borderBottom:"1px solid #2a2a3a", padding:"32px 2rem" }}>
        <div style={{ maxWidth:"900px", margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"20px", textAlign:"center" }}>
          {[
            { num: `${totalCards.toLocaleString()}+`, label:"Cards in stock" },
            { num: "80+", label:"Sets available" },
            { num: "ZAR", label:"Live pricing" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize:"clamp(24px, 5vw, 36px)", fontWeight:800, color:"#ff6b35" }}>{stat.num}</div>
              <div style={{ color:"#a0a0b0", fontSize:"14px", marginTop:"4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED CARDS */}
      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"60px 2rem 40px" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:"12px", marginBottom:"6px" }}>
          <h2 style={{ fontSize:"24px", fontWeight:700, margin:0 }}>🔥 Hottest Cards Right Now</h2>
        </div>
        <div style={{ width:"48px", marginBottom:"14px" }}><FoilStripe height={2} /></div>
        <p style={{ color:"#a0a0b0", marginBottom:"28px", fontSize:"14px" }}>Highest value cards currently in stock</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:"20px" }}>
          {featured.map((card) => (
            <div key={card.pb_id} className="pb-card" style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"16px", overflow:"hidden" }}>
              <Link href={`/cards/${card.id}`} style={{ textDecoration:"none" }}>
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block" }} />
                ) : (
                  <div style={{ width:"100%", aspectRatio:"3/4", background:"#12121a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"48px" }}>🃏</div>
                )}
                <div style={{ padding:"14px 16px 8px" }}>
                  <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"3px", color:"#fff" }}>{card.name}</div>
                  {card.name_japanese && <div style={{ color:"#555", fontSize:"11px", marginBottom:"6px" }}>{card.name_japanese}</div>}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"11px", color:"#555" }}>{card.card_set?.code} · {card.rarity?.replace(/_/g," ").toUpperCase()}</span>
                    <span style={{ color:"#ff6b35", fontWeight:700, fontSize:"15px" }}>R {parseFloat(card.price).toFixed(2)}</span>
                  </div>
                </div>
              </Link>
              <div style={{ padding:"0 16px 16px" }}>
                <button style={{ width:"100%", background:"#ff6b35", color:"#fff", border:"none", borderRadius:"8px", padding:"10px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                  Add to my Pile!
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:"32px" }}>
          <Link href="/cards?ordering=-price" className="pb-btn-outline" style={{ border:"1px solid #2a2a3a", color:"#a0a0b0", padding:"12px 28px", borderRadius:"10px", textDecoration:"none", fontSize:"14px" }}>
            View All Cards →
          </Link>
        </div>
      </div>

      {/* BROWSE BY ERA */}
      <div style={{ background:"#12121a", borderTop:"1px solid #2a2a3a", padding:"48px 2rem" }}>
        <div style={{ maxWidth:"1200px", margin:"0 auto" }}>
          <h2 style={{ fontSize:"24px", fontWeight:700, marginBottom:"6px" }}>Browse by Era</h2>
          <div style={{ width:"48px", marginBottom:"14px" }}><FoilStripe height={2} /></div>
          <p style={{ color:"#a0a0b0", fontSize:"14px", marginBottom:"28px" }}>From WotC classics to the latest Mega Evolution sets</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:"12px" }}>
            {ERAS.map((era) => (
              <Link key={era.code} href={`/cards?era=${era.code}`} className="pb-era-card" style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"12px", padding:"16px", textDecoration:"none", display:"block" }}>
                <div style={{ fontSize:"24px", marginBottom:"8px" }}>{era.emoji}</div>
                <div style={{ fontWeight:600, color:"#fff", fontSize:"14px", marginBottom:"3px" }}>{era.label}</div>
                <div style={{ color:"#555", fontSize:"12px" }}>{era.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* WHY POKEBULK */}
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"60px 2rem" }}>
        <h2 style={{ fontSize:"24px", fontWeight:700, marginBottom:"6px", textAlign:"center" }}>Why PokeBulk SA?</h2>
        <div style={{ width:"48px", margin:"0 auto 32px" }}><FoilStripe height={2} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:"20px" }}>
          {[
            { icon:"💰", title:"ZAR Pricing", desc:"All prices in South African Rand, updated nightly from live market data." },
            { icon:"🏠", title:"Local Pickup", desc:"Based in Birchleigh North, Kempton Park. Collection Mon-Sun, no shipping hassle." },
            { icon:"📦", title:"80+ Sets", desc:"From 1999 Base Set to the latest Mega Evolution — we have it all." },
            { icon:"⚡", title:"Live Stock", desc:"Stock and prices update automatically. What you see is what we have." },
          ].map((item) => (
            <div key={item.title} className="pb-card" style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"12px", padding:"20px" }}>
              <div style={{ fontSize:"28px", marginBottom:"10px" }}>{item.icon}</div>
              <div style={{ fontWeight:600, color:"#fff", marginBottom:"6px" }}>{item.title}</div>
              <div style={{ color:"#a0a0b0", fontSize:"13px", lineHeight:1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LOCAL PICKUP */}
      <div style={{ background:"#12121a", borderTop:"1px solid #2a2a3a", padding:"48px 2rem" }}>
        <div style={{ maxWidth:"700px", margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ fontSize:"22px", fontWeight:700, marginBottom:"12px" }}>Straight Outta Kempton Park!</h2>
          <p style={{ color:"#a0a0b0", lineHeight:1.7, marginBottom:"24px" }}>
            This is not some big corporate setup — run straight out of my garage, purely for the love of the game.
          </p>
          <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"12px", padding:"24px", textAlign:"left" }}>
            <strong style={{ color:"#ff6b35", fontSize:"15px" }}>📍 Local Pickup — Birchleigh North, Kempton Park</strong>
            <div style={{ color:"#a0a0b0", fontSize:"14px", marginTop:"10px", lineHeight:1.7 }}>
              Unit 4, Sunkist Village<br />
              11 Heliose Street, Birchleigh North<br />
              Kempton Park, 1618
            </div>
            <div style={{ color:"#a0a0b0", fontSize:"14px", marginTop:"14px", lineHeight:2 }}>
              Mon - Fri: 18:30 - 21:00<br />
              Saturday: 10:00 - 18:00<br />
              Sunday: 10:00 - 15:00<br />
              <span style={{ color:"#ff6b35" }}>Give us 24 hours notice to prep your cards!</span>
            </div>
            <div style={{ marginTop:"16px", display:"flex", gap:"12px", flexWrap:"wrap" }}>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ background:"#ff6b35", color:"#fff", padding:"8px 16px", borderRadius:"8px", textDecoration:"none", fontSize:"13px", fontWeight:600 }}>
                📍 Get Directions
              </a>
              <a href="tel:0744886919" style={{ background:"#1e1e2a", color:"#a0a0b0", padding:"8px 16px", borderRadius:"8px", textDecoration:"none", fontSize:"13px", border:"1px solid #2a2a3a" }}>
                📞 074 488 6919
              </a>
              <a href="mailto:enquiries@pokebulk.co.za" style={{ background:"#1e1e2a", color:"#a0a0b0", padding:"8px 16px", borderRadius:"8px", textDecoration:"none", fontSize:"13px", border:"1px solid #2a2a3a" }}>
                ✉️ enquiries@pokebulk.co.za
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
