// Push notifications + "install as an app" helpers (2026-10-02).
//
// The site is a PWA: customers add it to their home screen from the browser
// (no app stores) and can turn on notifications for order updates and new
// messages. The backend half lives in pokemart-api/notifications/.
//
// Everything here is safe to call on any browser -- anything unsupported
// resolves to a state instead of throwing.

import { authFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export type PushState =
  | "unsupported"    // this browser can't do push at all
  | "needs-install"  // iPhone/iPad in a normal Safari tab: only works once added to the home screen
  | "denied"         // customer (or the phone) blocked notifications for this site
  | "off"            // supported, not turned on on this device
  | "on";            // this device is subscribed

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac -- the touch-point check is the usual
  // way to tell an iPad apart from a real one.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch {
    return null;
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const sub = await currentSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = window.atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await authFetch("/api/push/subscribe/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

// Turn notifications on for THIS device. Must be called from a tap/click --
// browsers (iPhone especially) refuse the permission prompt otherwise.
// Throws SessionExpiredError (from authFetch) if the customer isn't signed in.
export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!pushSupported()) {
    return { ok: false, reason: "This browser doesn't support notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notifications were not allowed. You can change this in your browser or phone settings." };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "Couldn't set up notifications on this device." };
  await navigator.serviceWorker.ready;

  let publicKey = "";
  try {
    const res = await fetch(`${API_URL}/api/push/public-key/`);
    if (res.ok) publicKey = (await res.json()).public_key || "";
  } catch {
    // handled just below
  }
  if (!publicKey) return { ok: false, reason: "Notifications aren't available right now. Please try again later." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
    } catch {
      return { ok: false, reason: "Couldn't turn on notifications on this device." };
    }
  }

  const saved = await saveSubscription(sub);
  if (!saved) {
    // Don't leave the browser subscribed to something the server never heard about.
    await sub.unsubscribe().catch(() => {});
    return { ok: false, reason: "Couldn't save your notification settings. Please try again." };
  }
  return { ok: true };
}

// Turn notifications off for THIS device only (other devices stay on).
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await authFetch("/api/push/unsubscribe/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    // Signed out / offline -- still unsubscribe the browser below; the
    // server drops the dead subscription itself the next time it tries it.
  }
  await sub.unsubscribe().catch(() => {});
}

// Called on sign-out. Tells the server to stop sending this customer's
// notifications to this device, but leaves the browser's own subscription
// and permission alone -- so when they sign back in, syncPushSubscription()
// below quietly re-attaches it and they don't have to turn it on again.
export async function detachPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await authFetch("/api/push/unsubscribe/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    // Best effort only.
  }
}

// Called on page load and whenever the notification switch is shown. If this device already has notifications on,
// re-send the subscription to the server so it stays attached to whoever is
// signed in now (browsers occasionally rotate it, and a shared phone may
// have a different customer signed in than last time).
export async function syncPushSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  if (!localStorage.getItem("access_token")) return;
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await saveSubscription(sub);
  } catch {
    // Best effort only.
  }
}

export async function sendTestPush(): Promise<boolean> {
  try {
    const res = await authFetch("/api/push/test/", { method: "POST" });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.sent || 0) > 0;
  } catch {
    return false;
  }
}
