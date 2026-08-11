"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import WishlistHeartButton from "@/components/WishlistHeartButton";

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

interface FriendCard {
  id: number;
  display_name: string;
  avatar: string | null;
  trainer_level: string;
}

interface PendingFriend {
  id: number; // friendship id
  user: FriendCard;
  created_at: string;
}

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

const TRAINER_BADGE: Record<string, string> = {
  rookie: "🌱", intermediate: "⚡", expert: "🔥", master: "👑",
};

function FriendsTab() {
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingFriend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!localStorage.getItem("access_token")) { setLoggedOut(true); setLoading(false); return; }
    authFetch("/api/community/friends/")
      .then((r) => r.json())
      .then((data) => {
        setFriends(data.friends || []);
        setPendingSent(data.pending_sent || []);
        setPendingReceived(data.pending_received || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (friendshipId: number, action: "accept" | "decline") => {
    setBusyId(friendshipId);
    try {
      await authFetch(`/api/community/friends/${friendshipId}/respond/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (userId: number) => {
    setBusyId(userId);
    try {
      await authFetch("/api/community/friends/remove/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (loggedOut) {
    return (
      <div style={sectionStyle}>
        <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
          <Link href="/auth/login" style={{ color: "#ff6b35" }}>Log in</Link> to see your friends.
        </p>
      </div>
    );
  }

  if (loading) return <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>;

  return (
    <>
      {pendingReceived.length > 0 && (
        <>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
            🔔 Friend Requests
          </p>
          <div style={{ marginBottom: "24px" }}>
            {pendingReceived.map((p) => (
              <div key={p.id} style={{ ...sectionStyle, marginBottom: "10px", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src={p.user.avatar || "/pokebulk-logo.png"} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{p.user.display_name}</div>
                  </div>
                  <button
                    disabled={busyId === p.id}
                    onClick={() => respond(p.id, "accept")}
                    style={{ background: "#2a6b3a", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === p.id}
                    onClick={() => respond(p.id, "decline")}
                    style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
        My Friends ({friends.length})
      </p>
      {friends.length === 0 ? (
        <div style={sectionStyle}>
          <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
            No friends yet — visit a trainer&apos;s profile from the Trainers tab and send a friend request.
            Friends can see each other&apos;s full Pokédex, browsable by Generation.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
          {friends.map((f) => (
            <div key={f.id} style={{ ...sectionStyle, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Link href={`/community/${f.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, textDecoration: "none" }}>
                  <img src={f.avatar || "/pokebulk-logo.png"} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }} />
                  <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>
                    {TRAINER_BADGE[f.trainer_level] || "🌱"} {f.display_name}
                  </span>
                </Link>
                <button
                  disabled={busyId === f.id}
                  onClick={() => remove(f.id)}
                  title="Remove friend"
                  style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#555", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingSent.length > 0 && (
        <>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
            Pending ({pendingSent.length})
          </p>
          <div>
            {pendingSent.map((p) => (
              <div key={p.id} style={{ ...sectionStyle, marginBottom: "10px", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src={p.user.avatar || "/pokebulk-logo.png"} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }} />
                  <span style={{ color: "#a0a0b0", fontSize: "13px", flex: 1 }}>Request sent to {p.user.display_name}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function CommunityPage() {
  const [tab, setTab] = useState<"trainers" | "wanted" | "friends">("trainers");
  const [profiles, setProfiles] = useState<PublicCard[]>([]);
  const [wanted, setWanted] = useState<MostWantedItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // Community discount (2026-08-11): "5% discount on all products to anyone
  // that is part of the community" -- personalizes the banner below based
  // on whether this visitor already has a public community profile
  // (the same opt-in that unlocks the discount at checkout).
  const [isMember, setIsMember] = useState<boolean | null>(null); // null = logged out / unknown

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    authFetch("/api/auth/profile/")
      .then((r) => r.json())
      .then((data) => setIsMember(!!data.community_profile_public))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "friends") return;
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
            Browse other trainers&apos; public Pokédex collections and wishlists, see what the whole community is chasing, or connect with friends to share your full collection.
          </p>
        </div>

        {/* Community discount banner */}
        <div style={{
          background: isMember ? "#10B98115" : "#ff6b3515",
          border: `1px solid ${isMember ? "#10B98155" : "#ff6b3555"}`,
          borderRadius: "10px", padding: "14px 18px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "20px" }}>🤝</span>
          {isMember ? (
            <span style={{ color: "#10B981", fontSize: "13px", fontWeight: 600 }}>
              You&apos;re getting 5% off every order as a community member — it&apos;s applied automatically at checkout.
            </span>
          ) : (
            <span style={{ color: "#ffb38a", fontSize: "13px", fontWeight: 600 }}>
              Community members get 5% off all products, automatically at checkout.{" "}
              <a href="/profile" style={{ color: "#ff6b35" }}>Make your profile public</a> to unlock it — free, takes a minute.
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {(["trainers", "wanted", "friends"] as const).map((t) => (
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
              {t === "trainers" ? "🧑‍🤝‍🧑 Trainers" : t === "wanted" ? "🔥 Most Wanted" : "🤝 Friends"}
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

        {tab === "friends" ? (
          <FriendsTab />
        ) : loading ? (
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
                <WishlistHeartButton productId={c.id} variant="tile" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
