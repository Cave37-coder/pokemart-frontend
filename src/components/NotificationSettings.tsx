"use client";
import { useEffect, useState } from "react";
import { SessionExpiredError } from "@/lib/api";
import { PushState, disablePush, enablePush, getPushState, sendTestPush, syncPushSubscription } from "@/lib/push";

// The on/off switch for push notifications on THIS device (2026-10-02).
// Used in two places:
//   - /profile: always shown, full explanation for every state.
//   - /orders (compact): a one-line nudge that only appears when there is
//     something the customer can actually do, and disappears once it's on.
// Saves by itself -- it is not part of the profile page's "Save Changes".

const cardStyle = {
  background: "#16161f", border: "1px solid #2a2a3a",
  borderRadius: "12px", padding: "24px", marginBottom: "20px",
};

const buttonStyle = {
  background: "#ff6b35", color: "#fff", border: "none", borderRadius: "8px",
  padding: "10px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
};

const quietButtonStyle = {
  background: "transparent", color: "#a0a0b0", border: "1px solid #2a2a3a", borderRadius: "8px",
  padding: "10px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
};

export default function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPushState().then((s) => {
      if (cancelled) return;
      setState(s);
      // Already on from an earlier visit: make sure it's attached to the
      // customer who is signed in right now (e.g. just signed back in).
      if (s === "on") syncPushSubscription();
    });
    return () => { cancelled = true; };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await enablePush();
      if (result.ok) {
        setState("on");
        setMessage("Notifications are on for this device.");
      } else {
        setMessage(result.reason);
        setState(await getPushState());
      }
    } catch (e) {
      setMessage(e instanceof SessionExpiredError ? "Please sign in first." : "Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    setMessage("");
    await disablePush();
    setState(await getPushState());
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMessage("");
    const ok = await sendTestPush();
    setMessage(ok ? "Test sent. It should arrive in a few seconds." : "Couldn't send a test just now. Please try again in a few minutes.");
    setBusy(false);
  };

  if (state === null) return null;

  if (compact) {
    if (state !== "off" && state !== "needs-install") return null;
    return (
      <div style={{
        background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px",
        padding: "14px 18px", marginBottom: "16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
      }}>
        <div style={{ color: "#e0e0e0", fontSize: "13px", flex: "1 1 220px" }}>
          {state === "off"
            ? "Get a notification on this device when your order moves."
            : "Add PokeBulk to your home screen (Share, then Add to Home Screen) to get order notifications."}
          {message && <div style={{ color: "#a0a0b0", fontSize: "12px", marginTop: "4px" }}>{message}</div>}
        </div>
        {state === "off" && (
          <button onClick={turnOn} disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ color: "#a0a0b0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>
        Notifications
      </p>
      <p style={{ color: "#555", fontSize: "12px", margin: "0 0 16px 0" }}>
        Order status updates and new messages, sent to this device. Set per device — turn it on separately on your phone and your computer.
      </p>

      {state === "on" && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ color: "#10B981", fontSize: "13px", fontWeight: 600, marginRight: "6px" }}>On for this device</span>
          <button onClick={test} disabled={busy} style={{ ...quietButtonStyle, opacity: busy ? 0.6 : 1 }}>Send a test</button>
          <button onClick={turnOff} disabled={busy} style={{ ...quietButtonStyle, opacity: busy ? 0.6 : 1 }}>Turn off</button>
        </div>
      )}

      {state === "off" && (
        <button onClick={turnOn} disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
      )}

      {state === "needs-install" && (
        <p style={{ color: "#e0e0e0", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
          On iPhone and iPad, notifications only work from the home-screen app. In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, open PokeBulk from the new icon, and come back to this page.
        </p>
      )}

      {state === "denied" && (
        <p style={{ color: "#e0e0e0", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
          Notifications are blocked for PokeBulk on this device. Allow them in your browser or phone settings, then reload this page.
        </p>
      )}

      {state === "unsupported" && (
        <p style={{ color: "#e0e0e0", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
          This browser doesn&apos;t support notifications. Order updates will still reach you by email.
        </p>
      )}

      {message && <p style={{ color: "#a0a0b0", fontSize: "12px", margin: "12px 0 0 0" }}>{message}</p>}
    </div>
  );
}
