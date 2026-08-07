"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";
import PokedexGrid from "@/components/PokedexGrid";
import { GENERATIONS, getAllSpecies } from "@/lib/pokedex";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface ProductMini {
  id: number;
  name: string;
  image_small_url: string;
  image_url: string;
  price: string;
  card_set: { name: string };
}

interface ChecklistCompletion {
  set_code: string;
  set_name: string;
  tier: string;
  tier_label: string;
}

type FriendshipStatus = "self" | "friends" | "pending_sent" | "pending_received" | "none";

interface PublicProfile {
  id: number;
  display_name: string;
  avatar: string | null;
  trainer_level: string;
  community_bio: string;
  species_collected: number;
  caught_pokedex_numbers: number[];
  recent_catches: ProductMini[];
  wishlist: ProductMini[];
  can_message: boolean;
  friendship_status: FriendshipStatus;
  is_friend: boolean;
  checklist_completions: ChecklistCompletion[];
  full_pokedex?: { caught_pokedex_numbers: number[]; caught_card_images: Record<string, string> };
}

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

const TRAINER_BADGE: Record<string, string> = {
  rookie: "🌱", intermediate: "⚡", expert: "🔥", master: "👑",
};

function MiniCard({ c, action }: { c: ProductMini; action?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px", padding: "10px",
      background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "10px", marginBottom: "8px",
    }}>
      <img
        src={c.image_small_url || c.image_url}
        alt={c.name}
        style={{ width: "40px", height: "55px", objectFit: "contain", borderRadius: "4px", background: "#0e0e16" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.name}
        </div>
        <div style={{ color: "#a0a0b0", fontSize: "11px" }}>{c.card_set?.name}</div>
      </div>
      {action}
    </div>
  );
}

