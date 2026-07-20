"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// ────────────────────────────────────────────────────────────────────────
// TEMPORARY CAMPAIGN COMPONENT -- added 2026-06-21, intended to run ~2
// weeks then be removed entirely (delete this file and its import/usage
// in layout.tsx). Prompts existing users who registered before the
// first/last name + email + phone requirement existed to fill in the
// gaps, for communication purposes.
//
// To remove: delete this file, and remove the <ProfileCompletionPopup />
// line + its import from layout.tsx.
// ────────────────────────────────────────────────────────────────────────
const CAMPAIGN_END = new Date("2026-07-05T00:00:00Z");
const DISMISS_KEY = "pb_profile_popup_dismissed_session";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  profile_complete: boolean;
}

export default function ProfileCompletionPopup() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone_number: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new Date() > CAMPAIGN_END) return; // campaign window has passed -- do nothing
    if (sessionStorage.getItem(DISMISS_KEY)) return; // already dismissed this session

    const token = localStorage.getItem("access_token");
    if (!token) return; // not logged in

    fetch(`${API_URL}/api/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProfileData | null) => {
        if (!data) return;
        setProfile(data);
        if (!data.profile_complete) {
          setForm({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
          });
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.first_name || !form.last_name || !form.email || !form.phone_number) {
      setError("Please fill in all fields so we can reach you about your orders.");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/api/profile/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(Object.values(data).flat().join(" ") || "Could not save — please try again.");
      }
      sessionStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!visible || !profile) return null;

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "#a0a0b0", marginBottom: 5 };
  const row: React.CSSProperties = { marginBottom: 14 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "24px 22px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Help us reach you ⚡</div>
        <p style={{ fontSize: 13, color: "#a0a0b0", marginBottom: 18, lineHeight: 1.5 }}>
          We need a few details on file so we can contact you about your orders. Takes 30 seconds.
        </p>

        {error && (
          <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#EF4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>First name</label>
              <input style={inp} type="text" value={form.first_name} onChange={set("first_name")} placeholder="Ash" />
            </div>
            <div>
              <label style={lbl}>Last name</label>
              <input style={inp} type="text" value={form.last_name} onChange={set("last_name")} placeholder="Ketchum" />
            </div>
          </div>
          <div style={row}>
            <label style={lbl}>Email address</label>
            <input style={inp} type="email" value={form.email} onChange={set("email")} placeholder="ash@pokemon.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Cell phone number</label>
            <input style={inp} type="tel" value={form.phone_number} onChange={set("phone_number")} placeholder="074 000 0000" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={dismiss}
              style={{ flex: 1, background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer" }}
            >
              Remind me later
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 2, background: saving ? "#cc5528" : "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Saving..." : "Save details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
