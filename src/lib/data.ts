import { INotification } from "@/types";

export const notifications: INotification[] = [
  {
    id: 1,
    title: "Contract #5C-2401 Signed",
    message:
      "The security deposit contract has been successfully signed by all parties",
    status: "success",
    time: "2 minutes ago",
  },
  {
    id: 2,
    title: "Pending Deposit Verification",
    message:
      "Contract #5C-2400 is awaiting deposit verification. Please review the transaction.",
    status: "pending",
    time: "15 minutes ago",
  },
  {
    id: 3,
    title: "Dispute Filed",
    message:
      "A dispute has been filed for Contract #5C-2399. Immediate attention required.",
    status: "urgent",
    time: "1 hour ago",
  },
  {
    id: 4,
    title: "Contract Update",
    message:
      "Terms have been updated for Contract #5C-2398. Review the changes.",
    status: "neutral",
    time: "2 hours ago",
  },
];

export const notificationMetricsData = [
  {
    type: "allNotifications",
    title: "All Notifications",
    total: 28,
    unread: 12,
  },
  {
    type: "contractUpdates",
    title: "Contract Updates",
    total: 15,
    unread: 5,
  },
  {
    type: "depositEvents",
    title: "Deposit Events",
    total: 8,
    unread: 3,
  },
  {
    type: "disputes",
    title: "Disputes",
    total: 5,
    unread: 2,
  },
] as const;
