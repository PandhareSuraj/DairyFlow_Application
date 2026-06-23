import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Package,
  Users,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Star,
  Gift,
  Building2,
  UserPlus,
  Settings,
  RefreshCw,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'order' | 'delivery' | 'customer' | 'product' | 'system' | 'loyalty' | 'user';
  action: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxHeight?: string;
  showHeader?: boolean;
  title?: string;
  className?: string;
  onRefresh?: () => void;
}

const getActivityIcon = (type: string, status?: string) => {
  const iconClass = 'h-4 w-4';
  
  switch (type) {
    case 'order':
      return <Package className={iconClass} />;
    case 'delivery':
      if (status === 'success') return <CheckCircle className={iconClass} />;
      if (status === 'error') return <XCircle className={iconClass} />;
      return <Truck className={iconClass} />;
    case 'customer':
      return <Users className={iconClass} />;
    case 'product':
      return <Package className={iconClass} />;
    case 'loyalty':
      return <Gift className={iconClass} />;
    case 'user':
      return <UserPlus className={iconClass} />;
    case 'system':
      return <Settings className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
};

const getStatusStyles = (status?: string) => {
  switch (status) {
    case 'success':
      return 'bg-success/10 text-success border-success/20';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'error':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Mock activity generator for demo
export const generateMockActivities = (role: string): ActivityItem[] => {
  const now = new Date();
  const activities: ActivityItem[] = [];

  switch (role) {
    case 'super_admin':
      activities.push(
        { id: '1', type: 'user', action: 'New dairy owner created', description: 'Admin created owner for Fresh Dairy', timestamp: new Date(now.getTime() - 5 * 60000), status: 'success' },
        { id: '2', type: 'system', action: 'System backup', description: 'Database backup completed', timestamp: new Date(now.getTime() - 30 * 60000), status: 'success' },
        { id: '3', type: 'order', action: 'High volume alert', description: '1000+ orders processed today', timestamp: new Date(now.getTime() - 60 * 60000), status: 'info' },
      );
      break;
    case 'dairy_owner':
      activities.push(
        { id: '1', type: 'delivery', action: 'Delivery completed', description: 'Order #1234 delivered to John Doe', timestamp: new Date(now.getTime() - 5 * 60000), status: 'success' },
        { id: '2', type: 'customer', action: 'New subscription', description: 'Jane Smith subscribed to daily milk', timestamp: new Date(now.getTime() - 15 * 60000), status: 'info' },
        { id: '3', type: 'product', action: 'Low stock alert', description: 'Buffalo Milk stock below threshold', timestamp: new Date(now.getTime() - 30 * 60000), status: 'warning' },
        { id: '4', type: 'loyalty', action: 'Points redeemed', description: 'Customer redeemed 500 points', timestamp: new Date(now.getTime() - 45 * 60000), status: 'info' },
        { id: '5', type: 'delivery', action: 'Delivery failed', description: 'Order #1230 - Customer unavailable', timestamp: new Date(now.getTime() - 60 * 60000), status: 'error' },
      );
      break;
    case 'delivery_boy':
      activities.push(
        { id: '1', type: 'delivery', action: 'Delivered', description: 'Sector 12, House 45 - 2L Milk', timestamp: new Date(now.getTime() - 5 * 60000), status: 'success' },
        { id: '2', type: 'delivery', action: 'Delivered', description: 'Sector 12, House 23 - 1L Milk + Curd', timestamp: new Date(now.getTime() - 15 * 60000), status: 'success' },
        { id: '3', type: 'delivery', action: 'Customer not home', description: 'Sector 11, House 10 - Rescheduled', timestamp: new Date(now.getTime() - 25 * 60000), status: 'warning' },
      );
      break;
    case 'customer':
      activities.push(
        { id: '1', type: 'delivery', action: 'Delivery completed', description: 'Your order was delivered', timestamp: new Date(now.getTime() - 2 * 60 * 60000), status: 'success' },
        { id: '2', type: 'loyalty', action: 'Points earned', description: '+50 points from your last order', timestamp: new Date(now.getTime() - 2 * 60 * 60000), status: 'success' },
        { id: '3', type: 'order', action: 'Order confirmed', description: 'Tomorrow\'s delivery scheduled', timestamp: new Date(now.getTime() - 24 * 60 * 60000), status: 'info' },
      );
      break;
  }

  return activities;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  loading = false,
  maxHeight = '400px',
  showHeader = true,
  title = 'Recent Activity',
  className,
  onRefresh,
}) => {
  if (loading) {
    return (
      <Card className={cn('shadow-soft', className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-soft', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea style={{ maxHeight }}>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-3 group">
                  {/* Icon */}
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                    getStatusStyles(activity.status)
                  )}>
                    {getActivityIcon(activity.type, activity.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.action}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
