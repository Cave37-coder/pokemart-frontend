# install_ga4_frontend_v2.ps1
# Run this from the ROOT of your pokemart-frontend repo (C:\Users\texca\pokemart-frontend)
# FIXES the character-encoding corruption from the previous script (emoji/dashes/dots
# were mangled because the old .ps1 file had no UTF-8 BOM). This script's file itself
# is saved with a UTF-8 BOM so PowerShell reads the special characters correctly.
# Rewrites ALL analytics files fresh, plus adds AddToPileButton.tsx (add_to_cart tracking).

Write-Host "Installing GA4 analytics files (encoding-fixed) into pokemart-frontend..." -ForegroundColor Cyan

$dest = "src\components\GoogleAnalytics.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
// src/app/components/GoogleAnalytics.tsx
// Loads the GA4 gtag.js script. Import and render this ONCE in your root layout.tsx.
"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = "G-1WVREDCTD1";

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\components\GoogleAnalytics.tsx" -ForegroundColor Green

$dest = "src\lib\analytics.ts"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
// src/lib/analytics.ts
// GA4 event helpers for the PokeBulk funnel: view_item -> add_to_cart -> begin_checkout -> purchase
// Call these from the relevant existing pages (see integration notes in chat).
// Docs: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

function sendEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export interface AnalyticsItem {
  item_id: string;       // pb_id or product id
  item_name: string;     // card name
  item_category?: string; // e.g. card_set code
  item_variant?: string;  // e.g. "Reverse Holo"
  price: number;
  quantity?: number;
}

// Fire when a product/card detail page loads
export function trackViewItem(item: AnalyticsItem) {
  sendEvent("view_item", {
    currency: "ZAR",
    value: item.price,
    items: [item],
  });
}

// Fire when a card listing page (Browse Cards / checklists) loads
export function trackViewItemList(items: AnalyticsItem[], listName: string) {
  sendEvent("view_item_list", {
    item_list_name: listName,
    items,
  });
}

// Fire on successful "Add to Cart" click
export function trackAddToCart(item: AnalyticsItem) {
  sendEvent("add_to_cart", {
    currency: "ZAR",
    value: item.price * (item.quantity ?? 1),
    items: [item],
  });
}

// Fire when the cart page loads / user starts checkout
export function trackBeginCheckout(items: AnalyticsItem[], totalValue: number) {
  sendEvent("begin_checkout", {
    currency: "ZAR",
    value: totalValue,
    items,
  });
}

// Fire when shipping method is selected (custom funnel step - helps isolate drop-off)
export function trackAddShippingInfo(items: AnalyticsItem[], totalValue: number, shippingTier: string) {
  sendEvent("add_shipping_info", {
    currency: "ZAR",
    value: totalValue,
    shipping_tier: shippingTier,
    items,
  });
}

