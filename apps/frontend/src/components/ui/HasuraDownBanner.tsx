"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const HEALTH_URL = "/api/health/hasura";
const POLL_INTERVAL_MS = 5000;
const START_COMMAND = "cd infra/backend && bin/start safetrust hotel_industry";

export function HasuraDownBanner() {
  const [isDown, setIsDown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Never render in production.
    if (process.env.NODE_ENV === "production") return;

    setMounted(true);
    let active = true;

    const check = async () => {
      try {
        const res = await fetch(HEALTH_URL, { cache: "no-store" });
        if (active) setIsDown(!res.ok);
      } catch {
        if (active) setIsDown(true);
      }
    };

    // Initial check immediately, then poll.
    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!mounted || process.env.NODE_ENV === "production" || !isDown) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold">Hasura is not running</p>
        <p className="mt-1 text-sm">
          Start the backend to restore functionality:
        </p>
        <code className="mt-2 block rounded bg-amber-100 px-2 py-1 font-mono text-xs dark:bg-amber-900">
          {START_COMMAND}
        </code>
      </div>
    </div>
  );
}
