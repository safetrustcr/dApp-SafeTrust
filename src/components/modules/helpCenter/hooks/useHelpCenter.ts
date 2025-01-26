"use client";

import { useState } from "react";

export function useHelpCenter() {
  const [activeTab, setActiveTab] = useState("FAQ");

  return {
    activeTab,
    setActiveTab,
  };
}
