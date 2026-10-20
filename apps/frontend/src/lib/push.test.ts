// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const mockPost = vi.fn(() => Promise.resolve({}));
const mockDelete = vi.fn(() => Promise.resolve({}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    post: mockPost,
    delete: mockDelete,
  },
}));

const mockGetToken = vi.fn(() => Promise.resolve("test-token"));
const mockDeleteToken = vi.fn(() => Promise.resolve());
const mockIsSupported = vi.fn(() => Promise.resolve(true));
const mockGetMessaging = vi.fn(() => ({}));

vi.mock("firebase/messaging", () => ({
  getToken: mockGetToken,
  deleteToken: mockDeleteToken,
  isSupported: mockIsSupported,
  getMessaging: mockGetMessaging,
}));

declare global {
  interface Window {
    Notification: typeof Notification;
  }
}

function setupEnv(vapidKey = "vapid-key") {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", vapidKey);
}


const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

function stubServiceWorker() {
  const registration = { scope: "/" } as unknown as ServiceWorkerRegistration;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn(() => Promise.resolve(registration)),
      register: vi.fn(() => Promise.resolve(registration)),
    },
  });
  return registration;
}

function restoreServiceWorker() {
  if (originalServiceWorker) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  } else {
    // eslint-disable-next-line
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;

  }
}

function stubNotification(
  permission: NotificationPermission,
  requestResult?: NotificationPermission
) {
  const requestPermission = vi.fn(() => Promise.resolve(requestResult ?? permission));
  const ctor = function () {} as unknown as typeof Notification;
  Object.defineProperty(ctor, "permission", {
    configurable: true,
    get: () => permission,
  });
  (ctor as unknown as { requestPermission: typeof requestPermission }).requestPermission =
    requestPermission;
  vi.stubGlobal("Notification", ctor);
  return requestPermission;
}

describe("lib/push", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockPost.mockClear();
    mockDelete.mockClear();
    mockGetToken.mockClear();
    mockDeleteToken.mockClear();
    mockIsSupported.mockClear();
    mockGetMessaging.mockClear();
    mockGetToken.mockReset();
    mockGetToken.mockImplementation(() => Promise.resolve("test-token"));
    mockIsSupported.mockImplementation(() => Promise.resolve(true));
    window.localStorage.clear();
    stubServiceWorker();
    setupEnv();
  });

  afterEach(() => {
    restoreServiceWorker();
    vi.unstubAllGlobals();
  });

  it("returns unsupported when VAPID key is missing", async () => {
    setupEnv("");
    const { getPushState } = await import("./push");
    await expect(getPushState()).resolves.toBe("unsupported");
  });

  it("returns unsupported when browser is not supported", async () => {
    mockIsSupported.mockImplementation(() => Promise.resolve(false));
    stubNotification("default");
    const { getPushState } = await import("./push");
    await expect(getPushState()).resolves.toBe("unsupported");
  });

  it("returns denied when permission is denied", async () => {
    stubNotification("denied");
    const { getPushState } = await import("./push");
    await expect(getPushState()).resolves.toBe("denied");
  });

  it("returns default when permission is granted but not enabled locally", async () => {
    stubNotification("granted");
    const { getPushState } = await import("./push");
    await expect(getPushState()).resolves.toBe("default");
  });

  it("returns enabled when permission granted and local flag set", async () => {
    stubNotification("granted");
    window.localStorage.setItem("safetrust:push:enabled", "1");
    const { getPushState } = await import("./push");
    await expect(getPushState()).resolves.toBe("enabled");
  });

  it("enablePush requests permission and registers device", async () => {
    const requestPermission = stubNotification("default", "granted");
    const { enablePush } = await import("./push");
    await expect(enablePush()).resolves.toBe("enabled");
    expect(requestPermission).toHaveBeenCalled();
    expect(mockGetToken).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      "/api/notifications/devices",
      expect.objectContaining({ token: "test-token", platform: "web" })
    );
  });

  it("enablePush returns denied when permission rejected", async () => {
    stubNotification("default", "denied");
    const { enablePush } = await import("./push");
    await expect(enablePush()).resolves.toBe("denied");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("enablePush returns unsupported without VAPHD key", async () => {
    setupEnv("");
    const { enablePush } = await import("./push");
    await expect(enablePush()).resolves.toBe("unsupported");
  });


  it("disablePush deletes device and token", async () => {
    window.localStorage.setItem("safetrust:push:enabled", "1");
    const { disablePush } = await import("./push");
    await disablePush();
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteToken).toHaveBeenCalled();
    expect(window.localStorage.getItem("safetrust:push:enabled")).toBeNull();
  });

  it("disablePush never throws when API delete fails", async () => {
    mockDelete.mockRejectedValue(new Error("network"));
    const { disablePush } = await import("./push");
    await expect(disablePush()).resolves.toBeUndefined();
  });


  it("refreshPushRegistration posts token when permission granted", async () => {
    stubNotification("granted");
    const { refreshPushRegistration } = await import("./push");
    await refreshPushRegistration();
    expect(mockPost).toHaveBeenCalled();
  });

  it("refreshPushRegistration does nothing when permission not granted", async () => {
    stubNotification("default");
    const { refreshPushRegistration } = await import("./push");
    await refreshPushRegistration();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
