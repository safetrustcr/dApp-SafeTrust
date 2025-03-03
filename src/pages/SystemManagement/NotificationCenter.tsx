import NotificationCenterHeader from "@/components/modules/notificationCenter/header";
import MetricCards from "@/components/modules/notificationCenter/metric-cards";
import NotificationLists from "@/components/modules/notificationCenter/notification-lists";
import { useNotifications } from "@/hooks/use-notifications";

const NotificationCenterPage = () => {
  const { markAllAsRead } = useNotifications();

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  return (
    <main className="space-y-8 p-4">
      <NotificationCenterHeader onMarkAllAsRead={handleMarkAllAsRead} />
      <MetricCards />
      <NotificationLists />
    </main>
  );
};

export default NotificationCenterPage;
