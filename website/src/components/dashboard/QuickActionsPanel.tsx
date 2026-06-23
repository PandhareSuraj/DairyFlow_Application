import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus,
  Package,
  Users,
  Truck,
  Calendar,
  Settings,
  Building2,
  MapPin,
  BarChart3,
  Gift,
  UserPlus,
  FileText,
  RefreshCw,
  Pause,
  Play,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  onClick: () => void;
}

interface QuickActionsPanelProps {
  role: 'super_admin' | 'dairy_owner' | 'delivery_boy' | 'customer';
  onAction: (actionId: string) => void;
  className?: string;
  compact?: boolean;
}

const getQuickActions = (role: string, onAction: (id: string) => void): QuickAction[] => {
  switch (role) {
    case 'super_admin':
      return [
        { id: 'add-dairy', label: 'Register Dairy', icon: Building2, variant: 'primary', onClick: () => onAction('add-dairy') },
        { id: 'create-owner', label: 'Create Owner', icon: UserPlus, onClick: () => onAction('create-owner') },
        { id: 'system-settings', label: 'Settings', icon: Settings, onClick: () => onAction('system-settings') },
        { id: 'view-reports', label: 'Reports', icon: BarChart3, onClick: () => onAction('view-reports') },
      ];
    case 'dairy_owner':
      return [
        { id: 'add-product', label: 'Add Product', icon: Package, variant: 'primary', onClick: () => onAction('add-product') },
        { id: 'add-customer', label: 'Add Customer', icon: UserPlus, onClick: () => onAction('add-customer') },
        { id: 'add-delivery-boy', label: 'Add Staff', icon: Truck, onClick: () => onAction('add-delivery-boy') },
        { id: 'make-delivery', label: 'Make Delivery', icon: Calendar, onClick: () => onAction('make-delivery') },
        { id: 'manage-orders', label: 'Orders', icon: FileText, onClick: () => onAction('manage-orders') },
        { id: 'view-map', label: 'View Map', icon: MapPin, onClick: () => onAction('view-map') },
      ];
    case 'delivery_boy':
      return [
        { id: 'start-route', label: 'Start Route', icon: Play, variant: 'primary', onClick: () => onAction('start-route') },
        { id: 'view-map', label: 'View Map', icon: MapPin, onClick: () => onAction('view-map') },
        { id: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: () => onAction('refresh') },
      ];
    case 'customer':
      return [
        { id: 'new-subscription', label: 'New Subscription', icon: Plus, variant: 'primary', onClick: () => onAction('new-subscription') },
        { id: 'schedule-delivery', label: 'Schedule', icon: Calendar, onClick: () => onAction('schedule-delivery') },
        { id: 'skip-delivery', label: 'Skip Tomorrow', icon: Pause, onClick: () => onAction('skip-delivery') },
        { id: 'redeem-points', label: 'Redeem Points', icon: Gift, onClick: () => onAction('redeem-points') },
      ];
    default:
      return [];
  }
};

const variantStyles = {
  default: 'border-border hover:bg-muted/50',
  primary: 'bg-gradient-primary text-primary-foreground hover:opacity-90 border-0',
  success: 'bg-success text-success-foreground hover:bg-success/90 border-0',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90 border-0',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0',
};

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  role,
  onAction,
  className,
  compact = false,
}) => {
  const actions = getQuickActions(role, onAction);

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className={cn(
              'h-auto py-2 px-3 flex items-center gap-2',
              variantStyles[action.variant || 'default']
            )}
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn('shadow-soft', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={cn(
                'h-auto flex-col py-4 px-3 space-y-2',
                variantStyles[action.variant || 'default']
              )}
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
              {action.description && (
                <span className="text-xs opacity-70">{action.description}</span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
