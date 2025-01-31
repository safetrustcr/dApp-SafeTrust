import * as Tabs from "@radix-ui/react-tabs";
import { notifications } from "@/lib/data";
import { INotification } from "@/types";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

const NotificationCard = (data: INotification) => {
  const { title, message, status, time } = data;

  const isHighPriority = ["pending", "urgent"].includes(status);

  const statusIndicator =
    status === "pending" ? (
      <span className="h-2 w-3 sm:w-2 mr-2 rounded-full bg-[#eab30b] mt-1" />
    ) : status === "urgent" ? (
      <span className="h-2 w-3 sm:w-2 mr-2 rounded-full bg-[#ef4444] mt-1" />
    ) : status === "success" ? (
      <span className="h-2 w-3 sm:w-2 mr-2 rounded-full bg-[#22c55f] mt-1" />
    ) : status === "neutral" ? (
      <span className="h-2 w-3 sm:w-2 mr-2 rounded-full bg-[#3b82f6] mt-1" />
    ) : null;

  return (
    <Card className="flex flex-col lg:flex-row justify-between items-start p-6">
      <div className="flex">
        {statusIndicator}
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center gap-x-2">
            <CardTitle>{title}</CardTitle>
            {isHighPriority ? (
              <span className="hidden md:inline-flex bg-[#ef4444] text-white text-xs py-0.5 px-2 rounded-sm">
                High Priority
              </span>
            ) : null}
          </div>
          <CardDescription>{message}</CardDescription>
        </div>
      </div>
      <CardDescription className="ml-4 mt-2 lg:mt-0">{time}</CardDescription>
    </Card>
  );
};

const NotificationLists = () => {
  const importantNotifications = notifications.filter((notification) =>
    ["pending", "urgent"].includes(notification.status)
  );

  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "pending"
  );

  return (
    <Tabs.Root className="flex flex-col" defaultValue="all">
      <Tabs.List
        className="flex-shrink-0 flex border-b border-[#ecedf0] dark:border-gray-800"
        aria-label="Notification List filters"
      >
        <Tabs.Trigger
          className="py-2 px-6 text-[#9196a1] hover:text-[#464c58] data-[state=active]:text-[#464c58] focus:relative focus:shadow-[0_0_0_2px_black] data-[state=active]:[box-shadow:inset_0_0_0_0_#464c58,0_1px_0_0_#464c58] dark:data-[state=active]:text-[#b3bed5] dark:data-[state=active]:[box-shadow:inset_0_0_0_0_#b3bed5,0_1px_0_0_#b3bed5]"
          value="all"
        >
          All
        </Tabs.Trigger>
        <Tabs.Trigger
          className="py-2 px-6 text-[#9196a1] hover:text-[#464c58] data-[state=active]:text-[#464c58] focus:relative focus:shadow-[0_0_0_2px_black] data-[state=active]:[box-shadow:inset_0_-1px_0_0_#464c58,0_1px_0_0_#464c58] dark:data-[state=active]:text-[#b3bed5] dark:data-[state=active]:[box-shadow:inset_0_0_0_0_#b3bed5,0_1px_0_0_#b3bed5]"
          value="unread"
        >
          Unread
        </Tabs.Trigger>
        <Tabs.Trigger
          className="py-2 px-6 text-[#9196a1] hover:text-[#464c58] data-[state=active]:text-[#464c58] focus:relative focus:shadow-[0_0_0_0_black] data-[state=active]:[box-shadow:0_1px_0_0_#464c58] dark:data-[state=active]:text-[#b3bed5] dark:data-[state=active]:[box-shadow:inset_0_0_0_0_#b3bed5,0_1px_0_0_#b3bed5]"
          value="important"
        >
          Important
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="all" className="py-6 space-y-6 y-6">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </Tabs.Content>
      <Tabs.Content value="unread" className="py-6 space-y-6 y-6">
        {unreadNotifications.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </Tabs.Content>
      <Tabs.Content value="important" className="py-6 space-y-6 y-6">
        {importantNotifications.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </Tabs.Content>
    </Tabs.Root>
  );
};

export default NotificationLists;
