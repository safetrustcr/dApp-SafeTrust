"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPushState, enablePush, disablePush, type PushState } from "@/lib/push";

export function BrowserNotificationsCard() {
  const [state, setState] = useState<PushState>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPushState().then((s) => {
      if (mounted) setState(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (state === "enabled") {
        await disablePush();
        setState("default");
      } else {
        const nextState = await enablePush();
        setState(nextState);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Browser Push Notifications</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Get real-time updates directly in your browser even when the app is in the background.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state === "enabled" ? (
              <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enabled
              </span>
            ) : state === "denied" ? (
              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                Blocked in browser
              </span>
            ) : state === "unsupported" ? (
              <span className="text-xs text-muted-foreground">Not supported</span>
            ) : (
              <span className="text-xs text-muted-foreground">Disabled</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {state === "denied"
              ? "Notifications are blocked in your browser settings. Please grant permissions to receive alerts."
              : state === "unsupported"
              ? "Your browser does not support web push notifications or VAPID is not configured."
              : "Enable to receive escrow status changes, booking updates, and message alerts."}
          </p>
          {state !== "unsupported" && state !== "denied" && (
            <Button
              variant={state === "enabled" ? "outline" : "default"}
              size="sm"
              onClick={handleToggle}
              disabled={loading}
              className="text-xs h-8"
            >
              {loading ? (
                "Updating..."
              ) : state === "enabled" ? (
                <>
                  <BellOff className="h-3.5 w-3.5 mr-1.5" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
                  Enable
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
