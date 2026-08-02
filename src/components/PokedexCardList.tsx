"use client";
import { useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/api";
import CardTile, { getVariantKey, VariantKey } from "@/components/CardTile";

const VARIANT_LABEL: Record<string, string> = {
    N: "Normal", H: "Holo", RH: "Reverse Holo", ESH: "Energy Symbol Holo", ERH: "Energy Reverse Holo",
    "RH-PB": "Poké Ball", "RH-MB": "Master Ball", "BRH-FB": "Friend Ball", "BRH-LB": "Love Ball",
    "BRH-QB": "Quick Ball", "BRH-DB": "Dusk Ball", "BRH-R": "Special", DR: "EX/GX/V",
    AS: "ACE SPEC", MH: "Cosmos Holo", "1ST": "1st Edition", IR: "Illustration Rare",
    SIR: "Special Illustration Rare", HR: "Hyper Rare",
};

const BINDER_PAGE_SIZE = 9;

type ViewMode = "grid" | "table" | "binder";

export default function PokedexCardList({ cards }: { cards: Card[] }) {
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [binderPage, setBinderPage] = useState(0);

    const binderPageCount = Math.max(1, Math.ceil(cards.length / BINDER_PAGE_SIZE));
    const binderSlice = cards.slice(binderPage * BINDER_PAGE_SIZE, binderPage * BINDER_PAGE_SIZE + BINDER_PAGE_SIZE);

    const modeBtn = (mode: ViewMode, label: string) => (
        <button
            onClick={() => setViewMode(mode)}
            style={{
                background: viewMode === mode ? "#ff6b35" : "#1a1a24",
                color: "#fff", border: `1px solid ${viewMode === mode ? "#ff6b35" : "#2a2a3a"}`,
                padding: "7px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
                cursor: "pointer",
            }}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
                {modeBtn("grid", "⊞ Grid")}
                {modeBtn("table", "☰ Table")}
                {modeBtn("binder", "📖 Binder")}
            </div>

            {viewMode === "grid" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "10px" }}>
                    {cards.map(card => <CardTile key={card.pb_id || card.id} card={card} />)}
                </div>
            )}

            {viewMode === "table" && (
                <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 90px 150px 90px 90px", gap: "8px", padding: "10px 14px", fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #2a2a3a" }}>
                        <div>Set</div><div>Name</div><div>Number</div><div>Variant</div><div>Rarity</div><div>Price</div>
                    </div>
                    {cards.map(card => {
                        const vk = getVariantKey(card) as VariantKey;
                        const hasStock = card.stock > 0;
                        return (
                            <Link
                                key={card.pb_id || card.id}
                                href={`/cards/${card.id}`}
                                style={{
                                    display: "grid", gridTemplateColumns: "70px 1fr 90px 150px 90px 90px", gap: "8px",
                                    padding: "9px 14px", fontSize: "13px", color: hasStock ? "#ddd" : "#666",
                                    textDecoration: "none", borderBottom: "1px solid #12121a", alignItems: "center",
                                }}
                            >
                                <div style={{ fontSize: "11px", color: "#a0a0b0" }}>{card.card_set?.code}</div>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name}</div>
                                <div style={{ fontSize: "11px", color: "#a0a0b0" }}>{card.number || card.card_number}</div>
                                <div style={{ fontSize: "11px" }}>{VARIANT_LABEL[vk] || vk}</div>
                                <div style={{ fontSize: "11px", color: "#a0a0b0" }}>{card.rarity?.replace(/_/g, " ")}</div>
                                <div style={{ fontWeight: 700, color: "#ff6b35" }}>R {parseFloat(card.price).toFixed(2)}</div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {viewMode === "binder" && (
                <div>
                    <div style={{
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px",
                        background: "#12121a", border: "1px solid #2a2a3a", borderRadius: "10px", padding: "20px",
                    }}>
                        {binderSlice.map(card => <CardTile key={card.pb_id || card.id} card={card} />)}
                        {/* pad out the page with empty slots so a partial last page still reads as a binder page */}
                        {Array.from({ length: Math.max(0, BINDER_PAGE_SIZE - binderSlice.length) }).map((_, i) => (
                            <div key={`empty-${i}`} style={{ border: "1px dashed #2a2a3a", borderRadius: "8px", aspectRatio: "3/4" }} />
                        ))}
                    </div>
                    {binderPageCount > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "14px" }}>
                            <button
                                onClick={() => setBinderPage(p => Math.max(0, p - 1))}
                                disabled={binderPage === 0}
                                style={{ background: "#1a1a24", color: "#fff", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: binderPage === 0 ? "default" : "pointer", opacity: binderPage === 0 ? 0.4 : 1 }}
                            >prev</button>
                            <span style={{ color: "#a0a0b0", fontSize: "13px" }}>Page {binderPage + 1} of {binderPageCount}</span>
                            <button
                                onClick={() => setBinderPage(p => Math.min(binderPageCount - 1, p + 1))}
                                disabled={binderPage >= binderPageCount - 1}
                                style={{ background: "#1a1a24", color: "#fff", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: binderPage >= binderPageCount - 1 ? "default" : "pointer", opacity: binderPage >= binderPageCount - 1 ? 0.4 : 1 }}
                            >next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
