import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'order' | 'delivery' | 'system' | 'loyalty' | 'subscription';
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

interface NotificationCenterProps {
  role: 'super_admin' | 'dairy_owner' | 'delivery_boy' | 'customer';
}

// Mock notifications based on role
const getMockNotifications = (role: string): Notification[] => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  switch (role) {
    case 'super_admin':
      return [
        { id: '1', title: 'New Dairy Registered', message: 'Green Valley Dairy has been added to the platform', type: 'success', category: 'system', timestamp: fiveMinutesAgo, read: false },
        { id: '2', title: 'System Alert', message: 'Database backup completed successfully', type: 'info', category: 'system', timestamp: oneHourAgo, read: false },
        { id: '3', title: 'Usage Spike', message: '500+ new orders processed today', type: 'info', category: 'system', timestamp: twoHoursAgo, read: true },
      ];
    case 'dairy_owner':
      return [
        { id: '1', title: 'New Subscription Request', message: 'John Doe has requested a milk subscription', type: 'info', category: 'subscription', timestamp: fiveMinutesAgo, read: false, actionLabel: 'Review', actionPath: 'subscriptions' },
        { id: '2', title: 'Low Stock Alert', message: 'Buffalo Milk is running low (5 units left)', type: 'warning', category: 'system', timestamp: oneHourAgo, read: false, actionLabel: 'Restock', actionPath: 'products' },
        { id: '3', title: 'Delivery Completed', message: '45 of 50 deliveries completed today', type: 'success', category: 'delivery', timestamp: twoHoursAgo, read: true },
        { id: '4', title: 'New Customer', message: 'Sarah Smith has been added as a new customer', type: 'success', category: 'system', timestamp: twoHoursAgo, read: true },
      ];
    case 'delivery_boy':
      return [
        { id: '1', title: 'New Assignment', message: 'You have 12 deliveries assigned for today', type: 'info', category: 'delivery', timestamp: fiveMinutesAgo, read: false },
        { id: '2', title: 'Route Updated', message: 'Your delivery route has been optimized', type: 'info', category: 'delivery', timestamp: oneHourAgo, read: false },
        { id: '3', title: 'Performance Bonus', message: 'You earned ₹200 bonus for on-time deliveries', type: 'success', category: 'loyalty', timestamp: twoHoursAgo, read: true },
      ];
    case 'customer':
      return [
        { id: '1', title: 'Delivery Scheduled', message: 'Your milk delivery is scheduled for tomorrow 7 AM', type: 'info', category: 'delivery', timestamp: fiveMinutesAgo, read: false },
        { id: '2', title: 'Points Earned', message: 'You earned 50 loyalty points from your last order', type: 'success', category: 'loyalty', timestamp: oneHourAgo, read: false },
        { id: '3', title: 'Subscription Approved', message: 'Your daily milk subscription has been approved', type: 'success', category: 'subscription', timestamp: twoHoursAgo, read: true },
        { id: '4', title: 'Special Offer', message: 'Get 20% off on your next order with code MILK20', type: 'info', category: 'system', timestamp: twoHoursAgo, read: true },
      ];
    default:
      return [];
  }
};

const getNotificationIcon = (category: string) => {
  switch (category) {
    case 'order': return Package;
    case 'delivery': return Package;
    case 'loyalty': return TrendingUp;
    case 'subscription': return Users;
    case 'system': return Settings;
    default: return Bell;
  }
};

const getTypeStyles = (type: string) => {
  switch (type) {
    case 'success': return 'bg-success/10 text-success border-success/20';
    case 'warning': return 'bg-warning/10 text-warning border-warning/20';
    case 'error': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
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
  return `${diffDays}d ago`;
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ role }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch from the backend
    setNotifications(getMockNotifications(role));
  }, [role]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.category);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                        getTypeStyles(notification.type)
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm",
                            !notification.read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {notification.actionLabel && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to action path
                              }}
                            >
                              {notification.actionLabel}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full text-sm h-8" onClick={() => setIsOpen(false)}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
