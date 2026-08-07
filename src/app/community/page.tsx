"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface PublicCard {
  id: number;
  display_name: string;
  avatar: string | null;
  trainer_level: string;
  community_bio: string;
  species_collected: number;
  wishlist_count: number;
}

interface MostWantedItem {
  id: number;
  name: string;
  image_small_url: string;
  image_url: string;
  price: string;
  wanted_by: number;
  card_set: { name: string };
}

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

const TRAINER_BADGE: Record<string, string> = {
  rookie: "🌱", intermediate: "⚡", expert: "🔥", master: "👑",
};

export default function CommunityPage() {
  const [tab, setTab] = useState<"trainers" | "wanted">("trainers");
  const [profiles, setProfiles] = useState<PublicCard[]>([]);
  const [wanted, setWanted] = useState<MostWantedItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = tab === "trainers"
      ? `${API_URL}/api/community/browse/${q ? `?q=${encodeURIComponent(q)}` : ""}`
      : `${API_URL}/api/community/most-wanted/`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (tab === "trainers") setProfiles(data.profiles || []);
        else setWanted(data.most_wanted || []);
      })
      .catch(() => { setProfiles([]); setWanted([]); })
      .finally(() => setLoading(false));
  }, [tab, q]);

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: 0 }}>Community</h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "6px" }}>
            Browse other trainers&apos; public Pokédex collections and wishlists, or see what the whole community is chasing.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {(["trainers", "wanted"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "#ff6b35" : "transparent",
                border: `1px solid ${tab === t ? "#ff6b35" : "#2a2a3a"}`,
                color: tab === t ? "#fff" : "#a0a0b0",
                padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              {t === "trainers" ? "🧑‍🤝‍🧑 Trainers" : "🔥 Most Wanted"}
            </button>
          ))}
        </div>

        {tab === "trainers" && (
          <div style={{ marginBottom: "16px" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trainer name…"
              style={{
                width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a",
                borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {loading ? (
          <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
        ) : tab === "trainers" ? (
          profiles.length === 0 ? (
            <div style={sectionStyle}>
              <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
                No public trainers yet — be the first! Turn on &quot;Community Profile&quot; in{" "}
                <a href="/profile" style={{ color: "#ff6b35" }}>your profile</a>.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {profiles.map((p) => (
                <Link key={p.id} href={`/community/${p.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ ...sectionStyle, marginBottom: 0, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      <img
                        src={p.avatar || "/pokebulk-logo.png"}
                        alt=""
                        style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }}
                      />
                      <div>
                        <div style={{ color: "#fff", fontSize: "15px", fontWeight: 700 }}>
                          {TRAINER_BADGE[p.trainer_level] || "🌱"} {p.display_name}
                        </div>
                        <div style={{ color: "#a0a0b0", fontSize: "11px" }}>
                          {p.species_collected} species • {p.wishlist_count} wanted
                        </div>
                      </div>
                    </div>
                    {p.community_bio && (
                      <p style={{ color: "#a0a0b0", fontSize: "12px", margin: 0, fontStyle: "italic" }}>
                        &quot;{p.community_bio}&quot;
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : wanted.length === 0 ? (
          <div style={sectionStyle}>
            <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>Nothing on any wishlist yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {wanted.map((c, i) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
                background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "10px",
              }}>
                <span style={{ color: "#ff6b35", fontWeight: 700, fontSize: "14px", width: "24px" }}>#{i + 1}</span>
                <img
                  src={c.image_small_url || c.image_url}
                  alt={c.name}
                  style={{ width: "40px", height: "55px", objectFit: "contain", borderRadius: "4px", background: "#0e0e16" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: "#a0a0b0", fontSize: "12px" }}>{c.card_set?.name}</div>
                </div>
                <div style={{ color: "#ff6b35", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                  💛 {c.wanted_by} want this
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
