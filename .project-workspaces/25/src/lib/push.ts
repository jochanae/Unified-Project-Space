/**
 * Web Push client helpers.
 *
 * The VAPID PUBLIC key is intentionally embedded in client code — the spec
 * requires the browser to know it before subscribing. Only the PRIVATE key
 * stays on the server.
 */

export const VAPID_PUBLIC_KEY =
  "BEh5vMUFOiA5Xcc7Wley1JUNkvSjRIPtSnSMyYbds9GH2ybwjhGYh2MMQMI-R-AEEzezYqZ_JVzVNR098PoCRpA";

/** Detect if push is even possible in this context. */
export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Detect if we're in the Lovable editor iframe — never register SW there. */
export function isPreviewContext(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

/** Standard VAPID key conversion: base64url → Uint8Array (ArrayBuffer-backed). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/** Register the SW once. Returns the active registration. */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  if (isPreviewContext()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

/** Subscribe and return the PushSubscription (caller persists to DB). */
export async function subscribePush(): Promise<PushSubscription | null> {
  const reg = await ensureServiceWorker();
  if (!reg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

/** Unsubscribe locally + return the endpoint for DB cleanup. */
export async function unsubscribePush(): Promise<string | null> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
