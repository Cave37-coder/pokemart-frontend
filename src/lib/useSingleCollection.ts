"use client";
import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { ensureChecklistData, loadChecks, saveChecks, isChecklistCacheReady } from "@/lib/checklistShared";

// Michael, 2026-09-29, round 2 of "Single Pokemon Collections": "I want the
// same rule applied to Pokedex and Single Pokemon Collections! ... Single
// pokemon collections must be seperate page, but work off the pokedex
// structure, where you can select the pokemon, but that selection is moved
// to a page, where it can be tracked on its own." And, separately: "I want
// the pokedex left like it is" -- so this deliberately does NOT touch
// usePokedexCollection / PokedexCollectionEntry (the real Pokedex, left
// exactly as-is). Instead it reuses the SAME generic ChecklistEntry storage
// the 30C Chase Pikachu sub-set uses (see checklists/page.tsx's own
// `storageCode` comment for the sibling case), under its own made-up
// card_set identity, `DEX-{speciesId}` (e.g. "DEX-25" for Pikachu). card_key
// is just the product's numeric id as a string -- no set/variant scheme
// needed, since a Single Pokemon Collection tracks one physical print at a
// time across every set it appears in, not a per-set numbered slot.
//
// No backend change needed: ChecklistEntry.card_set is a free CharField
// (max 20 chars -- "DEX-" + up to 4 digits comfortably fits every dex
// number that exists), and /api/checklists/{entries,toggle}/ already accept
// any card_set string. Reuses checklistShared.ts's module-level cache
// (ensureChecklistData/loadChecks/saveChecks) rather than a second fetch --
// the entries endpoint already returns EVERY card_set the customer has any
// checked cards under in one call, so a DEX-25 collection just shows up as
// another key in the same cache the My Collection pages already populate,
// with zero risk of colliding with a real set code or the 30C-PIKA
// sub-set's own key.
function storageCodeFor(speciesId: number): string {
    return `DEX-${speciesId}`;
}

export interface SingleCollection {
    loading: boolean;
    loggedIn: boolean;
    isOwned: (productId: number) => boolean;
    // Optimistically flips ownership locally, then confirms with the
    // server; reverts silently on failure. Returns false immediately
    // (without calling the API) if the customer isn't logged in, so callers
    // know to redirect to /auth/login instead.
    toggleOwned: (productId: number) => boolean;
}

export function useSingleCollection(speciesId: number): SingleCollection {
    const code = storageCodeFor(speciesId);
    const [ready, setReady] = useState(isChecklistCacheReady());
    const [loggedIn, setLoggedIn] = useState(false);
    const [checks, setChecks] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        setLoggedIn(!!token);
        if (!token) { setReady(true); return; }
        ensureChecklistData().then(() => {
            setChecks(loadChecks(code));
            setReady(true);
        });
    }, [code]);

    const isOwned = useCallback((productId: number): boolean => {
        return !!checks[String(productId)];
    }, [checks]);

    const toggleOwned = useCallback((productId: number): boolean => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (!token) return false;

        const key = String(productId);
        let wasOwned = false;
        setChecks(prev => {
            wasOwned = !!prev[key];
            const next = { ...prev };
            if (wasOwned) delete next[key]; else next[key] = true;
            saveChecks(code, next);
            return next;
        });

        authFetch("/api/checklists/toggle/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ card_set: code, card_key: key }),
        }).catch(() => {
            // Genuinely couldn't save -- flip back to what's actually on the account.
            setChecks(prev => {
                const next = { ...prev };
                if (wasOwned) next[key] = true; else delete next[key];
                saveChecks(code, next);
                return next;
            });
        });

        return true;
    }, [code]);

    return { loading: !ready, loggedIn, isOwned, toggleOwned };
}
