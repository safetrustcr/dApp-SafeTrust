import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, ShieldCheck } from "lucide-react";

interface UserProfileCardProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
        <Avatar className="h-16 w-16 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
          <AvatarFallback className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-lg">
            {user.firstName[0]}{user.lastName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap justify-center sm:justify-start">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h2>
            <span className="w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border border-emerald-250 flex items-center gap-1 self-center">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified Guest
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500 justify-center sm:justify-start">
            <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-slate-400" /> {user.email}</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-slate-400" /> {user.phoneNumber}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
