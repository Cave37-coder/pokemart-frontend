"use client";
import { useState } from "react";
import Link from "next/link";
import { SETS, SET_INDEX, RSYM } from "@/lib/checklistData";

// Michael, 2026-08-08: "add the checklist to Friends access, so they can
// share their sets that they have, also show what is needed!" -- reuses the
// same static SETS/SET_INDEX reference data the customer's own /checklists
// page uses (extracted to @/lib/checklistData so this doesn't need a second
// copy of that large file), cross-referenced against the FRIEND's checked
// card_keys (community/views.py's public_profile -> full_checklist, friends
// only, same stronger-grant precedent as full_pokedex). Deliberately a
// separate, simpler read-only component rather than reusing the customer's
// own Checklist component -- that one carries buy buttons, stock lookups
// and leaderboards that don't apply to viewing someone else's progress.
type FilterMode = "all" | "have" | "needed";

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

export default function FriendChecklistSection({ entries, ownerLabel }: {
  entries: Record<string, string[]>;
  ownerLabel: string;
}) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  const metaByCode: Record<string, (typeof SET_INDEX)[number]> = {};
  for (const s of SET_INDEX) metaByCode[s.code] = s;

  const codes = Object.keys(entries)
    .filter((code) => (entries[code]?.length || 0) > 0 && SETS[code])
    .sort((a, b) => (metaByCode[a]?.name || a).localeCompare(metaByCode[b]?.name || b));

  if (codes.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>
        📋 {ownerLabel} Checklists
      </p>
      <p style={{ color: "#555", fontSize: "12px", margin: "0 0 14px 0" }}>
        Sets they&apos;re actively collecting — tap a set to see exactly which cards they have and which they still need.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {codes.map((code) => {
          const meta = metaByCode[code];
          const set = SETS[code];
          const owned = new Set(entries[code]);
          const totalVariants = meta?.variants ?? set.cards.reduce((n, c) => n + c.variants.length, 0);
          const ownedCount = owned.size;
          const isOpen = openCode === code;

          return (
            <div key={code} style={{ border: "1px solid #2a2a3a", borderRadius: "8px", background: "#1a1a24", overflow: "hidden" }}>
              <button
                onClick={() => setOpenCode(isOpen ? null : code)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                  background: "transparent", border: "none", color: "#fff", padding: "12px 14px",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left",
                }}
              >
                <span>{meta?.name || code}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ color: "#ff6b35", fontWeight: 700, fontSize: "12px" }}>{ownedCount}/{totalVariants}</span>
                  <span style={{ color: "#555", fontSize: "11px" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 14px" }}>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                    {(["all", "have", "needed"] as FilterMode[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                          background: filter === f ? "#ff6b3522" : "#12121a",
                          border: `1px solid ${filter === f ? "#ff6b35" : "#2a2a3a"}`,
                          color: filter === f ? "#ff6b35" : "#a0a0b0",
                          padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "480px", overflowY: "auto" }}>
                    {set.cards.map((card) => {
                      const variantRows = card.variants.filter((v) => {
                        if (filter === "all") return true;
                        const have = owned.has(`${card.num}_${v.vc}`);
                        return filter === "have" ? have : !have;
                      });
                      if (variantRows.length === 0) return null;
                      return (
                        <div key={card.num} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                          padding: "6px 8px", borderRadius: "6px", background: "#12121a",
                        }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ color: "#555", fontSize: "11px", marginRight: "6px" }}>{card.num}</span>
                            <span style={{ color: "#ddd", fontSize: "12px" }}>{card.name}</span>
                            <span style={{ color: "#555", fontSize: "10px", marginLeft: "6px" }}>{RSYM[card.rarity] || ""}</span>
                          </div>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {variantRows.map((v) => {
                              const have = owned.has(`${card.num}_${v.vc}`);
                              return (
                                <Link
                                  key={v.vc}
                                  href={have ? "#" : `/cards?search=${encodeURIComponent(card.name)}&card_set=${code}`}
                                  title={have ? "They have this" : `Still needed — click to find it in Browse Cards`}
                                  style={{
                                    padding: "2px 7px", borderRadius: "5px", fontSize: "10px", fontWeight: 700,
                                    textDecoration: "none",
                                    background: have ? "#16a34a" : "#2a1a1a",
                                    color: have ? "#eafff1" : "#f2a0a0",
                                    border: `1px solid ${have ? "#22c55e" : "#7a3a3a"}`,
                                    cursor: have ? "default" : "pointer",
                                    pointerEvents: have ? "none" : "auto",
                                  }}
                                >
                                  {v.vc} {have ? "✓" : "✗"}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
