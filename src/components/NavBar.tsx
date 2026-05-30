"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NavBar() {
  const [user, setUser] = useState<string | null>(null);
  const [pileCount, setPileCount] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

  const fetchPileCount = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setPileCount(0); return; }
    try {
      const res = await fetch(`${API_URL}/api/cart/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPileCount(data.items?.length || 0);
      }
    } catch {}
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)?.username || null); } catch {}
    }
    fetchPileCount();

    // Listen for pile updates
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

  return (
    <nav style={{
      background:"#12121a", borderBottom:"1px solid #2a2a3a",
      padding:"0 2rem", height:"64px", display:"flex",
      alignItems:"center", justifyContent:"space-between",
      position:"sticky", top:0, zIndex:100,
    }}>
      <Link href="/" style={{ display:"flex", alignItems:"center", gap:"10px", textDecoration:"none" }}>
        <img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height:"48px", width:"48px", objectFit:"contain" }} />
        <span style={{ fontWeight:700, fontSize:"18px", color:"#fff" }}>PokeBulk</span>
        <span style={{ color:"#ff6b35", fontWeight:700, fontSize:"18px" }}>SA</span>
      </Link>

      <div style={{ display:"flex", gap:"1.5rem", alignItems:"center" }}>
              <Link href="/cards" style={{ color: "#a0a0b0", textDecoration: "none", fontSize: "14px" }}>Browse Cards</Link>
              <Link href="/bundles" style={{ color: "#a0a0b0", textDecoration: "none", fontSize: "14px" }}>Bundles</Link>

        {user && (
          <Link href="/orders" style={{ color:"#a0a0b0", textDecoration:"none", fontSize:"14px" }}>My Orders</Link>
        )}

        <Link href="/pile" style={{ display:"flex", alignItems:"center", gap:"6px", color:"#a0a0b0", textDecoration:"none", fontSize:"14px", position:"relative" }}>
          My Pile
          {pileCount > 0 && (
            <span style={{
              background:"#ff6b35", color:"#fff", fontSize:"10px", fontWeight:700,
              borderRadius:"10px", padding:"1px 6px", minWidth:"18px", textAlign:"center",
            }}>{pileCount}</span>
          )}
        </Link>

        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <span style={{ color:"#a0a0b0", fontSize:"13px" }}>?? {user}</span>
            <button onClick={logout} style={{
              background:"transparent", border:"1px solid #2a2a3a", color:"#a0a0b0",
              padding:"7px 14px", borderRadius:"8px", fontSize:"13px", cursor:"pointer",
            }}>Sign Out</button>
          </div>
        ) : (
          <Link href="/auth/login" style={{
            background:"#ff6b35", color:"#fff", padding:"8px 16px",
            borderRadius:"8px", textDecoration:"none", fontSize:"14px", fontWeight:600,
          }}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}

