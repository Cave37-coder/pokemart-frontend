"use client";
import { useEffect, useState } from "react";
import { isIOS, isStandalone, registerServiceWorker, syncPushSubscription } from "@/lib/push";

// Mounted once in layout.tsx (2026-10-02). Two jobs:
//   1. Register the service worker and keep this device's notification
//      subscription attached to whoever is signed in.
//   2. On a phone that hasn't installed the site yet, show one small,
//      dismissible "add PokeBulk to your home screen" bar. Android gets a
//      real Install button; iPhone has no such thing, so it gets the
//      two-tap instructions instead. Dismissing hides it for 30 days.

const DISMISS_KEY = "pb-install-dismissed-at";
const DISMISS_DAYS = 30;

// Chrome/Edge/Samsung fire this when the site is installable. Not in
// TypeScript's built-in DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function PwaSetup() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    registerServiceWorker().then(() => syncPushSubscription());

    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's own mini-infobar; we show our bar instead.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      if (/Android/i.test(navigator.userAgent)) setMode("android");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Deferred a tick so it isn't a synchronous state change inside the effect.
    const timer = window.setTimeout(() => {
      if (isIOS()) setMode("ios");
    }, 0);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setMode("hidden");
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") setMode("hidden");
    else dismiss();
  };

  if (mode === "hidden") return null;

  return (
    <div
      role="region"
      aria-label="Install PokeBulk SA"
      style={{
        position: "fixed", left: "12px", right: "12px",
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        zIndex: 90, maxWidth: "520px", margin: "0 auto",
        background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px",
        boxShadow: "0 12px 24px rgba(0,0,0,0.5)",
        padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px",
      }}
    >
      <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: "9px", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>Get the PokeBulk app</div>
        <div style={{ color: "#a0a0b0", fontSize: "12px", lineHeight: 1.5 }}>
          {mode === "ios"
            ? <>Tap <strong style={{ color: "#e0e0e0" }}>Share</strong>, then <strong style={{ color: "#e0e0e0" }}>Add to Home Screen</strong>.</>
            : "Add it to your home screen for order updates."}
        </div>
      </div>
      {mode === "android" && (
        <button
          onClick={install}
          style={{
            background: "#ff6b35", color: "#fff", border: "none", borderRadius: "8px",
            padding: "9px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent", border: "none", color: "#a0a0b0",
          fontSize: "18px", cursor: "pointer", padding: "6px", flexShrink: 0, lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
