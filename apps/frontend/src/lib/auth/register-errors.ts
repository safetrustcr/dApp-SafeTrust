import { FirebaseError } from "firebase/app";

export class SyncUserError extends Error {
  constructor(public status?: number) {
    super("sync-user failed");
    this.name = "SyncUserError";
  }
}

export class SyncTimeoutError extends Error {
  constructor() {
    super("sync-user timed out");
    this.name = "SyncTimeoutError";
  }
}

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/weak-password": "Password must be at least 6 characters",
  "auth/invalid-email": "Invalid email address",
  "auth/operation-not-allowed": "Email/password registration is not enabled",
  "auth/network-request-failed": "Network error — please check your connection",
};

const DEFAULT_MESSAGE = "Registration failed — please try again";

export function getRegisterErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) return FIREBASE_ERROR_MESSAGES[err.code] ?? DEFAULT_MESSAGE;
  if (err instanceof SyncTimeoutError) return "Registration timed out — please try again";
  if (err instanceof SyncUserError) return "Could not save your account details — please try again";
  return DEFAULT_MESSAGE;
}
