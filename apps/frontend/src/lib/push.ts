import { apiClient } from "@/lib/api/client";

export type PushState = "unsupported" | "denied" | "default" | "enabled";

const ENABLED_KEY = "safetrust:push:enabled";

function getVapidKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function hasLocalFlag(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function setLocalFlag(enabled: boolean): void {
  if (!isBrowser()) return;
  try {
    if (enabled) {
      window.localStorage.setItem(ENABLED_KEY, "1");
    } else {
      window.localStorage.removeItem(ENABLED_KEY);
    }
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

async function isSupported(): Promise<boolean> {
  if (!isBrowser()) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (!getVapidKey()) return false;
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

function buildSwUrl(): string {
  const config = getFirebaseConfig();
  const params = new URLSearchParams();
  if (config.apiKey) params.set("apiKey", config.apiKey);
  if (config.projectId) params.set("projectId", config.projectId);
  if (config.messagingSenderId)
    params.set("messagingSenderId", config.messagingSenderId);
  if (config.appId) params.set("appId", config.appId);
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const url = buildSwUrl();
  const existing = await navigator.serviceWorker.getRegistration(url);
  if (existing) return existing;
  return navigator.serviceWorker.register(url);
}

async function getTokenWithSw(): Promise<string | null> {
  const vapidKey = getVapidKey();
  if (!vapidKey) return null;
  const { getToken, getMessaging } = await import("firebase/messaging");
  const swReg = await registerServiceWorker();
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });
  return token || null;
}

async function postDevice(token: string): Promise<void> {
  await apiClient.post("/api/notifications/devices", {
    token,
    platform: "web",
  });
}

export async function getPushState(): Promise<PushState> {
  if (!isBrowser()) return "unsupported";
  if (!getVapidKey()) return "unsupported";
  const supported = await isSupported();
  if (!supported) return "unsupported";
  const permission =
    typeof Notification !== "undefined"
      ? Notification.permission
      : "denied";
  if (permission === "denied") return "denied";
  if (permission === "granted" && hasLocalFlag()) return "enabled";
  return "default";
}

export async function enablePush(): Promise<PushState> {
  if (!isBrowser()) return "unsupported";
  if (!getVapidKey()) return "unsupported";
  const supported = await isSupported();
  if (!supported) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "default";

  try {
    const token = await getTokenWithSw();
    if (!token) return "default";
    await postDevice(token);
    setLocalFlag(true);
    return "enabled";
  } catch {
    return "default";
  }
}

export async function disablePush(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const { getToken, getMessaging, deleteToken } = await import(
      "firebase/messaging"
    );
    const vapidKey = getVapidKey();
    if (vapidKey) {
      try {
        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey });
        if (token) {
          await apiClient.delete("/api/notifications/devices", {
            data: { token },
          });
        }
      } catch {
        // DELETE failures are non-fatal for logout.
      }
      try {
        await deleteToken(getMessaging());
      } catch {
        // ignore deleteToken failures
      }
    }
  } catch {
    // ignore dynamic import failures
  } finally {
    setLocalFlag(false);
  }
}

export async function refreshPushRegistration(): Promise<void> {
  if (!isBrowser()) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getVapidKey()) return;
  try {
    const token = await getTokenWithSw();
    if (!token) return;
    await postDevice(token);
    setLocalFlag(true);
  } catch {
    // refresh is best-effort
  }
}
