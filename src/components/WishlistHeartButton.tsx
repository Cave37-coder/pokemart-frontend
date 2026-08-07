"use client";
import { useSyncExternalStore } from "react";
import { subscribeWishlist, getWishlistIds, toggleWishlist } from "@/lib/wishlistStore";

const EMPTY = new Set<number>();

function HeartIcon({ on, size, dim }: { on: boolean; size: number; dim: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
            <path
                d="M12 21s-7.4-4.6-9.9-9C.4 8.6 1.9 5 5.4 5c2 0 3.4 1.1 4.2 2.3.4.6.7 1.2 1 1.7.3-.5.6-1.1 1-1.7.8-1.2 2.2-2.3 4.2-2.3 3.5 0 5 3.6 3.3 7-2.5 4.4-9.9 9-9.9 9Z"
                fill={on ? (dim ? "#fff" : "#ff6b35") : "none"}
                stroke={on ? (dim ? "#fff" : "#ff6b35") : (dim ? "#ccc" : "#a0a0b0")}
                strokeWidth="1.6"
            />
        </svg>
    );
}

// Michael, 2026-08-07: card-browsing wishlist toggle -- complements the
// search-based add/remove already on /wishlist. `variant="tile"` is the
// compact inline heart CardTile shows next to the price; `variant="inline"`
// is the full-width labeled button on the /cards/[id] detail page.
export default function WishlistHeartButton({ productId, variant = "tile" }: {
    productId: number;
    variant?: "tile" | "inline";
}) {
    // getServerSnapshot returns a stable empty set so SSR/first paint never
    // shows a card as wishlisted before the client-side fetch resolves.
    const ids = useSyncExternalStore(subscribeWishlist, getWishlistIds, () => EMPTY);
    const on = ids.has(productId);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
    };

    if (variant === "inline") {
        return (
            <button
                onClick={handleClick}
                title={on ? "Remove from wishlist" : "Add to wishlist"}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    width: "100%", boxSizing: "border-box",
                    background: on ? "#ff6b3522" : "#1a1a24",
                    border: `1px solid ${on ? "#ff6b35" : "#2a2a3a"}`,
                    color: on ? "#ff6b35" : "#a0a0b0",
                    borderRadius: "8px", padding: "10px 16px",
                    fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "10px",
                }}
            >
                <HeartIcon on={on} size={16} dim={false} />
                {on ? "On your Wishlist" : "Add to Wishlist"}
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            title={on ? "Remove from wishlist" : "Add to wishlist"}
            style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "24px", height: "24px", padding: 0, flexShrink: 0,
                background: on ? "#ff6b35" : "transparent",
                border: `1.5px solid ${on ? "#ff6b35" : "#555"}`,
                borderRadius: "50%", cursor: "pointer",
            }}
        >
            <HeartIcon on={on} size={12} dim={on} />
        </button>
    );
}