function FriendButton({ profile, onChange }: { profile: PublicProfile; onChange: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<Response>) => {
    if (!localStorage.getItem("access_token")) { router.push("/auth/login"); return; }
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) onChange();
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = () => act(() => authFetch("/api/community/friends/request/", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_user_id: profile.id }),
  }));

  if (profile.friendship_status === "self") return null;

  if (profile.friendship_status === "friends") {
    return <span style={{ color: "#66cc66", fontSize: "13px", fontWeight: 700 }}>✓ Friends</span>;
  }

  if (profile.friendship_status === "pending_sent") {
    return <span style={{ color: "#a0a0b0", fontSize: "13px" }}>Friend request sent</span>;
  }

  if (profile.friendship_status === "pending_received") {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          disabled={busy}
          onClick={() => act(async () => {
            // Find our own pending_received friendship id via the friends list endpoint.
            const list = await authFetch("/api/community/friends/");
            const data = await list.json();
            const match = (data.pending_received || []).find((p: { user: { id: number } }) => p.user.id === profile.id);
            if (!match) return list;
            return authFetch(`/api/community/friends/${match.id}/respond/`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "accept" }),
            });
          })}
          style={{ background: "#2a6b3a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
        >
          Accept Friend Request
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={sendRequest}
      style={{
        background: "transparent", border: "1px solid #ff6b35", color: "#ff6b35",
        borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
      }}
    >
      + Add Friend
    </button>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tradeProductId, setTradeProductId] = useState<number | null>(null);
  const [tradeMessage, setTradeMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [allSpecies, setAllSpecies] = useState<{ id: number; name: string }[]>([]);
  const [activeGenCode, setActiveGenCode] = useState("1");

  const load = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${API_URL}/api/community/profile/${id}/`, { headers })
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => data && setProfile(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    load();
    getAllSpecies().then(setAllSpecies);
  }, [id]);

  const sendTradeRequest = async () => {
    if (!localStorage.getItem("access_token")) { router.push("/auth/login"); return; }
    setSending(true);
    try {
      const res = await authFetch("/api/community/trade-requests/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: id,
          wanted_product_id: tradeProductId,
          message: tradeMessage,
        }),
      });
      if (res.ok) {
        setSent(true);
        setTradeProductId(null);
        setTradeMessage("");
        window.dispatchEvent(new Event("messages-updated"));
      }
    } catch {
      // session expired -- authFetch already redirects via SessionExpiredError upstream flows
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0e16", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#a0a0b0", fontSize: "14px" }}>Loading…</span>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0e16", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px" }}>
        <span style={{ color: "#fff", fontSize: "16px", fontWeight: 700 }}>Profile not found</span>
        <p style={{ color: "#555", fontSize: "13px" }}>This trainer hasn&apos;t made their profile public, or you're not friends with them yet.</p>
      </div>
    );
  }

  const activeGen = GENERATIONS.find((g) => g.code === activeGenCode) || GENERATIONS[0];
  const genSpecies = allSpecies.filter((p) => p.id >= activeGen.start && p.id <= activeGen.end);

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img
                src={profile.avatar || "/pokebulk-logo.png"}
                alt=""
                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>
                  {TRAINER_BADGE[profile.trainer_level] || "🌱"} {profile.display_name}
                </div>
                <div style={{ color: "#ff6b35", fontSize: "12px", textTransform: "capitalize" }}>{profile.trainer_level} Trainer</div>
              </div>
              <FriendButton profile={profile} onChange={load} />
            </div>
            {profile.community_bio && (
              <p style={{ color: "#e0e0e0", fontSize: "13px", fontStyle: "italic", marginTop: "14px", marginBottom: 0 }}>
                &quot;{profile.community_bio}&quot;
              </p>
            )}
            <div style={{ display: "flex", gap: "24px", marginTop: "18px" }}>
              <div>
                <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>{profile.species_collected}<span style={{ color: "#555", fontSize: "13px" }}>/1025</span></div>
                <div style={{ color: "#a0a0b0", fontSize: "11px", textTransform: "uppercase" }}>Pokédex species</div>
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>{profile.wishlist.length}</div>
                <div style={{ color: "#a0a0b0", fontSize: "11px", textTransform: "uppercase" }}>Cards wanted</div>
              </div>
            </div>

            {profile.can_message && (
              <button
                onClick={() => setTradeProductId(tradeProductId === -1 ? null : -1)}
                style={{
                  marginTop: "18px", background: "#ff6b35", color: "#fff", border: "none",
                  borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}
              >
                💬 Message {profile.display_name}
              </button>
            )}
          </div>

          {tradeProductId !== null && (
            <div style={sectionStyle}>
              <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>
                {tradeProductId > 0 ? "Trade request" : "Send a message"}
              </p>
              {sent ? (
                <p style={{ color: "#66cc66", fontSize: "13px" }}>✓ Sent! Check <a href="/messages" style={{ color: "#ff6b35" }}>Messages</a> for their reply.</p>
              ) : (
                <>
                  <textarea
                    value={tradeMessage}
                    onChange={(e) => setTradeMessage(e.target.value)}
                    placeholder="Say hi, or mention what you have to offer…"
                    rows={3}
                    style={{
                      width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a",
                      borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px",
                      boxSizing: "border-box", resize: "vertical", marginBottom: "12px",
                    }}
                  />
                  <button
                    onClick={sendTradeRequest}
                    disabled={sending || !tradeMessage.trim()}
                    style={{
                      background: sending ? "#333" : "#ff6b35", color: "#fff", border: "none",
                      borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700,
                      cursor: sending ? "not-allowed" : "pointer",
                    }}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </>
              )}
            </div>
          )}

          {profile.checklist_completions.length > 0 && (
            <div style={sectionStyle}>
              <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px 0" }}>
                ✅ Checklist Progress
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {profile.checklist_completions.map((c) => (
                  <div key={c.set_code} style={{
                    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "8px",
                    padding: "8px 12px", fontSize: "12px",
                  }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{c.set_name}</span>
                    <span style={{ color: "#ff6b35", marginLeft: "8px", fontWeight: 700 }}>{c.tier_label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.wishlist.length > 0 && (
            <div style={sectionStyle}>
              <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px 0" }}>
                🎯 Wants ({profile.wishlist.length})
              </p>
              {profile.wishlist.map((c) => (
                <MiniCard
                  key={c.id}
                  c={c}
                  action={
                    profile.can_message ? (
                      <button
                        onClick={() => setTradeProductId(c.id)}
                        style={{
                          background: "transparent", border: "1px solid #2a2a3a", color: "#ff6b35",
                          padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        I have this
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}

          {!profile.is_friend && profile.recent_catches.length > 0 && (
            <div style={sectionStyle}>
              <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px 0" }}>
                📖 Recently Caught
              </p>
              {profile.recent_catches.map((c) => <MiniCard key={c.id} c={c} />)}
              {profile.friendship_status === "none" && (
                <p style={{ color: "#555", fontSize: "11px", marginTop: "10px", marginBottom: 0 }}>
                  Become friends with {profile.display_name} to browse their full Pokédex by Generation.
                </p>
              )}
            </div>
          )}
        </div>

        {profile.is_friend && profile.full_pokedex && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0" }}>
                📖 {profile.display_name}&apos;s Pokédex
              </p>
              <p style={{ color: "#555", fontSize: "12px", margin: 0 }}>
                You can see this because you&apos;re friends — browse by Generation, just like your own.
              </p>
            </div>

            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "20px" }}>
              {GENERATIONS.map((gen) => {
                const active = gen.code === activeGenCode;
                const total = allSpecies.filter((p) => p.id >= gen.start && p.id <= gen.end).length;
                const caught = allSpecies.filter((p) => p.id >= gen.start && p.id <= gen.end && profile.full_pokedex!.caught_pokedex_numbers.includes(p.id)).length;
                return (
                  <button
                    key={gen.code}
                    onClick={() => setActiveGenCode(gen.code)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                      background: active ? "#ff6b35" : "#1a1a24",
                      border: `1px solid ${active ? "#ff6b35" : "#2a2a3a"}`,
                      color: "#fff", padding: "6px 14px", borderRadius: "6px",
                      fontSize: "13px", fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    <span>{gen.label}</span>
                    {total > 0 && (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: active ? "rgba(255,255,255,0.85)" : "#a0a0b0" }}>
                        {caught} of {total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <PokedexGrid
              pokemon={genSpecies}
              allPokemon={allSpecies}
              ownerLabel={`${profile.display_name}'s`}
              external={{
                caughtNumbers: new Set(profile.full_pokedex.caught_pokedex_numbers),
                caughtCardImages: Object.fromEntries(
                  Object.entries(profile.full_pokedex.caught_card_images).map(([k, v]) => [Number(k), v])
                ),
                speciesCollected: profile.species_collected,
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}
