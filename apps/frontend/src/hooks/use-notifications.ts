"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchNotifications, type DashboardNotification } from "@/lib/api/notifications";

const POLL_INTERVAL_MS = 15_000;

type State = {
  notifications: DashboardNotification[];
  isLoading: boolean;
  error: string | null;
};

/**
 * The signed-in user's real notifications from GET /api/notifications, refreshed
 * every 15 seconds while the tab is visible. Loads as soon as a user is signed
 * in and clears when they sign out. Failures are reported, never replaced with
 * placeholder data; the last good list stays visible while retrying.
 */
export function useNotifications(options: { intervalMs?: number } = {}) {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const [state, setState] = useState<State>({ notifications: [], isLoading: true, error: null });
  const signedIn = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!signedIn.current || inFlight.current) return;
    inFlight.current = true;
    try {
      const notifications = await fetchNotifications();
      if (mounted.current) setState({ notifications, isLoading: false, error: null });
    } catch (error) {
      if (mounted.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Could not load notifications.",
        }));
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      signedIn.current = !!user;
      if (user) {
        void refresh();
      } else {
        setState({ notifications: [], isLoading: false, error: null });
      }
    });
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") void refresh();
    }, intervalMs);

    return () => {
      mounted.current = false;
      unsubscribe();
      clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { ...state, refresh };
}
