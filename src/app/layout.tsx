import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ProfileCompletionPopup from "@/components/ProfileCompletionPopup";

export const metadata: Metadata = {
  title: "PokeBulk SA - Premium Pokemon Cards",
  description: "South Africa's premier Pokemon card store - Straight outta Kempton Park",
};

// The same rainbow already used on HR / ACE SPEC card badges (products/cards_page.tsx
// aceBorder gradient) — reused here as the site's connective foil-stripe signature.
const FOIL_STRIPE = ["#E24B4A", "#ff6b35", "#EF9F27", "#1D9E75", "#378ADD", "#7F77DD"];

// Google Maps "Search" URL format -- no API key required, opens the native
// Maps app on mobile or maps.google.com on desktop, centered on this query
// with directions one tap away.
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Sunkist+Village+11+Heliose+Street+Birchleigh+North+Kempton+Park";

function FoilStripe() {
  return (
    <div style={{ display: "flex", height: "3px", width: "100%" }}>
      {FOIL_STRIPE.map((c) => (
        <div key={c} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {/* TEMPORARY (2026-06-21) -- remove this line + the import above
            once the 2-week "complete your profile" campaign ends. See
            components/ProfileCompletionPopup.tsx for the removal note. */}
        <ProfileCompletionPopup />
        <main>{children}</main>
        <FoilStripe />
        <footer style={{ background:"#12121a", borderTop:"1px solid #2a2a3a", padding:"40px 2rem", marginTop:"0" }}>
          <div style={{ maxWidth:"1200px", margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"32px" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:"16px", marginBottom:"8px" }}>⚡ PokeBulk SA</div>
              <div style={{ color:"#a0a0b0", fontSize:"13px", lineHeight:1.7 }}>
                Straight outta Kempton Park.<br />Run with love for the game.
              </div>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"12px", color:"#fff" }}>Local Pickup</div>
              <div style={{ color:"#a0a0b0", fontSize:"13px", lineHeight:1.8 }}>
                Unit 4, Sunkist Village<br />11 Heliose Street<br />Birchleigh North<br />Kempton Park, 1618<br />
                Mon-Fri: 18:30-21:00<br />Sat: 10:00-18:00<br />Sun: 10:00-15:00
              </div>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color:"#ff6b35", fontSize:"13px", textDecoration:"none", display:"inline-block", marginTop:"10px", fontWeight:600 }}
              >
                📍 Get Directions →
              </a>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"12px", color:"#fff" }}>Contact</div>
              <div style={{ color:"#a0a0b0", fontSize:"13px", lineHeight:1.8 }}>
                Tel: 074 488 6919<br />enquiries@pokebulk.co.za
              </div>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"12px", color:"#fff" }}>Browse</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {["WotC Base Era","Scarlet & Violet Era","Sword & Shield Era","Sun & Moon Era","XY Era"].map((era) => (
                  <a key={era} href="/cards" style={{ color:"#a0a0b0", textDecoration:"none", fontSize:"13px" }}>{era}</a>
                ))}
              </div>
            </div>
          </div>
          <div style={{ maxWidth:"1200px", margin:"20px auto 0", paddingTop:"20px", borderTop:"1px solid #2a2a3a", color:"#a0a0b0", fontSize:"12px", textAlign:"center" }}>
            2026 PokeBulk SA. All rights reserved. Partnered with Gengar Games.
          </div>
        </footer>
      </body>
    </html>
  );
}
