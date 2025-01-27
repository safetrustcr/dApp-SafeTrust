import {
  NotificationAnalyticsCard,
  NotificationCard,
} from "@/components/ui/notification-card";
import {
  AlertTriangle,
  Bell,
  Check,
  CircleCheck,
  FileText,
  Filter,
} from "lucide-react";
import { type JSX, useState } from "react";

function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("All");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-transparent dark:bg-black">
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col items-start space-y-2">
          <h2 className="text-3xl text-black dark:text-white font-bold tracking-tight">
            Notification Center
          </h2>
          <h4 className="text-base text-black dark:text-white/50 font-normal tracking-tight">
            Manage and track all your contract notifications
          </h4>
        </div>
        <div className="w-auto items-end lg:items-center gap-3 lg:gap-8 flex flex-col lg:flex-row ">
          <button
            type="button"
            className="border-[1px] flex gap-2 lg:gap-4 rounded-md items-center justify-center whitespace-nowrap p-2 lg:p-3"
          >
            <Filter className="text-black dark:text-white text-sm" />
            <span className="text-base text-black dark:text-gray-100">
              Filter
            </span>
          </button>

          <button
            type="button"
            className="bg-transparent/15 dark:bg-gray-500/25 gap-2 lg:gap-4 items-center flex flex-row p-2 lg:p-3 whitespace-nowrap rounded-md"
          >
            <Check className="text-black dark:text-white text-sm" />
            <span className="text-base text-black dark:text-gray-100">
              Mark As Read
            </span>
          </button>
        </div>
      </div>

      <div className="w-full h-auto items-start background-transparent">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metricsData).map(([key, { total, unread }]) => {
            const { title, subtitle, icon } = cardLabels[key];
            return (
              <NotificationAnalyticsCard
                key={key}
                total={total}
                unread={unread}
                title={title}
                subtitle={subtitle}
                icon={icon}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-transparent border p-6">
        <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight">
          Recent Notification
        </h2>
        <div className="w-full flex-col space-y-4">
          <div className="flex flex-row items-center gap-2 my-3 p-2  dark:bg-gray-500/25 bg-transparent/10 w-fit rounded-lg">
            <button
              type="button"
              onClick={() => handleTabClick("All")}
              className={`cursor-pointer text-sm font-semibold p-2 rounded-md ${
                activeTab === "All"
                  ? "bg-gray-500 dark:bg-black text-white dark:text-white"
                  : "text-gray-500 dark:text-white/50"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => handleTabClick("Unread")}
              className={`cursor-pointer text-sm font-semibold p-2 rounded-md ${
                activeTab === "Unread"
                  ? "bg-gray-500 dark:bg-black text-white dark:text-white"
                  : "text-gray-500 dark:text-white/50"
              }`}
            >
              Unread
            </button>

            <button
              type="button"
              onClick={() => handleTabClick("Important")}
              className={`cursor-pointer text-sm font-semibold p-2 rounded-md ${
                activeTab === "Important"
                  ? "bg-gray-500 dark:bg-black text-white dark:text-white"
                  : "text-gray-500 dark:text-white/50"
              }`}
            >
              Important
            </button>
          </div>
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} {...notification} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;

const metricsData = {
  allNotifications: { total: 28, unread: 12 },
  contractUpdates: { total: 15, unread: 5 },
  depositEvents: { total: 8, unread: 3 },
  disputes: { total: 5, unread: 2 },
};

type CardLabel = {
  title: string;
  subtitle: string;
  icon: JSX.Element;
};
const cardLabels: Record<string, CardLabel> = {
  allNotifications: {
    title: "All Notifications",
    subtitle: "unread messages",
    icon: <Bell className="text-black dark:text-white text-sm " />,
  },
  contractUpdates: {
    title: "Contracts Update",
    subtitle: "required actions",
    icon: <FileText className="text-black dark:text-white text-sm " />,
  },
  depositEvents: {
    title: "Deposit Events",
    subtitle: "pending confirmations",
    icon: <CircleCheck className="text-black dark:text-white text-sm " />,
  },
  disputes: {
    title: "Disputes",
    subtitle: "critical disputes",
    icon: <AlertTriangle className="text-black dark:text-white text-sm " />,
  },
};

type NotificationType = "success" | "warning" | "error" | "info";

const notifications: {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  priority?: string;
}[] = [
  {
    id: 1,
    type: "success",
    title: "Contract #SC-2401 Signed",
    message:
      "The security deposit contract has been successfully signed by all parties.",
    time: "2 minutes ago",
  },
  {
    id: 2,
    type: "warning",
    title: "Pending Deposit Verification",
    message:
      "Contract #SC-2400 is awaiting deposit verification. Please review the transaction.",
    priority: "High Priority",
    time: "15 minutes ago",
  },
  {
    id: 3,
    type: "error",
    title: "Dispute Filed",
    message:
      "A dispute has been filed for Contract #SC-2399. Immediate attention required.",
    priority: "High Priority",
    time: "1 hour ago",
  },
  {
    id: 4,
    type: "info",
    title: "Contract Update",
    message:
      "Terms have been updated for Contract #SC-2398. Review the changes.",
    time: "2 hours ago",
  },
];
