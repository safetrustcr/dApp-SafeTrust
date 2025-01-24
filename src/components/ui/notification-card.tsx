import { AlertCircle, Bell, CircleCheck, XCircle } from "lucide-react";
import { JSX } from "react";
interface NotificationAnalyticsCardProps {
  total: string | number;
  subtitle: string;
  icon: JSX.Element;
  unread: string | number;
  title: string;
}

export function NotificationAnalyticsCard({
  total,
  subtitle,
  icon,
  unread,
  title,
}: NotificationAnalyticsCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold dark:text-white text-black">
          {title}
        </p>
        {icon}
      </div>
      <div>
        <h2 className="text-2xl  text-black dark:text-gray-100 font-bold">
          {total}
        </h2>
        <p className="text-xs text-black dark:text-white/50 text-muted-foreground">
          {unread} {subtitle}
        </p>
      </div>
    </div>
  );
}

export type NotificationType = "success" | "warning" | "error" | "info";

export interface NotificationCardProps {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  priority?: string;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  type,
  title,
  message,
  time,
  priority,
}) => {
  const notificationIconColor: Record<NotificationType, JSX.Element> = {
    success: <CircleCheck size={20} color="green" />,
    warning: <AlertCircle size={20} color="yellow" />,
    error: <XCircle size={20} color="red" />,
    info: <Bell size={20} color="blue" />,
  };

  return (
    <div className="flex flex-col lg:flex-row p-6 lg:gap-0 gap-3 dark:bg-gray-500/25 justify-between border-gray-500 rounded-xl border bg-sidebar items-start w-full">
      <div className="flex flex-row gap-4">
        <div>{notificationIconColor[type]}</div>
        <div className="flex flex-col space-y-2">
          <p className="text-sm font-semibold dark:text-white text-black">
            {title}
          </p>
          <p className="text-sm font-normal text-muted-foreground">{message}</p>
        </div>
      </div>
      <div className="flex flex-row justify-end gap-2 items-center">
        {priority && (
          <p className="bg-red-500 text-center rounded-full p-1 text-xs font-semibold">
            {priority}
          </p>
        )}
        <p className="text-xs font-semibold dark:text-muted-foreground text-black">
          {time}
        </p>
      </div>
    </div>
  );
};
