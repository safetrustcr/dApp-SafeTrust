"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface UserProfileCardProps {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  location?: string | null;
  className?: string;
}

export function UserProfileCard({
  firstName,
  lastName,
  email,
  location,
  className,
}: UserProfileCardProps) {
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    email[0].toUpperCase();

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-semibold text-white shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{fullName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
        {location && (
          <p className="text-xs text-muted-foreground">{location}</p>
        )}
      </div>
    </div>
  );
}
