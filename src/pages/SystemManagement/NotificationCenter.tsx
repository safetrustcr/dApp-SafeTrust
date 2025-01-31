import NotificationCenterHeader from "@/components/modules/notificationCenter/header";
import MetricCards from "@/components/modules/notificationCenter/metric-cards";
import NotificationLists from "@/components/modules/notificationCenter/notification-lists";

const NotificationCenterPage = () => {
  return (
    <main className="space-y-8 p-4">
      <NotificationCenterHeader />
      <MetricCards />
      <NotificationLists />
    </main>
  );
};

export default NotificationCenterPage;
