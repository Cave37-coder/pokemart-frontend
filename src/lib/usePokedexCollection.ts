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
// /pokedex/[id] (card list, needs ownedProductIds + toggleOwned for the
// per-card "owned" checkbox) -- each page mounts its own copy, no shared
// global state needed since they're never on screen at the same time.

interface MyCollectionResponse {
    product_ids?: number[];
    caught_pokedex_numbers?: number[];
    species_collected?: number;
    collection_value?: string;
    top_valued?: Card[];
    recently_added?: Card[];
}

export interface PokedexCollection {
    loading: boolean;
    loggedIn: boolean;
    caughtNumbers: Set<number>;
    ownedProductIds: Set<number>;
    speciesCollected: number;
    collectionValue: number;
    topValued: Card[];
    recentlyAdded: Card[];
    // Optimistically flips ownership locally, then confirms with the server;
    // reverts silently on failure. Returns false immediately (without
    // calling the API) if the customer isn't logged in, so callers know to
    // redirect to /auth/login instead.
    toggleOwned: (productId: number) => boolean;
}

export function usePokedexCollection(): PokedexCollection {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [caughtNumbers, setCaughtNumbers] = useState<Set<number>>(new Set());
    const [ownedProductIds, setOwnedProductIds] = useState<Set<number>>(new Set());
    const [speciesCollected, setSpeciesCollected] = useState(0);
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
        authFetch("/api/pokedex/my-collection/")
            .then(res => (res.ok ? (res.json() as Promise<MyCollectionResponse>) : null))
            .then(data => {
                if (!data) return;
                setOwnedProductIds(new Set(data.product_ids || []));
                setCaughtNumbers(new Set(data.caught_pokedex_numbers || []));
                setSpeciesCollected(data.species_collected || 0);
                setCollectionValue(parseFloat(data.collection_value || "0") || 0);
                setTopValued(data.top_valued || []);
                setRecentlyAdded(data.recently_added || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggleOwned = useCallback((productId: number): boolean => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (!token) return false;

        let wasOwned = false;
        setOwnedProductIds(prev => {
            wasOwned = prev.has(productId);
            const next = new Set(prev);
            if (wasOwned) next.delete(productId); else next.add(productId);
            return next;
        });

        authFetch("/api/pokedex/toggle/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId }),
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .catch(() => {
                // Genuinely failed to save -- flip back to what's actually on the account.
                setOwnedProductIds(prev => {
                    const next = new Set(prev);
                    if (wasOwned) next.add(productId); else next.delete(productId);
                    return next;
                });
            });

        return true;
    }, []);

    return {
        loading, loggedIn, caughtNumbers, ownedProductIds, speciesCollected,
        collectionValue, topValued, recentlyAdded, toggleOwned,
    };
}
