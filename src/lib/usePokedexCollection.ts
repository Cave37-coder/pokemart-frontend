"use client";
import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import type { Card } from "@/lib/api";

// Michael, 2026-08-02: "I want to be able to select the card or Variant of
// Card, add to a separate PokeDex collection, not tie in into Checklist,
// that was the one issue I had with pkmn.gg version." This hook is the
// single client-side gateway to that separate collection -- talks only to
// /api/pokedex/toggle/ and /api/pokedex/my-collection/, never touches
// anything Checklist-related. Used independently by both /pokedex (grid,
// needs caughtNumbers + speciesCollected for the progress bar) and
// /pokedex/[id] (card list, needs isOwned + toggleOwned for the per-card
// "owned" checkbox) -- each page mounts its own copy, no shared global
// state needed since they're never on screen at the same time.
//
// Michael, 2026-08-04, FINAL model (supersedes the brief "owning a
// tag-team card credits both species" version from earlier the same day):
// "if you select a card on a page for a pokemon, that selection must be
// for that pokemon only, not bleed into the other pokemon on the tag team
// card." A tag-team card's ownership is therefore tracked per (product,
// species) PAIR, not per product alone -- the same physical card can be
// "caught" for Pheromosa without being caught for Buzzwole, and vice versa.
// That's why ownership below is a Set of "productId:pokedexNumber" keys
// instead of a flat Set<productId>.

function pairKey(productId: number, pokedexNumber: number) {
    return `${productId}:${pokedexNumber}`;
}

interface MyCollectionResponse {
    owned_pairs?: [number, number][];
    caught_pokedex_numbers?: number[];
    species_collected?: number;
    caught_card_images?: Record<string, string>;
    collection_value?: string;
    top_valued?: Card[];
    recently_added?: Card[];
}

export interface PokedexCollection {
    loading: boolean;
    loggedIn: boolean;
    caughtNumbers: Set<number>;
    speciesCollected: number;
    // pokedex number -> image_url of the highest-value card owned for that
    // species, so the grid can show real card art (in colour) instead of the
    // generic sprite for anything you actually own.
    caughtCardImages: Record<number, string>;
    collectionValue: number;
    topValued: Card[];
    recentlyAdded: Card[];
    // Is this exact card owned FOR this exact species? Always pass the
    // species number of the page you're viewing -- for a tag-team card
    // that's the only thing that disambiguates which of its two possible
    // "caught" states you're asking about.
    isOwned: (productId: number, pokedexNumber: number) => boolean;
    // Optimistically flips ownership locally (for this product+species pair
    // only), then confirms with the server; reverts silently on failure.
    // Returns false immediately (without calling the API) if the customer
    // isn't logged in, so callers know to redirect to /auth/login instead.
    toggleOwned: (productId: number, pokedexNumber: number) => boolean;
}

export function usePokedexCollection(): PokedexCollection {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [caughtNumbers, setCaughtNumbers] = useState<Set<number>>(new Set());
    const [ownedPairs, setOwnedPairs] = useState<Set<string>>(new Set());
    const [speciesCollected, setSpeciesCollected] = useState(0);
    const [caughtCardImages, setCaughtCardImages] = useState<Record<number, string>>({});
    const [collectionValue, setCollectionValue] = useState(0);
    const [topValued, setTopValued] = useState<Card[]>([]);
    const [recentlyAdded, setRecentlyAdded] = useState<Card[]>([]);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (!token) {
            setLoading(false);
            setLoggedIn(false);
            return;
        }
        setLoggedIn(true);

        const load = () => {
            // Michael, 2026-08-04: caught a real bug via a live reproduction --
            // toggling a card owned on one page, then navigating (browser back
            // or a plain link) to /pokedex, could show a STALE snapshot of who's
            // "caught" because the browser's back/forward cache (bfcache)
            // restores the page from memory without re-running this effect, and
            // a normal fetch() can also be served from the HTTP cache. Both are
            // killed here: cache: "no-store" stops the HTTP-level staleness, and
            // the pageshow listener below re-fetches whenever a page is
            // restored from bfcache (event.persisted === true) instead of
            // silently showing whatever was in memory before the last toggle.
            authFetch("/api/pokedex/my-collection/", { cache: "no-store" })
                .then(res => (res.ok ? (res.json() as Promise<MyCollectionResponse>) : null))
                .then(data => {
                    if (!data) return;
                    setOwnedPairs(new Set((data.owned_pairs || []).map(([pid, pn]) => pairKey(pid, pn))));
                    setCaughtNumbers(new Set(data.caught_pokedex_numbers || []));
                    setSpeciesCollected(data.species_collected || 0);
                    const images: Record<number, string> = {};
                    Object.entries(data.caught_card_images || {}).forEach(([pn, url]) => { images[Number(pn)] = url; });
                    setCaughtCardImages(images);
                    setCollectionValue(parseFloat(data.collection_value || "0") || 0);
                    setTopValued(data.top_valued || []);
                    setRecentlyAdded(data.recently_added || []);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        };

        load();

        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) load();
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    const isOwned = useCallback((productId: number, pokedexNumber: number): boolean => {
        return ownedPairs.has(pairKey(productId, pokedexNumber));
    }, [ownedPairs]);

    const toggleOwned = useCallback((productId: number, pokedexNumber: number): boolean => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (!token) return false;

        const key = pairKey(productId, pokedexNumber);
        let wasOwned = false;
        setOwnedPairs(prev => {
            wasOwned = prev.has(key);
            const next = new Set(prev);
            if (wasOwned) next.delete(key); else next.add(key);
            return next;
        });

        authFetch("/api/pokedex/toggle/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, pokedex_number: pokedexNumber }),
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .catch(() => {
                // Genuinely failed to save -- flip back to what's actually on the account.
                setOwnedPairs(prev => {
                    const next = new Set(prev);
                    if (wasOwned) next.add(key); else next.delete(key);
                    return next;
                });
            });

        return true;
    }, []);

    return {
        loading, loggedIn, caughtNumbers, speciesCollected, caughtCardImages,
        collectionValue, topValued, recentlyAdded, isOwned, toggleOwned,
    };
}
