"use client";
import { useEffect, useRef, useState } from "react";
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
  const [isStaff, setIsStaff] = useState(false);
  const [pileCount, setPileCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
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

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setUnreadCount(0); return; }
    try {
      const res = await authFetch("/api/community/conversations/");
      if (res.ok) {
        const data = await res.json();
        const total = (data.conversations || []).reduce((sum: number, c: { unread_count: number }) => sum + (c.unread_count || 0), 0);
        setUnreadCount(total);
      }
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed?.username || null);
        setIsStaff(!!(parsed?.is_staff || parsed?.is_superuser));
      } catch {}
    }
    fetchPileCount();
    fetchUnreadCount();
    window.addEventListener("pile-updated", fetchPileCount);
    window.addEventListener("messages-updated", fetchUnreadCount);
    // Cheap polling so the badge doesn't only ever update on an explicit
    // event -- a new DM someone else sent won't fire any local event.
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => {
      window.removeEventListener("pile-updated", fetchPileCount);
      window.removeEventListener("messages-updated", fetchUnreadCount);
      clearInterval(interval);
    };
  }, []);

  // Close the mobile dropdown and the desktop "More" menu whenever the
  // route changes -- otherwise they stay open and cover the new page.
  useEffect(() => { setMenuOpen(false); setMoreOpen(false); }, [pathname]);

  // Close the "More" dropdown on an outside click (desktop only -- on
  // mobile its contents render flattened into the hamburger list instead
  // of as a floating panel, see the .pb-more-menu mobile override below).
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setIsStaff(false);
    setPileCount(0);
    window.location.href = "/";
  };

  // Split into the links people use every visit (always inline) and the
  // rest (grouped under "More" on desktop -- 2026-08-17, Michael: "the nav
  // bar is crowded, how can I declutter"). On mobile everything still
  // shows flattened in the hamburger list, see .pb-more-menu below.
  const primaryLinks = [
    { href: "/cards", label: "Browse Cards" },
    { href: "/pokedex", label: "Pokédex" },
    { href: "/community", label: "Community" },
    { href: "/decklist", label: "Deck Builder", beta: true },
  ];

  const moreLinks = [
    { href: "/checklists", label: "Checklists" },
    { href: "/accessories", label: "Accessories" },
    { href: "/bundles", label: "Bundles" },
    { href: "/sell", label: "Sell Cards" },
    // External site (separate Railway app) -- community-run scammer lookup,
    // not part of this codebase. Opens in a new tab since it's a different
    // domain (2026-08-17, Michael: "add to pokebulk.co.za, even add a page
    // or link, whichever is easiest and cleanest").
    { href: "https://safety.pokebulk.co.za", label: "Scam Check", external: true },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const renderLink = (link: { href: string; label: string; beta?: boolean; external?: boolean }) =>
    link.external ? (
      <a
        key={link.href}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="pb-nav-link"
        style={{
          color: "#a0a0b0",
          textDecoration: "none", fontSize: "14px",
          display: "flex", alignItems: "center", gap: "5px",
        }}
      >
        🛡️ {link.label}
      </a>
    ) : (
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
        {isActive(link.href) && <span className="pb-nav-underline"><FoilUnderline /></span>}
      </Link>
    );

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
        .pb-nav-hamburger { display: none; }

        /* Below this width the link row no longer fits -- collapse it into
           a hamburger-triggered dropdown instead of letting it overflow and
           drag the whole page into horizontal scroll (the bug this whole
           block exists to fix). */
        @media (max-width: 900px) {
          nav { padding: 0 1rem !important; }
          .pb-nav-hamburger { display: flex !important; }
          .pb-nav-links {
            /* !important here too, same reason as position below: this div
               also carries an inline style={{ display: 'flex' }} for the
               desktop layout, and inline styles beat a plain class rule --
               without !important the closed state never actually hides the
               menu, it just sits there permanently visible. */
            display: none !important;
            /* !important on position/left/right/width is load-bearing here:
               the element also carries an inline style={{ position: 'relative' }}
               (needed for desktop layout), and inline styles always beat a
               plain class rule -- without !important this whole block gets
               ignored and the "dropdown" ends up sized/positioned like a
               normal inline flex item instead of spanning the viewport. */
            position: fixed !important;
            top: 64px !important; left: 0 !important; right: 0 !important;
            width: 100% !important;
            max-height: calc(100vh - 64px);
            overflow-y: auto;
            background: #12121a;
            border-bottom: 1px solid #2a2a3a;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0 !important;
            padding: 8px 0 16px !important;
            box-shadow: 0 12px 24px rgba(0,0,0,0.4);
          }
          .pb-nav-links.pb-nav-open { display: flex !important; }
          .pb-nav-links a, .pb-nav-links button {
            width: 100%;
            box-sizing: border-box;
            padding: 13px 20px !important;
            border-radius: 0 !important;
            border: none !important;
            justify-content: flex-start !important;
          }
          .pb-nav-links .pb-nav-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0 !important;
            width: 100%;
          }
          .pb-nav-links .pb-nav-signin { display: block !important; text-align: center; margin: 8px 20px; width: calc(100% - 40px); }
          .pb-nav-links .pb-nav-underline { display: none; }

          /* The "More" dropdown only makes sense on desktop (hover/click a
             floating panel). On mobile the hamburger list already stacks
             everything full-width, so instead of nesting a dropdown inside
             a dropdown, hide the toggle button and force the panel to
             always render, flattened into the same list as everything
             else -- it just becomes more rows in the hamburger menu. */
          .pb-nav-links .pb-more-btn { display: none !important; }
          .pb-nav-links .pb-more-menu {
            display: flex !important;
            position: static !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            min-width: 0 !important;
            width: 100%;
          }
        }
      `}</style>

      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", position: "relative", zIndex: 1 }}>
        <img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height: "48px", width: "48px", objectFit: "contain" }} />
        <span style={{ fontWeight: 700, fontSize: "18px", color: "#fff" }}>PokeBulk</span>
        <span style={{ color: "#ff6b35", fontWeight: 700, fontSize: "18px" }}>SA</span>
      </Link>

      <button
        className="pb-nav-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        style={{
          background: "transparent", border: "1px solid #2a2a3a", borderRadius: "8px",
          width: "40px", height: "40px", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "20px", cursor: "pointer", position: "relative", zIndex: 2,
        }}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Tap-anywhere-outside-to-close backdrop. Mobile only (the hamburger
          itself is display:none above 900px, so menuOpen never becomes true
          on desktop and this never renders there). */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, top: "64px", background: "rgba(0,0,0,0.5)", zIndex: 0 }}
        />
      )}

      <div className={`pb-nav-links${menuOpen ? " pb-nav-open" : ""}`} style={{ display: "flex", gap: "1.5rem", alignItems: "center", position: "relative", zIndex: 1 }}>
        {primaryLinks.map(renderLink)}

        <div className="pb-more" ref={moreRef} style={{ position: "relative" }}>
          <button
            className="pb-nav-link pb-more-btn"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            style={{
              background: "transparent", border: "none", cursor: "pointer", font: "inherit",
              color: moreLinks.some((l) => isActive(l.href)) || moreOpen ? "#fff" : "#a0a0b0",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "4px", padding: 0,
            }}
          >
            More {moreOpen ? "▲" : "▾"}
          </button>
          <div className={`pb-more-menu${moreOpen ? " pb-more-menu-open" : ""}`} style={{
            display: moreOpen ? "flex" : "none",
            position: "absolute", top: "calc(100% + 14px)", right: 0,
            background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "10px",
            padding: "8px", flexDirection: "column", minWidth: "180px", gap: "2px",
            boxShadow: "0 12px 24px rgba(0,0,0,0.4)", zIndex: 50,
          }}>
            {moreLinks.map(renderLink)}
          </div>
        </div>

        {user && (
          <Link href="/orders" className="pb-nav-link" style={{ color: isActive("/orders") ? "#fff" : "#a0a0b0", textDecoration: "none", fontSize: "14px", position: "relative" }}>
            My Orders
            {isActive("/orders") && <span className="pb-nav-underline"><FoilUnderline /></span>}
          </Link>
        )}

        {isStaff && (
          <Link href="/staff/orders" className="pb-nav-link" style={{ color: isActive("/staff/orders") ? "#fff" : "#a0a0b0", textDecoration: "none", fontSize: "14px", position: "relative" }}>
            🛠 Staff
            {isActive("/staff/orders") && <span className="pb-nav-underline"><FoilUnderline /></span>}
          </Link>
        )}

        {user && (
          <Link href="/messages" className="pb-nav-link" style={{ display: "flex", alignItems: "center", gap: "6px", color: isActive("/messages") ? "#fff" : "#a0a0b0", textDecoration: "none", fontSize: "14px", position: "relative" }}>
            Messages
            {unreadCount > 0 && (
              <span style={{
                background: "#ff6b35", color: "#fff", fontSize: "10px", fontWeight: 700,
                borderRadius: "10px", padding: "1px 6px", minWidth: "18px", textAlign: "center",
              }}>{unreadCount}</span>
            )}
            {isActive("/messages") && <span className="pb-nav-underline"><FoilUnderline /></span>}
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
          {isActive("/pile") && <span className="pb-nav-underline"><FoilUnderline /></span>}
        </Link>

        {user ? (
          <div className="pb-nav-row" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
