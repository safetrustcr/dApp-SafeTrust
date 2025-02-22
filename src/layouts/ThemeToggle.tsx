"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore/store";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <button className="py-4" onClick={() => toggleTheme()}>
      {theme === "dark" ? (
        <Sun className="text-white h-5 w-5" />
      ) : (
        <Moon className="text-gray-700 h-5 w-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
