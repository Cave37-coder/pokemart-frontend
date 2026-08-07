"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

interface ProductMini {
  id: number;
  name: string;
  image_small_url: string;
  image_url: string;
  price: string;
  card_set: { name: string };
}

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

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/community/profile/${id}/`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => data && setProfile(data))
      .finally(() => setLoading(false));
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
        <p style={{ color: "#555", fontSize: "13px" }}>This trainer hasn&apos;t made their profile public.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
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

        {profile.recent_catches.length > 0 && (
          <div style={sectionStyle}>
            <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px 0" }}>
              📖 Recently Caught
            </p>
            {profile.recent_catches.map((c) => <MiniCard key={c.id} c={c} />)}
          </div>
        )}

      </div>
    </div>
  );
}
