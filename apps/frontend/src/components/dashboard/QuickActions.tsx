import {
  Plus,
  User,
  Heart,
  Home,
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  HelpCircle,
  Zap,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

type Action = {
  title: string;
  description: string;
  icon: typeof Plus;
  route: string;
};

const GUEST_ACTIONS: Action[] = [
  {
    title: 'New Booking',
    description: 'Start a new apartment booking',
    icon: Plus,
    route: '/dashboard/guest',
  },
  {
    title: 'My Profile',
    description: 'Update your profile',
    icon: User,
    route: '/dashboard/profile',
  },
  {
    title: 'My Favorites',
    description: 'View saved apartments',
    icon: Heart,
    route: '/dashboard/favorites',
  },
];

const HOST_ACTIONS: Action[] = [
  {
    title: 'Add Property',
    description: 'List a new apartment',
    icon: Plus,
    route: '/dashboard/apartments/new',
  },
  {
    title: 'My Apartments',
    description: 'View and manage your listings',
    icon: Home,
    route: '/dashboard/apartments',
  },
  {
    title: 'Escrow Dashboard',
    description: 'View active escrow transactions',
    icon: LayoutDashboard,
    route: '/dashboard/escrow-dashboard',
  },
];

const ADMIN_ACTIONS: Action[] = [
  {
    title: 'All Escrows',
    description: 'View all escrow transactions',
    icon: FileText,
    route: '/dashboard/escrow',
  },
  {
    title: 'User Management',
    description: 'Manage platform users',
    icon: Users,
    route: '/dashboard/users',
  },
  {
    title: 'Rent Listings',
    description: 'Browse all apartment listings',
    icon: Building2,
    route: '/rent',
  },
];

const NOTIFICATIONS_ACTION: Action = {
  title: 'Notifications',
  description: 'View your notifications',
  icon: Bell,
  route: '/dashboard/notifications',
};

const HELP_ACTION: Action = {
  title: 'Get Help',
  description: 'Contact support or view help docs',
  icon: HelpCircle,
  route: '/dashboard/notifications',
};

interface ActionButtonProps {
  action: Action;
  variant?: 'outline' | 'ghost';
  onClick: () => void;
}

function ActionButton({ action, variant = 'outline', onClick }: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      className="w-full justify-start h-auto py-3 px-4 dark:border-gray-700 dark:hover:bg-gray-800 transition-all duration-150 hover:shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary dark:bg-primary/20 shrink-0">
          <action.icon className="h-4 w-4" />
        </div>
        <div className="text-left min-w-0">
          <div className="font-medium dark:text-white text-sm">{action.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {action.description}
          </div>
        </div>
      </div>
    </Button>
  );
}

interface QuickActionsProps {
  userRole: 'guest' | 'hotel' | 'admin';
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const router = useRouter();

  const actions =
    userRole === 'guest'
      ? GUEST_ACTIONS
      : userRole === 'hotel'
        ? HOST_ACTIONS
        : ADMIN_ACTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium dark:text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.route}
              action={action}
              variant="outline"
              onClick={() => router.push(action.route)}
            />
          ))}
        </div>

        <div className="border-t dark:border-gray-700 pt-4 space-y-2">
          <ActionButton
            action={NOTIFICATIONS_ACTION}
            variant="ghost"
            onClick={() => router.push(NOTIFICATIONS_ACTION.route)}
          />
          <ActionButton
            action={HELP_ACTION}
            variant="ghost"
            onClick={() => router.push(HELP_ACTION.route)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
