"use client";
import { useState } from "react";
import BackButton from "@/components/BackButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "#a0a0b0", marginBottom: 5 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Object.values(data).flat().join(" ");
        throw new Error(msg || "Something went wrong. Please try again.");
      }
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Reset your password</h1>
          <p style={{ color: "#a0a0b0", fontSize: 13, margin: 0 }}>
            {sent ? "Check your inbox for the reset link" : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "24px 22px" }}>
          {error && (
            <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          {sent ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
              <p style={{ color: "#a0a0b0", fontSize: 13, lineHeight: 1.6, marginBottom: 4 }}>
                If an account exists with <strong style={{ color: "#fff" }}>{email}</strong>, a password reset link is on its way.
              </p>
              <p style={{ color: "#555", fontSize: 12, marginTop: 12 }}>
                The link expires in a few hours. Don't see it? Check your spam folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Email address</label>
                <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="ash@pokemon.com" />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", background: loading ? "#cc5528" : "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
          <BackButton fallbackHref="/auth/login" style={{ color: "#ff6b35" }}>← Back to sign in</BackButton>
        </p>
      </div>
    </div>
  );
}
