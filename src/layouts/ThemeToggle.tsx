"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore/store";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <button type="button" className="w-auto h-auto" onClick={() => toggleTheme()}>
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-600"/>
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
    </button>
  );
};

export default ThemeToggle;