// Fire on successful order confirmation (PayFast callback success / order created)
export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  totalValue: number,
  shippingCost: number
) {
  sendEvent("purchase", {
    transaction_id: transactionId,
    currency: "ZAR",
    value: totalValue,
    shipping: shippingCost,
    items,
  });
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\lib\analytics.ts" -ForegroundColor Green

$dest = "src\app\layout.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ProfileCompletionPopup from "@/components/ProfileCompletionPopup";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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
        <GoogleAnalytics />
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

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\layout.tsx" -ForegroundColor Green

$dest = "src\app\cards\[id]\page.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
import Link from "next/link";
import { notFound } from "next/navigation";
import axios from "axios";
import { getCard } from "@/lib/api";
import AddToPileButton from "./AddToPileButton";
import ViewItemTracker from "./ViewItemTracker";

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
      <ViewItemTracker
        item={{
          item_id: card.sku || String(card.id),
          item_name: card.name,
          item_category: card.card_set?.code,
          price: parseFloat(card.price),
        }}
      />

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

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\cards\[id]\page.tsx" -ForegroundColor Green

$dest = "src\app\cards\[id]\ViewItemTracker.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
// src/app/cards/[id]/ViewItemTracker.tsx
// Fires GA4 view_item once when a card detail page loads.
// Rendered from the (Server Component) card page — kept as its own tiny
// Client Component since Server Components can't call gtag directly.
"use client";

import { useEffect } from "react";
import { trackViewItem, AnalyticsItem } from "@/lib/analytics";

export default function ViewItemTracker({ item }: { item: AnalyticsItem }) {
  useEffect(() => {
    trackViewItem(item);
    // Only re-fire if the actual card changes, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id]);

  return null;
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\cards\[id]\ViewItemTracker.tsx" -ForegroundColor Green

$dest = "src\app\cards\[id]\AddToPileButton.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
'use client';
import { useState } from "react";
import { Card } from "@/lib/api";
import { trackAddToCart } from "@/lib/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export default function AddToPileButton({ card }: { card: Card }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const addToPile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cart/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: card.id, quantity: 1 }),
      });
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("pile-updated"));
        trackAddToCart({
          item_id: card.sku || String(card.id),
          item_name: card.name,
          item_category: card.card_set?.code,
          price: parseFloat(card.price),
          quantity: 1,
        });
        setTimeout(() => setAdded(false), 2000);
      }
    } catch (e) {
      console.error("Failed to add to pile", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={addToPile}
      disabled={!card.in_stock || loading}
      style={{
        width: "100%",
        background: added ? "#4ade80" : card.in_stock ? "#ff6b35" : "#2a2a3a",
        color: "#fff", border: "none", borderRadius: "12px",
        padding: "16px", fontSize: "16px", fontWeight: 700,
        cursor: card.in_stock ? "pointer" : "not-allowed",
        marginBottom: "20px", transition: "background 0.2s",
      }}
    >
      {added ? "Added to your Pile!" : loading ? "Adding..." : card.in_stock ? "Add to my Pile!" : "Out of Stock"}
    </button>
  );
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\cards\[id]\AddToPileButton.tsx" -ForegroundColor Green

$dest = "src\app\pile\page.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { trackBeginCheckout } from "@/lib/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface CartItem {
  id: number;
  quantity: number;
  subtotal: string;
  product: {
    id: number;
    name: string;
    price: string;
    stock: number;
    image_small_url: string;
    card_set: { code: string; name: string };
    rarity: string;
  } | null;
}

interface Cart {
  id: number;
  total: string;
  items: CartItem[];
}

export default function PilePage() {
  const [cart, setCart]       = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [removing, setRemoving] = useState<number | null>(null);

  const fetchCart = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Please sign in to view your pile."); setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setError("Please sign in to view your pile."); setLoading(false); return; }
      const data = await res.json();
      setCart(data);
    } catch { setError("Failed to load pile."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, []);

  const removeItem = async (itemId: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setRemoving(itemId);
    try {
      await fetch(`${API_URL}/api/cart/remove/${itemId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      window.dispatchEvent(new Event("pile-updated"));
      fetchCart();
    } finally { setRemoving(null); }
  };

  const handleCheckoutClick = () => {
    if (!cart) return;
    trackBeginCheckout(
      cart.items
        .filter((i) => i.product)
        .map((i) => ({
          item_id: String(i.product!.id),
          item_name: i.product!.name,
          item_category: i.product!.card_set?.code,
          price: parseFloat(i.product!.price),
          quantity: i.quantity,
        })),
      parseFloat(cart.total)
    );
  };

  if (loading) return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 1.5rem", color: "#a0a0b0", textAlign: "center" }}>
      Loading your pile...
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 1.5rem", textAlign: "center" }}>
      <div style={{ color: "#EF4444", marginBottom: 16 }}>{error}</div>
      <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none" }}>Sign in</Link>
    </div>
  );

  const items = cart?.items || [];
  const total = parseFloat(cart?.total || "0");

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 1.5rem" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>My Pile</h1>
        <p style={{ color: "#a0a0b0", fontSize: 14, margin: 0 }}>
          {items.length} {items.length === 1 ? "card" : "cards"}
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
          <div style={{ color: "#a0a0b0", marginBottom: 16 }}>Your pile is empty.</div>
          <Link href="/cards" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: 600 }}>Browse cards</Link>
        </div>
      ) : (
        <>
          {/* ITEMS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {items.map((item) => (
              <div key={item.id} style={{
                background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10,
                padding: "12px 16px", display: "flex", gap: 12, alignItems: "center",
              }}>
                {!item.product ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#a0a0b0", fontSize: 14, marginBottom: 2 }}>
                      This card is no longer available
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>
                      It was removed from our catalog. Please remove it from your pile.
                    </div>
                  </div>
                ) : (
                  <>
                    {item.product.image_small_url && (
                      <img src={item.product.image_small_url} alt={item.product.name}
                        style={{ width: 50, height: 70, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: 14, marginBottom: 2 }}>{item.product.name}</div>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                        {item.product.card_set?.name} · {item.product.rarity?.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: "#a0a0b0" }}>
                        Qty: {item.quantity} × R {parseFloat(item.product.price).toFixed(2)}
                      </div>
                    </div>
                  </>
                )}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: "#ff6b35", fontSize: 15, marginBottom: 6 }}>
                    R {parseFloat(item.subtotal).toFixed(2)}
                  </div>
                  <button onClick={() => removeItem(item.id)} disabled={removing === item.id}
                    style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#555", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                    {removing === item.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SUMMARY + CHECKOUT BUTTON */}
          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#a0a0b0" }}>Subtotal ({items.length} cards)</span>
              <span style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>R {total.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12, color: "#555" }}>
              <span>Shipping calculated at checkout</span>
            </div>

            <Link href="/checkout" onClick={handleCheckoutClick} style={{
              display: "block", width: "100%", background: "#ff6b35", color: "#fff",
              border: "none", borderRadius: 8, padding: "14px", fontSize: 15,
              fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none",
              boxSizing: "border-box",
            }}>
              Proceed to Checkout — R {total.toFixed(2)}
            </Link>

            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#555" }}>
              Secure payment via PayFast · Collection available
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\pile\page.tsx" -ForegroundColor Green

$dest = "src\app\orders\[id]\page.tsx"
[System.IO.Directory]::CreateDirectory((Split-Path $dest)) | Out-Null
$content = @'
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/analytics";

interface OrderTracking {
  id: number; status: string; status_display: string;
  note: string; waybill_number: string; created_at: string;
}
interface OrderItem {
  id: number;
  product: { id: number; name: string; image_small_url: string; card_set: { code: string; name: string } } | null;
  product_name: string; product_sku: string;
  quantity: number; price_at_purchase: string; subtotal: string;
}
interface Order {
  id: number; status: string; status_display: string; total_price: string;
  items: OrderItem[]; tracking: OrderTracking[];
  delivery_method: string; delivery_address_line1: string; delivery_address_line2: string;
  delivery_city: string; delivery_province: string; delivery_postal_code: string;
  waybill_number: string; courier_name: string; courier_tracking_url: string;
  customer_note: string; created_at: string;
}

const STEPS = [
  { key:"pending",   label:"Order received" },
  { key:"printed",   label:"Order printed" },
  { key:"packed",    label:"Order packed" },
  { key:"booked",    label:"Courier booked" },
  { key:"ready",     label:"Ready for collection" },
  { key:"collected", label:"Courier collected" },
  { key:"invoiced",  label:"Final invoice" },
];

const STATUS_COLOR: Record<string,string> = {
  pending:"#888", printed:"#3B82F6", packed:"#8B5CF6",
  booked:"#F59E0B", ready:"#10B981", collected:"#059669",
  invoiced:"#1D4ED8", cancelled:"#EF4444",
};

const EFT_DETAILS = {
  name: "Poke Bulk SA",
  bank: "Nedbank",
  type: "Current Account",
  acc: "1301474037",
  branch: "198765",
};

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-ZA", {
    day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

// Order states that represent a genuinely completed order (not a cancelled
// or still-pending-payment attempt) -- these are the ones GA4 should count
// as a purchase conversion.
const PURCHASE_CONFIRMATION_RESULTS = ["success", "collection", "eft"];

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const paymentResult = searchParams?.get("payment");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Please sign in."); setLoading(false); return; }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    fetch(`${API_URL}/api/orders/${id}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("Order not found"); return r.json(); })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Fires GA4 purchase exactly once per order, only on a genuine order
  // confirmation landing (not on every later visit to this same page to
  // check status). Guarded with sessionStorage so a page refresh right
  // after checkout doesn't double-count the same order.
  useEffect(() => {
    if (!order) return;
    if (!paymentResult || !PURCHASE_CONFIRMATION_RESULTS.includes(paymentResult)) return;

    const guardKey = `ga4_purchase_tracked_${order.id}`;
    if (sessionStorage.getItem(guardKey)) return;

    const itemsSubtotal = order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const total = parseFloat(order.total_price);
    const shippingCost = Math.max(0, total - itemsSubtotal);

    trackPurchase(
      String(order.id),
      order.items.map((item) => ({
        item_id: item.product?.id ? String(item.product.id) : item.product_sku,
        item_name: item.product?.name || item.product_name,
        item_category: item.product?.card_set?.code,
        price: parseFloat(item.price_at_purchase),
        quantity: item.quantity,
      })),
      total,
      shippingCost
    );

    sessionStorage.setItem(guardKey, "1");
  }, [order, paymentResult]);

  if (loading) return <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", color:"#a0a0b0", textAlign:"center" }}>Loading...</div>;
  if (error || !order) return (
    <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", textAlign:"center" }}>
      <div style={{ color:"#EF4444", marginBottom:16 }}>{error || "Order not found"}</div>
      <Link href="/orders" style={{ color:"#ff6b35", textDecoration:"none" }}>Back to orders</Link>
    </div>
  );

  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const trackingByStatus: Record<string, OrderTracking> = {};
  for (const t of order.tracking) { trackingByStatus[t.status] = t; }
  const col = STATUS_COLOR[order.status] || "#888";
  const card: React.CSSProperties = { background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:12, padding:"16px 20px", marginBottom:12 };

  return (
    <div style={{ maxWidth:680, margin:"40px auto", padding:"0 1.5rem" }}>
      <Link href="/orders" style={{ color:"#a0a0b0", fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", gap:4, marginBottom:20 }}>
        Back to orders
      </Link>

      {/* Payment result banners */}
      {paymentResult === "success" && (
        <div style={{ background:"#10B98122", border:"1px solid #10B98144", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Payment Successful!</div>
          <div style={{ color:"#10B981", fontWeight:600, marginBottom:4 }}>Your payment was received and confirmed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>We will start packing your order immediately.</div>
        </div>
      )}

      {paymentResult === "cancelled" && (
        <div style={{ background:"#EF444422", border:"1px solid #EF444444", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Payment Cancelled</div>
          <div style={{ color:"#EF4444", fontWeight:600, marginBottom:4 }}>Your payment was not completed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>Your order is on hold. Contact us if you need help.</div>
        </div>
      )}

      {paymentResult === "collection" && (
        <div style={{ background:"#10B98122", border:"1px solid #10B98144", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Order Confirmed!</div>
          <div style={{ color:"#10B981", fontWeight:600, marginBottom:4 }}>Your collection order is confirmed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>Pay cash when you collect at Birchleigh North. Please give us 24 hours notice!</div>
        </div>
      )}

      {paymentResult === "eft" && (
        <div style={{ background:"#F59E0B22", border:"1px solid #F59E0B44", borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#F59E0B", marginBottom:12, textAlign:"center" }}>Order Placed — Awaiting EFT Payment</div>
          <div style={{ color:"#a0a0b0", fontSize:13, marginBottom:14, textAlign:"center" }}>
            Please make your EFT payment using the details below. Use <strong style={{ color:"#fff" }}>Order #{order.id}</strong> as your reference.
          </div>
          <div style={{ background:"#12121a", borderRadius:8, padding:14 }}>
            {[
              ["Account Name", EFT_DETAILS.name],
              ["Bank", EFT_DETAILS.bank],
              ["Account Type", EFT_DETAILS.type],
              ["Account Number", EFT_DETAILS.acc],
              ["Branch Code", EFT_DETAILS.branch],
              ["Reference", `Order #${order.id}`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8 }}>
                <span style={{ color:"#a0a0b0" }}>{lbl}</span>
                <span style={{ color:"#fff", fontWeight: lbl === "Account Number" || lbl === "Reference" ? 700 : 400 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:12, color:"#a0a0b0", textAlign:"center" }}>
            Send proof of payment to <strong style={{ color:"#fff" }}>enquiries@pokebulk.co.za</strong>
          </div>
        </div>
      )}

      {/* Order header */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:4 }}>Order #{order.id}</div>
            <div style={{ fontSize:13, color:"#a0a0b0" }}>
              {fmt(order.created_at)} · {order.delivery_method === "courier" ? "Courier" : "Collection"}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <span style={{ background:col+"22", color:col, border:`1px solid ${col}44`, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600 }}>
              {order.status_display}
            </span>
            <div style={{ fontWeight:700, color:"#ff6b35", fontSize:18, marginTop:8 }}>R{parseFloat(order.total_price).toFixed(2)}</div>
          </div>
        </div>

        {order.waybill_number && (
          <div style={{ marginTop:14, padding:"10px 14px", background:"#12121a", borderRadius:8, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:"#555", marginBottom:2 }}>Waybill · {order.courier_name}</div>
              <div style={{ fontFamily:"monospace", fontSize:14, color:"#fff", fontWeight:600 }}>{order.waybill_number}</div>
            </div>
            {order.courier_tracking_url && (
              <a href={order.courier_tracking_url} target="_blank" rel="noopener noreferrer" style={{ color:"#ff6b35", fontSize:12, textDecoration:"none", border:"1px solid #ff6b3544", padding:"6px 12px", borderRadius:6 }}>
                Track shipment
              </a>
            )}
          </div>
        )}

        {order.delivery_address_line1 && (
          <div style={{ marginTop:12, fontSize:13, color:"#a0a0b0", lineHeight:1.6 }}>
            {order.delivery_address_line1}{order.delivery_address_line2 && `, ${order.delivery_address_line2}`},{" "}
            {order.delivery_city}, {order.delivery_province} {order.delivery_postal_code}
          </div>
        )}
      </div>

      {/* Progress */}
      {!isCancelled && (
        <div style={card}>
          <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Order progress</div>
          {STEPS.map((step, i) => {
            const isDone = i <= currentStepIndex;
            const isActive = i === currentStepIndex;
            const tracking = trackingByStatus[step.key];
            const isLast = i === STEPS.length - 1;
            return (
              <div key={step.key} style={{ display:"flex", gap:14 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:22, flexShrink:0 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                    background: isActive ? "#ff6b35" : isDone ? "#059669" : "#12121a",
                    border: isDone || isActive ? "none" : "1px solid #2a2a3a", fontSize:11 }}>
                    {isDone && !isActive && <span style={{ color:"#fff" }}>✓</span>}
                    {isActive && <span style={{ color:"#fff", fontSize:9 }}>●</span>}
                  </div>
                  {!isLast && <div style={{ width:1, flex:1, minHeight:18, background: isDone ? "#059669" : "#2a2a3a", margin:"3px 0" }} />}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : 20, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight: isActive ? 600 : 500, color: isDone ? "#fff" : "#555" }}>{step.label}</div>
                  {tracking && <div style={{ fontSize:12, color:"#555", marginTop:2 }}>{fmt(tracking.created_at)}</div>}
                  {tracking?.note && <div style={{ fontSize:13, color:"#a0a0b0", marginTop:4, lineHeight:1.5 }}>{tracking.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCancelled && (
        <div style={{ ...card, border:"1px solid #EF444444", background:"#EF444411" }}>
          <div style={{ color:"#EF4444", fontWeight:600, marginBottom:4 }}>Order cancelled</div>
          {trackingByStatus["cancelled"]?.note && <div style={{ color:"#a0a0b0", fontSize:13 }}>{trackingByStatus["cancelled"].note}</div>}
        </div>
      )}

      {/* Items */}
      <div style={card}>
        <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Items ({order.items.length})</div>
        {order.items.map(item => (
          <div key={item.id} style={{ display:"flex", gap:12, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #12121a" }}>
            <div style={{ width:40, height:56, borderRadius:6, overflow:"hidden", flexShrink:0, background:"#12121a" }}>
              {item.product?.image_small_url
                ? <img src={item.product.image_small_url} alt={item.product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🃏</div>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:"#fff", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {item.product?.name || item.product_name || "Item no longer available"}
              </div>
              <div style={{ fontSize:11, color:"#555" }}>{item.product?.card_set?.name} · x{item.quantity}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#ff6b35", flexShrink:0 }}>R{parseFloat(item.subtotal).toFixed(2)}</div>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, paddingTop:12, borderTop:"1px solid #2a2a3a" }}>
          <span style={{ color:"#a0a0b0", fontSize:14 }}>Total</span>
          <span style={{ fontWeight:700, color:"#ff6b35", fontSize:16 }}>R{parseFloat(order.total_price).toFixed(2)}</span>
        </div>
      </div>

      {order.customer_note && (
        <div style={{ ...card, fontSize:13, color:"#a0a0b0" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Your note</div>
          {order.customer_note}
        </div>
      )}
    </div>
  );
}

'@
Set-Content -LiteralPath $dest -Value $content -Encoding UTF8 -NoNewline
Write-Host "  Wrote src\app\orders\[id]\page.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "Done. Now run: npm run build" -ForegroundColor Cyan
Write-Host "If it passes, deploy with: vercel --prod" -ForegroundColor Cyan