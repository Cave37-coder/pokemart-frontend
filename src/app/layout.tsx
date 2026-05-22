import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "PokeBulk SA - Premium Pokemon Cards",
  description: "South Africa's premier Pokemon card store - Straight outta Kempton Park",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main>{children}</main>
        <footer style={{ background:"#12121a", borderTop:"1px solid #2a2a3a", padding:"40px 2rem", marginTop:"60px" }}>
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
                4 Heliose Street<br />Birchleigh North<br />Kempton Park, 1618<br />
                Mon-Fri: 18:30-21:00<br />Sat: 10:00-18:00<br />Sun: 10:00-15:00
              </div>
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
