"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/api";

interface Conversation {
  other_user: { id: number; display_name: string; avatar: string | null };
  last_message: { body: string; created_at: string; from_me: boolean };
  unread_count: number;
}

interface TradeRequestItem {
  id: number;
  status: string;
  message: string;
  created_at: string;
  other_user: { id: number; display_name: string; avatar: string | null };
  wanted_product: { id: number; name: string } | null;
}

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "10px", marginBottom: "20px",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [received, setReceived] = useState<TradeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<number | null>(null);

  const load = async () => {
    try {
      const [convRes, tradeRes] = await Promise.all([
        authFetch("/api/community/conversations/"),
        authFetch("/api/community/trade-requests/"),
      ]);
      if (convRes.ok) setConversations((await convRes.json()).conversations || []);
      if (tradeRes.ok) setReceived(((await tradeRes.json()).received || []).filter((t: TradeRequestItem) => t.status === "pending"));
    } catch {
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { router.push("/auth/login"); return; }
    load();
  }, []);

  const respond = async (tradeId: number, action: "accept" | "decline") => {
    setResponding(tradeId);
    try {
      await authFetch(`/api/community/trade-requests/${tradeId}/respond/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      window.dispatchEvent(new Event("messages-updated"));
      load();
    } finally {
      setResponding(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Messages</h1>

        {received.length > 0 && (
          <>
            <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              🔔 Pending Trade Requests
            </p>
            <div style={{ marginBottom: "24px" }}>
              {received.map((t) => (
                <div key={t.id} style={{ ...sectionStyle, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>{t.other_user.display_name}</div>
                      {t.wanted_product && (
                        <div style={{ color: "#ff6b35", fontSize: "12px", marginTop: "2px" }}>about: {t.wanted_product.name}</div>
                      )}
                      {t.message && <p style={{ color: "#a0a0b0", fontSize: "13px", margin: "8px 0 0 0" }}>{t.message}</p>}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        disabled={responding === t.id}
                        onClick={() => respond(t.id, "accept")}
                        style={{ background: "#2a6b3a", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Accept
                      </button>
                      <button
                        disabled={responding === t.id}
                        onClick={() => respond(t.id, "decline")}
                        style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
          Conversations
        </p>
        {loading ? (
          <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
        ) : conversations.length === 0 ? (
          <div style={{ ...sectionStyle, padding: "24px" }}>
            <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
              No conversations yet. Visit a trainer&apos;s{" "}
              <Link href="/community" style={{ color: "#ff6b35" }}>Community profile</Link> to say hi.
            </p>
          </div>
        ) : (
          <div style={sectionStyle}>
            {conversations.map((c) => (
              <Link
                key={c.other_user.id}
                href={`/messages/${c.other_user.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "12px",
                  textDecoration: "none", borderRadius: "8px",
                }}
              >
                <img
                  src={c.other_user.avatar || "/pokebulk-logo.png"}
                  alt=""
                  style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>{c.other_user.display_name}</span>
                    <span style={{ color: "#555", fontSize: "11px" }}>{timeAgo(c.last_message.created_at)}</span>
                  </div>
                  <div style={{ color: c.unread_count > 0 ? "#e0e0e0" : "#a0a0b0", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.last_message.from_me ? "You: " : ""}{c.last_message.body}
                  </div>
                </div>
                {c.unread_count > 0 && (
                  <span style={{
                    background: "#ff6b35", color: "#fff", fontSize: "10px", fontWeight: 700,
                    borderRadius: "10px", padding: "2px 7px", minWidth: "18px", textAlign: "center", flexShrink: 0,
                  }}>{c.unread_count}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
