import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  HelpCircle,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

const securityItems = [
  {
    icon: Shield,
    label: "Security Deposit",
    href: "/dashboard/security-management/security-deposit-types",
  },
  {
    icon: FileCheck,
    label: "Verification Center",
    href: "/dashboard/security-management/verification-center",
  },
  {
    icon: AlertTriangle,
    label: "Dispute Resolution",
    href: "/dashboard/security-management/dispute-resolution",
  },
];

const servicesItems = [
  { icon: Search, label: "Service Search", href: "/dashboard/service-management/service-search" },
  { icon: History, label: "Service History", href: "/dashboard/service-management/service-history" },
  { icon: UserCircle, label: "Provider Profile", href: "/dashboard/service-management/service-history" },
];

const contractItems = [
  {
    icon: LayoutDashboard,
    label: "Smart Contract",
    href: "/dashboard/contract-management/smart-contract-dashboard",
  },
  { icon: FileText, label: "Deposit Terms", href: "/dashboard/contract-management/deposit-terms" },
  { icon: CreditCard, label: "Payment Gateway", href: "/dashboard/contract-management/paid-gateway" },
];

const systemItems = [
  {
    icon: Bell,
    label: "Notification Center",
    href: "/dashboard/system-management/notification-center",
  },
  {
    icon: BarChart2,
    label: "Analytics",
    href: "/dashboard/system-management/analytics-dashboard",
  },
  { icon: HelpCircle, label: "Help Center", href: "/dashboard/system-management/help-center" },
];

export function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex items-center gap-2">
                <img src="/placeholder.svg" alt="Logo" className="h-6 w-6" />
                <span className="font-semibold">SafeTrust</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Security</SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Shield className="mr-2 h-4 w-4" />
                  Security Management
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {securityItems.map((item) => (
                    <SidebarMenuSubItem key={item.label}>
                      <SidebarMenuSubButton asChild>
                        <Link href={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Service Management
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {servicesItems.map((item) => (
                    <SidebarMenuSubItem key={item.label}>
                      <SidebarMenuSubButton asChild>
                        <Link href={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contracts</SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Contract Management
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {contractItems.map((item) => (
                    <SidebarMenuSubItem key={item.label}>
                      <SidebarMenuSubButton asChild>
                        <Link href={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  System Management
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {systemItems.map((item) => (
                    <SidebarMenuSubItem key={item.label}>
                      <SidebarMenuSubButton asChild>
                        <Link href={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src="/placeholder-avatar.jpg"
                      alt="@username"
                    />
                    <AvatarFallback>UN</AvatarFallback>
                  </Avatar>
                  <div className="ml-2 flex flex-col items-start">
                    <span className="text-sm font-medium">John Doe</span>
                    <span className="text-xs text-muted-foreground">
                      0x1234...5678
                    </span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
