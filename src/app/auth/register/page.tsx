"use client";
import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: "", email: "", password: "", password2: "",
    first_name: "", last_name: "", phone_number: "",
    address_line1: "", address_line2: "", address_city: "", address_province: "", address_postal_code: "",
    pudo_locker_name: "", pudo_locker_address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a24", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "#a0a0b0", marginBottom: 5 };
  const row: React.CSSProperties = { marginBottom: 14 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (step === 1) {
      if (form.password !== form.password2) { setError("Passwords do not match"); return; }
      if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    }
    if (step === 2) {
      if (!form.first_name || !form.last_name || !form.phone_number) {
        setError("Please fill in your full name and phone number"); return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          password2: form.password2,
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          address_line1: form.address_line1,
          address_line2: form.address_line2,
          address_city: form.address_city,
          address_province: form.address_province,
          address_postal_code: form.address_postal_code,
          pudo_locker_name: form.pudo_locker_name,
          pudo_locker_address: form.pudo_locker_address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Object.values(data).flat().join(" ");
        throw new Error(msg || "Registration failed");
      }
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/cards";
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const stepLabel = ["Account", "Personal", "Address"];

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Create your account</h1>
          <p style={{ color: "#a0a0b0", fontSize: 13, margin: 0 }}>Join PokeBulk SA — straight outta Kempton Park</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
          {stepLabel.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i + 1 <= step ? "#ff6b35" : "#2a2a3a",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                }}>{i + 1 < step ? "✓" : i + 1}</div>
                <div style={{ fontSize: 10, color: i + 1 <= step ? "#ff6b35" : "#555" }}>{label}</div>
              </div>
              {i < stepLabel.length - 1 && (
                <div style={{ width: 60, height: 1, background: i + 1 < step ? "#ff6b35" : "#2a2a3a", margin: "0 6px", marginBottom: 18 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "24px 22px" }}>
          {error && (
            <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <form onSubmit={nextStep}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Account details</div>
              <div style={row}>
                <label style={lbl}>Username</label>
                <input style={inp} type="text" value={form.username} onChange={set("username")} required autoFocus placeholder="ashketchum" />
              </div>
              <div style={row}>
                <label style={lbl}>Email address</label>
                <input style={inp} type="email" value={form.email} onChange={set("email")} required placeholder="ash@pokemon.com" />
              </div>
              <div style={row}>
                <label style={lbl}>Password</label>
                <input style={inp} type="password" value={form.password} onChange={set("password")} required placeholder="Min 8 characters" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Confirm password</label>
                <input style={inp} type="password" value={form.password2} onChange={set("password2")} required placeholder="••••••••" />
              </div>
              <button type="submit" style={{ width: "100%", background: "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Next →
              </button>
            </form>
          )}

          {/* STEP 2 — Personal */}
          {step === 2 && (
            <form onSubmit={nextStep}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Personal details</div>
              <div style={{ ...grid2, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>First name *</label>
                  <input style={inp} type="text" value={form.first_name} onChange={set("first_name")} required placeholder="Ash" />
                </div>
                <div>
                  <label style={lbl}>Last name *</label>
                  <input style={inp} type="text" value={form.last_name} onChange={set("last_name")} required placeholder="Ketchum" />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Cell phone number *</label>
                <input style={inp} type="tel" value={form.phone_number} onChange={set("phone_number")} required placeholder="074 000 0000" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} style={{ flex: 1, background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer" }}>
                  ← Back
                </button>
                <button type="submit" style={{ flex: 2, background: "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Next →
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 — Address */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Delivery details</div>
              <p style={{ fontSize: 12, color: "#a0a0b0", marginBottom: 16 }}>Fill in your address and/or Pudo locker — used for invoicing and delivery.</p>

              <div style={{ fontSize: 12, fontWeight: 600, color: "#ff6b35", marginBottom: 10 }}>Physical address</div>
              <div style={row}>
                <label style={lbl}>Address line 1</label>
                <input style={inp} type="text" value={form.address_line1} onChange={set("address_line1")} placeholder="4 Heliose Street" />
              </div>
              <div style={row}>
                <label style={lbl}>Address line 2 (optional)</label>
                <input style={inp} type="text" value={form.address_line2} onChange={set("address_line2")} placeholder="Complex / Unit" />
              </div>
              <div style={{ ...grid2, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} type="text" value={form.address_city} onChange={set("address_city")} placeholder="Kempton Park" />
                </div>
                <div>
                  <label style={lbl}>Province</label>
                  <input style={inp} type="text" value={form.address_province} onChange={set("address_province")} placeholder="Gauteng" />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Postal code</label>
                <input style={{ ...inp, maxWidth: 120 }} type="text" value={form.address_postal_code} onChange={set("address_postal_code")} placeholder="1618" />
              </div>

              <div style={{ borderTop: "1px solid #2a2a3a", paddingTop: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ff6b35", marginBottom: 10 }}>Pudo locker (optional)</div>
                <div style={row}>
                  <label style={lbl}>Locker name</label>
                  <input style={inp} type="text" value={form.pudo_locker_name} onChange={set("pudo_locker_name")} placeholder="e.g. Birchleigh North Mall" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>Locker address</label>
                  <input style={inp} type="text" value={form.pudo_locker_address} onChange={set("pudo_locker_address")} placeholder="e.g. Mooifontein Rd, Birchleigh North" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setStep(2)} style={{ flex: 1, background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer" }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? "#cc5528" : "#ff6b35", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Creating account..." : "Create account ⚡"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}




