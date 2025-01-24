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
import { JSX, useState } from "react";

function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("All");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col items-start space-y-2">
          <h2 className="text-3xl text-black dark:text-white font-bold tracking-tight">
            Notification Center
          </h2>
          <h4 className="text-base text-black dark:text-gray-200 font-normal tracking-tight">
            Manage and track all your contract notifications
          </h4>
        </div>
        <div className="w-auto items-end lg:items-center gap-3 lg:gap-8 flex flex-col lg:flex-row ">
          <button className="border-[1px] flex gap-2 lg:gap-4 rounded-md  items-center justify-center whitespace-nowrap p-2 lg:p-3 ">
            <Filter color="black" size={16} />
            <span className="text-base text-black dark:text-gray-100">
              Filter
            </span>
          </button>

          <button className="bg-transparent/15 gap-2 lg:gap-4 items-center flex flex-row p-2 lg:p-3 whitespace-nowrap rounded-md">
            <Check size={20} color="black" className="text-black" />
            <span className="text-base text-black  dark:text-gray-100">
              {" "}
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

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight">
          Recent Notification
        </h2>
        <div className="w-full flex-col space-y-4">
          <div className="flex flex-row items-center gap-2 my-3 p-2  bg-transparent/10 w-fit rounded-lg">
            <p
              onClick={() => handleTabClick("All")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "All"
                  ? "bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-800"
                  : "text-gray-500 dark:text-white"
              }`}
            >
              All
            </p>

            <p
              onClick={() => handleTabClick("Unread")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "Unread"
                  ? "bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-800"
                  : "text-gray-500 dark:text-white"
              }`}
            >
              Unread
            </p>

            <p
              onClick={() => handleTabClick("Important")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "Important"
                  ? "bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-800"
                  : "text-gray-500 dark:text-white"
              }`}
            >
              Important
            </p>
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
    icon: <Bell size={16} color="black" />,
  },
  contractUpdates: {
    title: "Contracts Update",
    subtitle: "required actions",
    icon: <FileText size={16} color="black" />,
  },
  depositEvents: {
    title: "Deposit Events",
    subtitle: "pending confirmations",
    icon: <CircleCheck size={16} color="black" />,
  },
  disputes: {
    title: "Disputes",
    subtitle: "critical disputes",
    icon: <AlertTriangle size={16} color="black" />,
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
