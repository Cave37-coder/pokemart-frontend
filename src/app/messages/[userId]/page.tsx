"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/api";

interface ThreadMessage {
  id: number;
  body: string;
  created_at: string;
  from_me: boolean;
  trade_request_id: number | null;
}

interface OtherUser {
  id: number;
  display_name: string;
  avatar: string | null;
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const [other, setOther] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await authFetch(`/api/community/conversations/${userId}/`);
      if (res.ok) {
        const data = await res.json();
        setOther(data.other_user);
        setMessages(data.messages || []);
        window.dispatchEvent(new Event("messages-updated"));
      }
    } catch {
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { router.push("/auth/login"); return; }
    if (userId) load();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await authFetch("/api/community/messages/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: userId, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send message.");
      } else {
        setBody("");
        load();
      }
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>

        <div style={{ marginBottom: "16px" }}>
          <Link href="/messages" style={{ color: "#a0a0b0", fontSize: "12px", textDecoration: "none" }}>← All Messages</Link>
        </div>

        {other && (
          <Link href={`/community/${other.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", textDecoration: "none" }}>
            <img
              src={other.avatar || "/pokebulk-logo.png"}
              alt=""
              style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", background: "#1a1a24" }}
            />
            <span style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>{other.display_name}</span>
          </Link>
        )}

        <div style={{
          background: "#16161f", border: "1px solid #2a2a3a", borderRadius: "12px",
          padding: "20px", flex: 1, minHeight: "400px", display: "flex", flexDirection: "column", gap: "10px",
          overflowY: "auto", marginBottom: "16px",
        }}>
          {loading ? (
            <p style={{ color: "#555", fontSize: "13px" }}>Loading…</p>
          ) : messages.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>No messages yet — say hi!</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.from_me ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px", borderRadius: "14px",
                  background: m.from_me ? "#ff6b35" : "#1a1a24",
                  color: m.from_me ? "#fff" : "#e0e0e0",
                  fontSize: "13px",
                  border: m.trade_request_id ? "1px solid rgba(255,255,255,0.25)" : "none",
                }}>
                  {m.trade_request_id && (
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", opacity: 0.8, marginBottom: "4px" }}>
                      🔁 Trade Request
                    </div>
                  )}
                  {m.body}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div style={{ background: "#2a1a1a", border: "1px solid #ff4444", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", color: "#ff6b6b", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form onSubmit={send} style={{ display: "flex", gap: "8px" }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            style={{
              flex: 1, background: "#1a1a2e", border: "1px solid #2a2a3a",
              borderRadius: "8px", padding: "12px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            style={{
              background: sending ? "#333" : "#ff6b35", color: "#fff", border: "none",
              borderRadius: "8px", padding: "0 20px", fontSize: "14px", fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
