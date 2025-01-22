import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CircleCheck,
  FileText,
  Filter,
  XCircle,
} from "lucide-react";
import React, { JSX } from "react";

interface CardLabel {
  title: string;
  subtitle: string;
  icon: JSX.Element;
}

function NotificationCenter() {
  const [activeTab, setActiveTab] = React.useState("All"); // Track the active tab

  // Function to handle tab click
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col items-start space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Notification Center
          </h2>
          <h4 className="text-base font-normal tracking-tight">
            Manage and track all your contract notifications
          </h4>
        </div>
        <div className="w-auto items-end lg:items-center gap-3 lg:gap-8 flex flex-col lg:flex-row ">
          <button className="border-[1px] flex gap-2 lg:gap-4 rounded-md  items-center justify-center whitespace-nowrap p-2 lg:p-3 ">
            <Filter color="black" size={16} />
            <span className="text-base text-black">Filter</span>
          </button>

          <button className="bg-transparent/15 gap-2 lg:gap-4 items-center flex flex-row p-2 lg:p-3 whitespace-nowrap rounded-md">
            <Check size={20} color="black" className="text-black" />
            <span className="text-base text-black "> Mark As Read</span>
          </button>
        </div>
      </div>

      <div className="w-full h-auto items-start background-transparent">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metricsData).map(([key, { total, ...extra }]) => (
            <div key={key} className="rounded-xl border bg-card p-6">
              <div className="flex flex-row justify-between items-center w-full">
                <p className="text-sm font-semibold text-black">
                  {cardLabels[key]?.title}
                </p>
                {cardLabels[key]?.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{total}</h2>
                <h4 className="text-xs font-normal text-muted-foreground tracking-tight">
                  {Object.values(extra)[0]} {cardLabels[key]?.subtitle}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Recent Notification
        </h2>
        <div className="w-full flex-col space-y-4">
          <div className="flex flex-row items-center gap-2 my-3 p-2  bg-transparent/10 w-fit rounded-lg">
            <p
              onClick={() => handleTabClick("All")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "All" ? "bg-gray-500 text-white" : "text-gray-500"
              }`}
            >
              All
            </p>

            <p
              onClick={() => handleTabClick("Unread")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "Unread"
                  ? "bg-gray-500 text-white"
                  : "text-gray-500"
              }`}
            >
              Unread
            </p>

            <p
              onClick={() => handleTabClick("Important")}
              className={`cursor-pointer text-sm font-semibold p-1 rounded-lg ${
                activeTab === "Important"
                  ? "bg-gray-500 text-white"
                  : "text-gray-500"
              }`}
            >
              Important
            </p>
          </div>
          {notifications.map(({ id, type, title, message, time, priority }) => (
            <div
              key={id}
              className="flex flex-col lg:flex-row p-6 lg:gap-0 gap-3 justify-between border-gray-500 rounded-xl border  bg-sidebar items-start w-full"
            >
              <div className="flex flex-row gap-4">
                <div>
                  {type === "success" && (
                    <CircleCheck size={20} color="green" />
                  )}
                  {type === "warning" && (
                    <AlertCircle size={20} color="yellow" />
                  )}
                  {type === "error" && <XCircle size={20} color="red" />}
                  {type === "info" && <Bell size={20} color="blue" />}
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold text-black">{title}</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    {message}
                  </p>
                </div>
              </div>

              <div className="flex flex-row justify-end gap-2 items-center">
                {priority && (
                  <p className="bg-red-500 text-center   rounded-full p-1 text-xs font-semibold">
                    {priority}
                  </p>
                )}
                <p className="text-xs font-semibold text-black">{time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;

// Metrics data
const metricsData = {
  allNotifications: {
    total: 28,
    unread: 12,
  },
  contractUpdates: {
    total: 15,
    requireAction: 5,
  },
  depositEvents: {
    total: 8,
    pending: 3,
  },
  disputes: {
    total: 5,
    critical: 2,
  },
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

// Notifications list
const notifications = [
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
