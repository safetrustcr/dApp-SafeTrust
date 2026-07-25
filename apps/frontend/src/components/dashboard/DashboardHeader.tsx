import { Bell, BellRing, Menu, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NotificationData } from './RoleEscrowDashboard';

export interface EscrowDashboardStats {
  total: number;
  active: number;
  completed: number;
  totalValue: number;
}

interface DashboardHeaderProps {
  userRole: 'guest' | 'hotel' | 'admin';
  notifications: NotificationData[];
  onMenuClick?: () => void;
  showAnalytics?: boolean;
  onToggleAnalytics?: () => void;
  stats?: EscrowDashboardStats | null;
  isLoadingStats?: boolean;
  statsError?: string | null;
}

export function DashboardHeader({
  userRole,
  notifications = [],
  onMenuClick,
  showAnalytics = false,
  onToggleAnalytics,
  stats = null,
  isLoadingStats = false,
  statsError = null,
}: DashboardHeaderProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const roleLabels = {
    guest: 'Guest',
    hotel: 'Hotel Manager',
    admin: 'Administrator'
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Escrow Dashboard</h1>
              {onToggleAnalytics && (
                <Button
                  variant={showAnalytics ? 'default' : 'outline'}
                  size="sm"
                  onClick={onToggleAnalytics}
                  className="gap-2"
                  aria-pressed={showAnalytics}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              )}
            </div>
            <p className="hidden sm:block text-sm text-muted-foreground">
              Welcome back! You&apos;re logged in as {roleLabels[userRole]}
            </p>
          </div>

        </div>

        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                {unreadCount > 0 ? (
                  <>
                    <BellRing className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
              <div className="px-2 py-1.5 text-sm font-semibold">
                Notifications
              </div>
              <DropdownMenuSeparator />
              
              {notifications.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id}>
                    <DropdownMenuItem className="flex-col items-start cursor-pointer hover:bg-muted/50">
                      <div className="flex w-full justify-between">
                        <span className="font-medium">
                          {notification.type === 'milestone' ? 'Milestone Update' : 
                           notification.type === 'payment' ? 'Payment Update' : 'Alert'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      {!notification.read && (
                        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                ))
              )}
              
              {notifications.length > 0 && (
                <DropdownMenuItem className="text-sm font-medium text-center justify-center cursor-pointer hover:bg-muted/50">
                  View all notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="hidden md:flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {userRole.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm">
              <div className="font-medium">{roleLabels[userRole]}</div>
              <div className="text-xs text-muted-foreground">
                {userRole}@safetrust.com
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats and Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsError ? (
          <div className="col-span-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-sm flex items-center justify-between">
            <span>Failed to load escrow overview statistics. Click refresh to try again.</span>
          </div>
        ) : isLoadingStats ? (
          <>
            {/* Skeleton 1 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 h-12 w-12 shrink-0"></div>
              </div>
            </div>
            {/* Skeleton 2 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 h-12 w-12 shrink-0"></div>
              </div>
            </div>
            {/* Skeleton 3 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 h-12 w-12 shrink-0"></div>
              </div>
            </div>
            {/* Skeleton 4 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 h-12 w-12 shrink-0"></div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Total Escrows */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Escrows
                  </p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">
                    {stats?.total ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Active */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Active
                  </p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    {stats?.active ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Completed */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Completed
                  </p>
                  <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {stats?.completed ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Total Value */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">
                    ${(stats?.totalValue ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <svg
                    className="w-6 h-6 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
