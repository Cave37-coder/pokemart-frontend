"use client";
// v1.2.0 — Added Pudo locker fields
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

const DIAL_CODES = [
  { code: "+27", label: "🇿🇦 +27" },
  { code: "+1",  label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+55", label: "🇧🇷 +55" },
  { code: "+86", label: "🇨🇳 +86" },
  { code: "+81", label: "🇯🇵 +81" },
];

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

interface Profile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_province: string;
  address_postal_code: string;
  pudo_locker_name: string;
  pudo_locker_address: string;
  pudo_locker_code: string;
  trainer_level: string;
}

function splitPhone(phone: string): { dial: string; number: string } {
  for (const d of DIAL_CODES) {
    if (phone.startsWith(d.code)) {
      return { dial: d.code, number: phone.slice(d.code.length).trim() };
    }
  }
  return { dial: "+27", number: phone };
}

const inputStyle = {
  width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a",
  borderRadius: "8px", padding: "10px 14px", color: "#fff",
  fontSize: "14px", boxSizing: "border-box" as const,
};

const lockedStyle = {
  ...inputStyle,
  background: "#111118", color: "#555", cursor: "not-allowed",
};

const labelStyle = {
  display: "block", color: "#a0a0b0", fontSize: "12px",
  fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const sectionStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+27");
  const [phoneNum, setPhoneNum] = useState("");
  const [email, setEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postal, setPostal] = useState("");
  const [pudoName, setPudoName] = useState("");
  const [pudoAddress, setPudoAddress] = useState("");
  const [pudoCode, setPudoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/auth/login"); return; }

    fetch(`${API_URL}/api/auth/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        const { dial, number } = splitPhone(data.phone_number || "");
        setDialCode(dial);
        setPhoneNum(number);
        setEmail(data.email || "");
        setAddress1(data.address_line1 || "");
        setAddress2(data.address_line2 || "");
        setCity(data.address_city || "");
        setProvince(data.address_province || "");
        setPostal(data.address_postal_code || "");
        setPudoName(data.pudo_locker_name || "");
        setPudoAddress(data.pudo_locker_address || "");
        setPudoCode(data.pudo_locker_code || "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phoneNum ? `${dialCode}${phoneNum}` : "",
          address_line1: address1,
          address_line2: address2,
          address_city: city,
          address_province: province,
          address_postal_code: postal,
          pudo_locker_name: pudoName,
          pudo_locker_address: pudoAddress,
          pudo_locker_code: pudoCode,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#a0a0b0", fontSize: "14px" }}>Loading profile…</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: 0 }}>
            My Profile
          </h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "6px" }}>
            Trainer Level: <span style={{ color: "#ff6b35", textTransform: "capitalize" }}>{profile?.trainer_level || "rookie"}</span>
          </p>
        </div>

        {/* Account Info — names editable, username locked */}
        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
            Account Info
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <label style={labelStyle}>Username</label>
            <input style={lockedStyle} value={profile?.username || "—"} disabled />
            <p style={{ color: "#555", fontSize: "11px", marginTop: "6px" }}>
              ⚠ Username is permanent and cannot be changed after registration.
            </p>
          </div>
        </div>

        {/* Editable — Contact */}
        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
            Contact Details
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                style={{ ...inputStyle, width: "130px", flex: "0 0 130px" }}
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>
              <input
                style={inputStyle}
                type="tel"
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                placeholder="82 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Editable — Address */}
        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
            Delivery Address
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Address Line 1</label>
              <input style={inputStyle} value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street address" />
            </div>
            <div>
              <label style={labelStyle}>Address Line 2 <span style={{ color: "#444", fontWeight: 400 }}>(optional)</span></label>
              <input style={inputStyle} value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Suburb / Unit" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div>
                <label style={labelStyle}>Postal Code</label>
                <input style={inputStyle} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="0000" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Province</label>
              <select style={inputStyle} value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">Select province…</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Editable — Pudo Locker */}
        <div style={sectionStyle}>
          <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>
            Pudo Locker
          </p>
          <p style={{ color: "#555", fontSize: "12px", margin: "0 0 16px 0" }}>
            Your preferred Pudo locker for order delivery.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Locker Name</label>
              <input style={inputStyle} value={pudoName} onChange={(e) => setPudoName(e.target.value)} placeholder="e.g. Clicks Kempton Park" />
            </div>
            <div>
              <label style={labelStyle}>Locker Address / Suburb</label>
              <input style={inputStyle} value={pudoAddress} onChange={(e) => setPudoAddress(e.target.value)} placeholder="e.g. 123 Main St, Kempton Park" />
            </div>
            <div>
              <label style={labelStyle}>Locker Code</label>
              <input style={inputStyle} value={pudoCode} onChange={(e) => setPudoCode(e.target.value)} placeholder="e.g. GP-KEM-001" />
            </div>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div style={{ background: "#2a1a1a", border: "1px solid #ff4444", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#ff6b6b", fontSize: "13px" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#1a2a1a", border: "1px solid #44aa44", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "#66cc66", fontSize: "13px" }}>
            ✓ Profile saved successfully
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", background: saving ? "#333" : "#ff6b35",
            color: "#fff", border: "none", borderRadius: "10px",
            padding: "14px", fontSize: "15px", fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

      </div>
    </div>
  );
}
