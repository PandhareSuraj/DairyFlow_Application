import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
 import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Map,
  BarChart3,
  Settings,
  Store,
  TrendingUp,
  Gift,
  UserPlus,
  Building2,
  Star,
  Calendar,
  History,
  CreditCard,
  Award
} from 'lucide-react';

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: SidebarItem[];
}

interface DashboardSidebarProps {
  role: 'super_admin' | 'dairy_owner' | 'delivery_boy' | 'customer';
  onNavigate?: (section: string) => void;
  activeSection?: string;
}

const getSidebarItems = (role: string, t: (key: string) => string): SidebarItem[] => {
  switch (role) {
    case 'super_admin':
      return [
         { title: t('sidebar.overview'), icon: LayoutDashboard, path: 'overview' },
         { title: t('sidebar.systemHealth'), icon: TrendingUp, path: 'health' },
         { title: t('sidebar.dairyManagement'), icon: Building2, path: 'dairies' },
         { title: t('sidebar.dataManagement'), icon: BarChart3, path: 'data' },
         { title: t('sidebar.userAnalytics'), icon: Users, path: 'users' },
         { title: t('sidebar.settings'), icon: Settings, path: 'settings' },
      ];
    case 'dairy_owner':
      return [
         { title: t('sidebar.dashboard'), icon: LayoutDashboard, path: 'overview' },
         { title: t('sidebar.products'), icon: Package, path: 'products' },
         { title: t('sidebar.customers'), icon: Users, path: 'customers' },
         { title: t('sidebar.customerMap'), icon: Map, path: 'map' },
         { title: t('sidebar.deliveryBoys'), icon: Truck, path: 'delivery-boys' },
         { title: t('sidebar.deliveries'), icon: Calendar, path: 'deliveries' },
         { title: t('sidebar.analytics'), icon: BarChart3, path: 'analytics' },
         { title: t('sidebar.loyaltyProgram'), icon: Gift, path: 'leaderboard' },
         { title: t('sidebar.referrals'), icon: UserPlus, path: 'referrals' },
         { title: t('sidebar.userManagement'), icon: Settings, path: 'users' },
      ];
    case 'delivery_boy':
      return [
         { title: t('sidebar.todaysRoute'), icon: Map, path: 'route' },
         { title: t('sidebar.deliveries'), icon: Package, path: 'deliveries' },
         { title: t('sidebar.earnings'), icon: CreditCard, path: 'earnings' },
         { title: t('sidebar.performance'), icon: Star, path: 'performance' },
         { title: t('sidebar.history'), icon: History, path: 'history' },
      ];
    case 'customer':
      return [
         { title: t('sidebar.overview'), icon: LayoutDashboard, path: 'overview' },
         { title: t('sidebar.subscriptions'), icon: Package, path: 'subscriptions' },
         { title: t('sidebar.orderHistory'), icon: History, path: 'orders' },
         { title: t('sidebar.loyaltyPoints'), icon: Award, path: 'loyalty' },
         { title: t('sidebar.referrals'), icon: Gift, path: 'referrals' },
         { title: t('sidebar.settings'), icon: Settings, path: 'settings' },
      ];
    default:
      return [];
  }
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  role,
  onNavigate,
  activeSection = 'overview'
}) => {
  const [collapsed, setCollapsed] = useState(false);
   const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
   const items = getSidebarItems(role, (key) => t(`dashboard:${key}`));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
       case 'super_admin': return t('common:roles.superAdmin');
       case 'dairy_owner': return t('common:roles.dairyOwner');
       case 'delivery_boy': return t('common:roles.deliveryBoy');
       case 'customer': return t('common:roles.customer');
       default: return t('common:roles.user');
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">Milk Route AI</h2>
              <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(role)}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {items.map((item) => {
            const isActive = activeSection === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                onClick={() => onNavigate?.(item.path || '')}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="truncate">{item.title}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer - User Info */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
              {user ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
