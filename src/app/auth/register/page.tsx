"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) { setError("Passwords do not match"); return; }
    setLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, password2: form.password2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Object.values(data).flat().join(" ");
        throw new Error(msg || "Registration failed");
      }
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

  const input: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Create your account</h1>
          <p style={{ color: "#a0a0b0", fontSize: 14, margin: 0 }}>Join PokeBulk SA — straight outta Kempton Park</p>
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
              <input style={input} type="text" value={form.username} onChange={set("username")} required autoFocus placeholder="ashketchum" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#a0a0b0", marginBottom: 6 }}>Email</label>
              <input style={input} type="email" value={form.email} onChange={set("email")} required placeholder="ash@pokemon.com" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#a0a0b0", marginBottom: 6 }}>Password</label>
              <input style={input} type="password" value={form.password} onChange={set("password")} required placeholder="••••••••" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "#a0a0b0", marginBottom: 6 }}>Confirm password</label>
              <input style={input} type="password" value={form.password2} onChange={set("password2")} required placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "#cc5528" : "#ff6b35",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "11px", fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
