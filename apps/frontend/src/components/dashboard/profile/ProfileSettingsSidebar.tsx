import React from "react";
import { User, Shield, Bell, CreditCard, HelpCircle } from "lucide-react";

export function ProfileSettingsSidebar() {
  const menuItems = [
    { icon: <User className="h-4 w-4" />, label: "My Details", active: true },
    { icon: <Shield className="h-4 w-4" />, label: "Privacy & Security", active: false },
    { icon: <Bell className="h-4 w-4" />, label: "Notifications", active: false },
    { icon: <CreditCard className="h-4 w-4" />, label: "Billing & Plans", active: false },
    { icon: <HelpCircle className="h-4 w-4" />, label: "Support", active: false },
  ];

  return (
    <div className="w-full md:w-[240px] shrink-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-6">
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Settings</h3>
        <p className="text-[10px] text-slate-400">Configure your profile settings</p>
      </div>

      <nav className="flex flex-col gap-1.5">
        {menuItems.map((item, i) => (
          <button
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              item.active
                ? "bg-blue-50 dark:bg-blue-950/25 text-blue-600 border border-blue-100 dark:border-blue-900/30"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 border border-transparent"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
