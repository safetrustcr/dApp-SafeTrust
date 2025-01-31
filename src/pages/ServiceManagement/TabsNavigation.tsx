import { useEffect, useState } from "react";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const tabs: string[] = ["Services", "Reviews", "Certifications"];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mb-6 flex">
        <div className="flex md:gap-4 gap-2 p-1 rounded-lg w-fit bg-muted">
          {tabs.map((tab: string) => (
            <button
              key={tab}
              className="py-2 md:px-4 px-2 font-medium text-sm rounded-lg bg-muted text-muted-foreground"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex">
      <div className="flex md:gap-4 gap-2 p-1 rounded-lg w-fit bg-muted transition-all duration-300">
        {tabs.map((tab: string) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`py-2 md:px-4 px-2 font-medium text-sm rounded-lg transition-all duration-300 ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
