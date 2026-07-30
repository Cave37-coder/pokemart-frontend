"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/api";

// The same rainbow already used on HR / ACE SPEC card badges (products/cards_page.tsx
// aceBorder gradient) — reused here as the site's connective foil-stripe signature.
const FOIL_STRIPE = ["#E24B4A", "#ff6b35", "#EF9F27", "#1D9E75", "#378ADD", "#7F77DD"];

function FoilUnderline() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: "-9px", height: "2px", display: "flex" }}>
      {FOIL_STRIPE.map((c) => (
        <div key={c} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

function NavGlow() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 380px 90px at 8% 50%, rgba(127,119,221,0.60) 0%, transparent 75%), " +
          "radial-gradient(ellipse 280px 70px at 95% 50%, rgba(255,107,53,0.28) 0%, transparent 70%)",
      }}
    />
  );
}

export default function NavBar() {
  const [user, setUser] = useState<string | null>(null);
  const [pileCount, setPileCount] = useState(0);
  const pathname = usePathname();

  const fetchPileCount = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setPileCount(0); return; }
    try {
      const res = await authFetch("/api/cart/");
      if (res.ok) {
        const data = await res.json();
        setPileCount(data.items?.length || 0);
      }
    } catch {
      // Session expired or request failed -- just show 0, the Pile page
      // itself will explain what's going on if they click through.
      setPileCount(0);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)?.username || null); } catch {}
    }
    fetchPileCount();
    window.addEventListener("pile-updated", fetchPileCount);
    return () => window.removeEventListener("pile-updated", fetchPileCount);
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setPileCount(0);
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/cards", label: "Browse Cards" },
    { href: "/bundles", label: "Bundles" },
    { href: "/checklists", label: "Checklists" },
    { href: "/decklist", label: "Deck Builder", beta: true },
    { href: "/sell", label: "Sell Cards" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav style={{
      background: "#12121a", borderBottom: "1px solid #2a2a3a",
      padding: "0 2rem", height: "64px", display: "flex",
      alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <NavGlow />
      <style>{`
        .pb-nav-link { position: relative; transition: color 0.15s ease; }
        .pb-nav-link:hover { color: #fff !important; }
        .pb-nav-signout { transition: border-color 0.15s ease, color 0.15s ease; }
        .pb-nav-signout:hover { border-color: #ff6b35; color: #fff; }
        .pb-nav-signin { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .pb-nav-signin:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(255,107,53,0.3); }
      `}</style>

      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", position: "relative", zIndex: 1 }}>
        <img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height: "48px", width: "48px", objectFit: "contain" }} />
        <span style={{ fontWeight: 700, fontSize: "18px", color: "#fff" }}>PokeBulk</span>
        <span style={{ color: "#ff6b35", fontWeight: 700, fontSize: "18px" }}>SA</span>
      </Link>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", position: "relative", zIndex: 1 }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="pb-nav-link"
            style={{
              color: isActive(link.href) ? "#fff" : "#a0a0b0",
              textDecoration: "none", fontSize: "14px",
              display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            {link.label}
            {link.beta && (
              <span style={{
                background: "#ff6b3520", color: "#ff6b35", fontSize: "9px", fontWeight: 700,
                padding: "1px 5px", borderRadius: "4px", letterSpacing: "0.03em",
              }}>BETA</span>
            )}
            {isActive(link.href) && <FoilUnderline />}
          </Link>
        ))}

        {user && (
          <Link href="/orders" className="pb-nav-link" style={{ color: isActive("/orders") ? "#fff" : "#a0a0b0", textDecoration: "none", fontSize: "14px", position: "relative" }}>
            My Orders
            {isActive("/orders") && <FoilUnderline />}
          </Link>
        )}

        <Link href="/pile" className="pb-nav-link" style={{ display: "flex", alignItems: "center", gap: "6px", color: isActive("/pile") ? "#fff" : "#a0a0b0", textDecoration: "none", fontSize: "14px", position: "relative" }}>
          My Pile
          {pileCount > 0 && (
            <span style={{
              background: "#ff6b35", color: "#fff", fontSize: "10px", fontWeight: 700,
              borderRadius: "10px", padding: "1px 6px", minWidth: "18px", textAlign: "center",
            }}>{pileCount}</span>
          )}
          {isActive("/pile") && <FoilUnderline />}
        </Link>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/profile" className="pb-nav-link" style={{ color: "#a0a0b0", textDecoration: "none", fontSize: "13px" }}>
              🎴 {user}
            </Link>
            <button onClick={logout} className="pb-nav-signout" style={{
              background: "transparent", border: "1px solid #2a2a3a", color: "#a0a0b0",
              padding: "7px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
            }}>Sign Out</button>
          </div>
        ) : (
          <Link href="/auth/login" className="pb-nav-signin" style={{
            background: "#ff6b35", color: "#fff", padding: "8px 16px",
            borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600,
            display: "inline-block",
          }}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}
