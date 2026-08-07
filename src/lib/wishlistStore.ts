"use client";
// Michael, 2026-08-07: "add toggle" for wishlist-ing cards from the browse
// grid / card detail page, not just from the dedicated /wishlist search box.
// A card tile can't just call usePokedexCollection-style per-component
// fetching, because there can be 30+ CardTiles on one /cards page -- that'd
// be 30+ parallel GET /api/auth/wishlist/ calls. Instead this is a single
// module-level cache shared by every WishlistHeartButton instance on the
// page (and across client-side navigations, since Next.js keeps the JS
// module alive in the SPA shell); components subscribe via
// useSyncExternalStore instead of each holding their own state.
import { authFetch } from "@/lib/api";

type Listener = () => void;

let ids = new Set<number>();
let loaded = false;
let loading = false;
const listeners = new Set<Listener>();

function hasToken(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem("access_token");
}

function notify() {
    listeners.forEach((l) => l());
}

function ensureLoaded() {
    if (loaded || loading) return;
    if (!hasToken()) {
        // Not logged in -- nothing can be on the wishlist yet. Mark loaded so
        // we don't keep retrying on every new button mount; toggleWishlist()
        // sends anyone who clicks the heart to /auth/login anyway.
        loaded = true;
        return;
    }
    loading = true;
    authFetch("/api/auth/wishlist/")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (data?.product_ids) ids = new Set<number>(data.product_ids);
        })
        .catch(() => {})
        .finally(() => {
            loading = false;
            loaded = true;
            notify();
        });
}

export function subscribeWishlist(listener: Listener): () => void {
    listeners.add(listener);
    ensureLoaded();
    return () => {
        listeners.delete(listener);
    };
}

export function getWishlistIds(): Set<number> {
    return ids;
}

export function toggleWishlist(productId: number) {
    if (!hasToken()) {
        window.location.href = "/auth/login";
        return;
    }
    const wasOn = ids.has(productId);
    ids = new Set(ids);
    if (wasOn) ids.delete(productId); else ids.add(productId);
    notify();

    authFetch("/api/auth/wishlist/toggle/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
    })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .catch(() => {
            // Genuinely failed to save -- flip back to what's actually on the account.
            ids = new Set(ids);
            if (wasOn) ids.add(productId); else ids.delete(productId);
            notify();
        });
}
