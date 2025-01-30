import { notificationMetricsData } from "@/lib/data";

export type notificationType = (typeof notificationMetricsData)[number]["type"];

export interface INotificationMetric {
  title: string;
  infoKey: notificationType;
  description: string;
}

export interface INotification {
  id: number;
  title: string;
  message: string;
  status: "success" | "pending" | "urgent" | "neutral";
  time: string;
}

export interface INotificationMetric {
  title: string;
  infoKey: notificationType;
  description: string;
}

export type appThemeType = "dark" | "light" | "system";
