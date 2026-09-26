import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRegisterErrorMessage, SyncUserError, SyncTimeoutError } from "./register-errors";
import { registerUser } from "./register-user";
import { FirebaseError } from "firebase/app";
import { Auth } from "firebase/auth";

// Mock firebase auth
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
}));

describe("getRegisterErrorMessage", () => {
  it("resolves FirebaseError", () => {
    const err = new FirebaseError("auth/email-already-in-use", "");
    expect(getRegisterErrorMessage(err)).toBe("An account with this email already exists");
  });

  it("resolves unknown FirebaseError to default message", () => {
    const err = new FirebaseError("auth/unknown", "");
    expect(getRegisterErrorMessage(err)).toBe("Registration failed — please try again");
  });

  it("resolves SyncTimeoutError", () => {
    expect(getRegisterErrorMessage(new SyncTimeoutError())).toBe("Registration timed out — please try again");
  });

  it("resolves SyncUserError", () => {
    expect(getRegisterErrorMessage(new SyncUserError())).toBe("Could not save your account details — please try again");
  });

  it("resolves unknown error", () => {
    expect(getRegisterErrorMessage(new Error())).toBe("Registration failed — please try again");
  });
});

describe("registerUser", async () => {
  let mockAuth: Auth;
  let mockUser: any;
  const firebaseAuth = await import("firebase/auth");
  const { createUserWithEmailAndPassword, updateProfile, deleteUser } = vi.mocked(firebaseAuth);

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockAuth = {} as Auth;
    mockUser = {
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    };
    (createUserWithEmailAndPassword as any).mockResolvedValue({ user: mockUser });
    (updateProfile as any).mockResolvedValue(undefined);
    (deleteUser as any).mockResolvedValue(undefined);
  });

  const input = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "password123",
    phone: "123456789",
    phoneCountryCode: "+1",
    location: "us",
  };

  it("returns token on success", async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });
    
    const result = await registerUser(mockAuth, input, "http://backend");
    
    expect(result.token).toBe("mock-token");
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, "john@example.com", "password123");
    expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: "John Doe" });
    expect(global.fetch).toHaveBeenCalledWith("http://backend/api/auth/sync-user", expect.any(Object));
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("calls deleteUser on sync non-OK", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    
    await expect(registerUser(mockAuth, input, "http://backend")).rejects.toThrow(SyncUserError);
    
    expect(deleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("calls deleteUser on timeout", async () => {
    const error = new Error("AbortError");
    error.name = "AbortError";
    (global.fetch as any).mockRejectedValue(error);
    
    await expect(registerUser(mockAuth, input, "http://backend")).rejects.toThrow(SyncTimeoutError);
    
    expect(deleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("calls deleteUser on network error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network failed"));
    
    await expect(registerUser(mockAuth, input, "http://backend")).rejects.toThrow("Network failed");
    
    expect(deleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("preserves original error if deleteUser throws", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const deleteErr = new Error("Delete failed");
    (deleteUser as any).mockRejectedValueOnce(deleteErr);
    
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    await expect(registerUser(mockAuth, input, "http://backend")).rejects.toThrow(SyncUserError);
    
    expect(deleteUser).toHaveBeenCalledWith(mockUser);
    expect(consoleSpy).toHaveBeenCalledWith("[register] rollback failed", deleteErr);
    consoleSpy.mockRestore();
  });
});
