import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { Eye, MousePointerClick, Users, BarChart3 } from "lucide-react";
import {
  AnalyticsData,
  MetricData,
  calculateChange,
} from "@/lib/chart-utils";
import { GET_ESCROW_ANALYTICS } from "@/graphql/queries/escrow-queries";

interface UseAnalyticsDataOptions {
  dateRange: { start: Date; end: Date } | null;
  refreshInterval?: number;
}

interface UseAnalyticsDataReturn {
  data: AnalyticsData[];
  metrics: MetricData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Format a Date as a `YYYY-MM-DD` string suitable for a Postgres `date` arg. */
function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Provides analytics data for the escrow dashboard.
 *
 * Data is sourced from the `get_escrow_analytics_by_day` Hasura stored
 * function which aggregates `trustless_work_webhook_events` and `users`
 * by day.
 */
export const useAnalyticsData = ({
  dateRange,
  refreshInterval = 60_000,
}: UseAnalyticsDataOptions): UseAnalyticsDataReturn => {
  const startDate = dateRange?.start ?? new Date(Date.now() - 30 * 86_400_000);
  const endDate = dateRange?.end ?? new Date();

  const { data, loading, error, refetch } = useQuery(GET_ESCROW_ANALYTICS, {
    variables: {
      start_date: toDateString(startDate),
      end_date: toDateString(endDate),
      tenant_id: "safetrust",
    },
    pollInterval: refreshInterval,
  });

  const analyticsData: AnalyticsData[] = useMemo(() => {
    const rows: Array<{
      day: string;
      page_views: number;
      clicks: number;
      users: number;
    }> | null | undefined = data?.getEscrowAnalyticsByDay;

    if (!Array.isArray(rows)) return [];

    return rows.map((row) => ({
      date: row.day,
      pageViews: Number(row.page_views),
      clicks: Number(row.clicks),
      users: Number(row.users),
    }));
  }, [data]);

  const metrics: MetricData[] = useMemo(() => {
    if (analyticsData.length < 1) return [];

    const latest = analyticsData[analyticsData.length - 1];
    const previous =
      analyticsData.length > 1
        ? analyticsData[analyticsData.length - 2]
        : { pageViews: 0, clicks: 0, users: 0 };

    const totalPageViews = analyticsData.reduce(
      (sum, item) => sum + item.pageViews,
      0,
    );
    const totalClicks = analyticsData.reduce(
      (sum, item) => sum + item.clicks,
      0,
    );
    const totalUsers = analyticsData.reduce(
      (sum, item) => sum + item.users,
      0,
    );
    const maxDailyUsers = Math.max(
      ...analyticsData.map((item) => item.users),
    );

    return [
      {
        label: "Total Page Views",
        value: totalPageViews,
        change: calculateChange(latest.pageViews, previous.pageViews),
        trend: latest.pageViews >= previous.pageViews ? "up" : "down",
        icon: Eye,
        color: "primary",
      },
      {
        label: "Total Interactions",
        value: totalClicks,
        change: calculateChange(latest.clicks, previous.clicks),
        trend: latest.clicks >= previous.clicks ? "up" : "down",
        icon: MousePointerClick,
        color: "success",
      },
      {
        label: "Active Users (Peak)",
        value: maxDailyUsers,
        change: calculateChange(latest.users, previous.users),
        trend: latest.users >= previous.users ? "up" : "down",
        icon: Users,
        color: "info",
      },
      {
        label: "Avg Actions/User",
        value:
          totalUsers > 0 ? (totalPageViews + totalClicks) / totalUsers : 0,
        change: 0,
        trend: "neutral",
        icon: BarChart3,
        color: "warning",
      },
    ];
  }, [analyticsData]);

  return {
    data: analyticsData,
    metrics,
    isLoading: loading,
    error: error?.message ?? null,
    refetch,
  };
};
