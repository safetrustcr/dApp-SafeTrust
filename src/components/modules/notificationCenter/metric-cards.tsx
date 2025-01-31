import { Bell, FileCheck, Clock4, TriangleAlert } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { notificationMetricsData } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { notificationType } from "@/types";

const MetricCard = ({
  type,
  title = "",
  total = 0,
  unread = 0,
}: {
  type: notificationType;
  title: string;
  total: number;
  unread: number;
}) => {
  const Icon =
    type === "allNotifications" ? (
      <Bell className="h-5 w-5" color="#6d6d75" />
    ) : type === "contractUpdates" ? (
      <FileCheck className="h-5 w-5" color="#6d6d75" />
    ) : type === "depositEvents" ? (
      <Clock4 className="h-5 w-5" color="#6d6d75" />
    ) : type === "disputes" ? (
      <TriangleAlert className="h-5 w-5" color="#6d6d75" />
    ) : null;

  const description =
    type === "allNotifications"
      ? "unread messages"
      : type === "contractUpdates"
      ? "require action"
      : type === "depositEvents"
      ? "pending confirmation"
      : type === "disputes"
      ? "critical disputes"
      : null;

  return (
    <Card className="flex-1 pl-0 pr-6 py-0 rounded-none flex justify-between items-start shadow-none border-none">
      <div>
        <CardTitle className="text-2xl font-semibold">{total}</CardTitle>

        <CardHeader className="text-sm p-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm">
            <span>{unread}</span> {description}
          </CardDescription>
        </CardHeader>
      </div>

      {Icon}
    </Card>
  );
};

const MetricCards = () => {
  const Seperator = (
    <Separator orientation="vertical" className="hidden lg:block" />
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
      <div className="flex flex-1">
        <MetricCard {...notificationMetricsData[0]} />
        {Seperator}
      </div>
      <div className="flex flex-1">
        <MetricCard {...notificationMetricsData[1]} />
        {Seperator}
      </div>
      <div className="flex flex-1">
        <MetricCard {...notificationMetricsData[2]} />
        {Seperator}
      </div>
      <MetricCard {...notificationMetricsData[3]} />
    </div>
  );
};

export default MetricCards;
