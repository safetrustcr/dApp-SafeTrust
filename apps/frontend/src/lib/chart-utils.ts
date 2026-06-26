import type { LucideIcon } from "lucide-react";

export interface AnalyticsData {
  date: string;
  pageViews: number;
  clicks: number;
  users: number;
}

export interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  /**
   * Lucide React icon component used to illustrate the metric.
   * (Replaces the emoji strings used in the original landing implementation.)
   */
  icon: LucideIcon;
  color: "primary" | "success" | "warning" | "info";
}

export interface ChartConfig {
  dataKey: string;
  label: string;
  color: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

// Generate mock analytics data for demonstration
export const generateMockData = (days: number = 30): AnalyticsData[] => {
  const data: AnalyticsData[] = [];

  // Normalize to start-of-day so the returned window is stable.
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  // Include today in the returned window.
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Deterministic variance based on index (stable across refreshes).
    const wave = (Math.sin(i * 0.9) + 1) / 2; // 0..1
    const noise = (Math.sin(i * 0.17 + 1.3) + 1) / 2; // 0..1

    const basePageViews = 100 + i * 5 + wave * 50;
    const baseClicks = 20 + i * 2 + noise * 10;
    const baseUsers = 50 + i * 3 + wave * 20;

    data.push({
      date: date.toISOString().split("T")[0],
      pageViews: Math.floor(basePageViews),
      clicks: Math.floor(baseClicks),
      users: Math.floor(baseUsers),
    });
  }

  return data;
};

// Calculate percentage change between two values
export const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Format large numbers with appropriate suffixes
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Format currency values
export const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Default chart configurations
export const chartConfigs: Record<string, ChartConfig[]> = {
  line: [
    {
      dataKey: "pageViews",
      label: "Page Views",
      color: "#3b82f6",
      strokeWidth: 3,
    },
    { dataKey: "clicks", label: "Clicks", color: "#22c55e", strokeWidth: 3 },
    {
      dataKey: "users",
      label: "Unique Users",
      color: "#f59e0b",
      strokeWidth: 3,
    },
  ],
  bar: [
    {
      dataKey: "pageViews",
      label: "Page Views",
      color: "#3b82f6",
      fillOpacity: 0.8,
    },
    { dataKey: "clicks", label: "Clicks", color: "#22c55e", fillOpacity: 0.8 },
    {
      dataKey: "users",
      label: "Unique Users",
      color: "#f59e0b",
      fillOpacity: 0.8,
    },
  ],
  area: [
    {
      dataKey: "pageViews",
      label: "Page Views",
      color: "#3b82f6",
      fillOpacity: 0.3,
    },
    { dataKey: "clicks", label: "Clicks", color: "#22c55e", fillOpacity: 0.3 },
    {
      dataKey: "users",
      label: "Unique Users",
      color: "#f59e0b",
      fillOpacity: 0.3,
    },
  ],
};

// Export chart data as CSV
export const exportToCSV = (
  data: AnalyticsData[],
  filename: string = "analytics-data",
) => {
  const headers = ["Date", "Page Views", "Clicks", "Users"];
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      [row.date, row.pageViews, row.clicks, row.users].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Date range presets
export const dateRangePresets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
];
