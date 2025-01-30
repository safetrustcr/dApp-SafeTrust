import NotificationCenterHeader from "@/components/notification-center/header";
import MetricCards from "@/components/notification-center/metric-cards";
// import NotificationLists from "@/components/NotificationCenter/NotificationLists";

const NotificationCenterPage = () => {
  return (
    <main className="space-y-8 p-4">
      <NotificationCenterHeader />
      <MetricCards />
      {/* <NotificationLists /> */}
    </main>
  );
};

export default NotificationCenterPage;
