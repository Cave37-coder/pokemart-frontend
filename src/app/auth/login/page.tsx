"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    try {
      const res = await fetch(`${API_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.non_field_errors?.[0] || "Login failed");
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/orders";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Sign in to PokeBulk SA</h1>
          <p style={{ color: "#a0a0b0", fontSize: 14, margin: 0 }}>Track your orders and manage your pile</p>
        </div>
        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "28px 24px" }}>
          {error && (
            <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#a0a0b0", marginBottom: 6 }}>Username</label>
              <input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus placeholder="your username" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#a0a0b0", marginBottom: 6 }}>Password</label>
              <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="password" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "#cc5528" : "#ff6b35",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "11px", fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
          No account?{" "}
          <Link href="/auth/register" style={{ color: "#ff6b35", textDecoration: "none" }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
