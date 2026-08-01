"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export default function ResetPasswordPage({ params }: { params: { uid: string; token: string } }) {
  const router = useRouter();
  const { uid, token } = params;
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "#a0a0b0", marginBottom: 5 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || Object.values(data).flat().join(" ") || "This reset link is invalid or has expired.");
      }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2500);
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
            {done ? "Password updated!" : "Choose a new password"}
          </h1>
          {!done && <p style={{ color: "#a0a0b0", fontSize: 13, margin: 0 }}>Enter a new password for your account</p>}
        </div>

        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "24px 22px" }}>
          {error && (
            <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          {done ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <p style={{ color: "#a0a0b0", fontSize: 13, lineHeight: 1.6 }}>
                Your password has been changed. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>New password</label>
                <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus placeholder="Min 8 characters" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Confirm new password</label>
                <input style={inp} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", background: loading ? "#cc5528" : "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
            <BackButton fallbackHref="/auth/login" style={{ color: "#ff6b35" }}>← Back to sign in</BackButton>
          </p>
        )}
      </div>
    </div>
  );
}
