"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { authFetch, SessionExpiredError } from "@/lib/api";

// Michael, 2026-09-04: "add to staff page, 'User' page, where we can
// change their password temporarily to say 'Pokebulk' so if they can't
// access their account we can just do a simple temp password to help!
// Then also put the full list there in chronological order of when they
// last were on the site, maybe give a weekly breakdown, just so we can see
// who are regulars and who have fallen away!"
//
// last_seen (users/models.py) is a brand new field, updated by
// UpdateLastSeenMiddleware -- it only starts filling in once a customer
// logs back in / browses again after this shipped, so right after deploy
// almost everyone will sit in the "Not seen since tracking started" bucket
// at the bottom. That's expected, not a bug -- it fills in naturally as
// customers come back over the following weeks.

const card: React.CSSProperties = { background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", color: "#a0a0b0", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" };
const btnDanger: React.CSSProperties = { ...btn, background: "#3a1a1a", border: "1px solid #7a2a2a", color: "#f87171" };
const inp: React.CSSProperties = { background: "#12121a", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12 };

interface AdminUser {
  id: number; username: string; first_name: string; last_name: string; email: string;
  date_joined: string; last_seen: string | null; is_staff: boolean; is_superuser: boolean;
}

function dateFmt(v: string) {
  return new Date(v).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function dateTimeFmt(v: string) {
  return new Date(v).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Monday-start week bucket for a given date.
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function shortDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
}

interface Bucket { key: string; label: string; users: AdminUser[]; }

// Groups the (already last_seen-sorted, most recent first) user list into
// weekly buckets -- "This week", then previous weeks as explicit date
// ranges, oldest last. Anyone never seen since tracking started gets its
// own bucket at the very end, in whatever order the backend already sorted
// them (most recently joined first).
function bucketUsers(users: AdminUser[]): Bucket[] {
  const now = new Date();
  const thisWeekStart = weekStart(now);
  const buckets = new Map<string, Bucket>();
  const neverKey = "__never__";

  for (const u of users) {
    if (!u.last_seen) {
      if (!buckets.has(neverKey)) buckets.set(neverKey, { key: neverKey, label: "Not seen since tracking started", users: [] });
      buckets.get(neverKey)!.users.push(u);
      continue;
    }
    const seen = new Date(u.last_seen);
    const seenWeekStart = weekStart(seen);
    const weeksAgo = Math.round((thisWeekStart.getTime() - seenWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const key = String(weeksAgo);
    if (!buckets.has(key)) {
      const label = weeksAgo <= 0 ? "This week" : `${shortDate(seenWeekStart)} – ${shortDate(addDays(seenWeekStart, 6))}`;
      buckets.set(key, { key, label, users: [] });
    }
    buckets.get(key)!.users.push(u);
  }

  const ordered = [...buckets.values()].filter((b) => b.key !== neverKey).sort((a, b) => Number(a.key) - Number(b.key));
  if (buckets.has(neverKey)) ordered.push(buckets.get(neverKey)!);
  return ordered;
}

function UserRow({ u, onReset }: { u: AdminUser; onReset: (u: AdminUser) => Promise<void> }) {
  const [status, setStatus] = useState<"idle" | "resetting" | "done" | "error">("idle");

  const reset = async () => {
    if (!window.confirm(`Reset ${u.username}'s password to a temporary password? Tell them to log in with it, then change it from their Profile.`)) return;
    setStatus("resetting");
    try {
      await onReset(u);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const name = `${u.first_name} ${u.last_name}`.trim() || "—";

  return (
    <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
      <td style={{ padding: "8px", fontSize: 12, color: "#ddd", fontWeight: 600 }}>
        {u.username}
        {u.is_superuser ? (
          <span style={{ background: "#3a1a1a", color: "#f87171", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 6 }}>ADMIN</span>
        ) : u.is_staff ? (
          <span style={{ background: "#1a2a3a", color: "#60a5fa", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 6 }}>STAFF</span>
        ) : null}
      </td>
      <td style={{ padding: "8px", fontSize: 12, color: "#ddd" }}>{name}</td>
      <td style={{ padding: "8px", fontSize: 12, color: "#888" }}>{u.email || "—"}</td>
      <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{u.last_seen ? dateTimeFmt(u.last_seen) : "—"}</td>
      <td style={{ padding: "8px", fontSize: 11, color: "#555" }}>{dateFmt(u.date_joined)}</td>
      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
        {status === "done" ? (
          <span style={{ color: "#4ade80", fontSize: 11 }}>✅ Reset to temp password</span>
        ) : status === "error" ? (
          <span style={{ color: "#EF4444", fontSize: 11 }}>Failed — try again</span>
        ) : (
          <button style={btnDanger} onClick={reset} disabled={status === "resetting"}>
            {status === "resetting" ? "…" : "🔑 Reset Password"}
          </button>
        )}
      </td>
    </tr>
  );
}

function BucketSection({ bucket, onReset }: { bucket: Bucket; onReset: (u: AdminUser) => Promise<void> }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: "#ff6b35", fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {bucket.label} <span style={{ color: "#555", fontWeight: 400, textTransform: "none" }}>({bucket.users.length})</span>
      </div>
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a2a3a" }}>
              {["Username", "Name", "Email", "Last seen", "Joined", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#888", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bucket.users.map((u) => <UserRow key={u.id} u={u} onReset={onReset} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StaffUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      setIsStaff(!!(user && (user.is_staff || user.is_superuser)));
    } catch { setIsStaff(false); }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`/api/auth/admin/users/`)
      .then((r) => r.json())
      .then((d) => { setUsers(d); setError(""); })
      .catch((e) => { if (e instanceof SessionExpiredError) setError("Session expired — please log in again."); else setError("Failed to load users."); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isStaff) load(); }, [isStaff, load]);

  const resetPassword = async (u: AdminUser) => {
    const res = await authFetch(`/api/auth/admin/users/${u.id}/reset-password/`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset password");
  };

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
    );
  }, [users, search]);

  const buckets = useMemo(() => bucketUsers(filtered), [filtered]);

  if (isStaff === null) return null;

  if (!isStaff) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: "0 1.5rem", textAlign: "center" }}>
        <div style={{ color: "#a0a0b0", marginBottom: 16 }}>Staff access only.</div>
        <Link href="/auth/login" style={{ color: "#ff6b35", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e16", padding: "32px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Users</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
            Every customer account, grouped by when they were last active on the site, plus a quick temporary password reset for locked-out customers.
            {" · "}<Link href="/staff/orders" style={{ color: "#ff6b35" }}>Orders →</Link>
            {" · "}<Link href="/staff/checklists" style={{ color: "#ff6b35" }}>Customer Checklists →</Link>
            {" · "}<Link href="/staff/announcements" style={{ color: "#ff6b35" }}>Restocks & Announcements →</Link>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 220 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username / name / email…" />
          {users && <span style={{ color: "#555", fontSize: 12 }}>{filtered.length} of {users.length} customers</span>}
        </div>

        {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div style={{ color: "#555", fontSize: 13 }}>Loading users…</div>
        ) : buckets.length === 0 ? (
          <div style={{ color: "#555", fontSize: 13 }}>No users match this search.</div>
        ) : (
          buckets.map((b) => <BucketSection key={b.key} bucket={b} onReset={resetPassword} />)
        )}
      </div>
    </div>
  );
}
