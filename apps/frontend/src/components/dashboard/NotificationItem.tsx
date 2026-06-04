"use client";

import { Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "info" | "success" | "warning";

interface NotificationItemProps {
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  onClick?: () => void;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  info:    <Info className="h-4 w-4 text-blue-400" />,
  success: <CheckCircle className="h-4 w-4 text-green-400" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-400" />,
};

export function NotificationItem({
  type,
  title,
  message,
  timestamp,
  read,
  onClick,
}: NotificationItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 cursor-pointer",
        "transition-colors hover:bg-gray-800",
        read
          ? "border-gray-700 bg-transparent"
          : "border-gray-600 bg-gray-800/60"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {TYPE_ICON[type]}
      </div>

      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium",
              read ? "text-gray-400" : "text-white"
            )}
          >
            {title}
          </p>
          {!read && (
            <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400">{message}</p>
        <p className="text-xs text-gray-500">{timestamp}</p>
      </div>
    </div>
  );
}
