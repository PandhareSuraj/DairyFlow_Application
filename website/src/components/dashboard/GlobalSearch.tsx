import React, { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Users,
  Truck,
  Building2,
  Calendar,
  Settings,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  category: 'navigation' | 'action' | 'recent';
  icon: React.ElementType;
  action?: () => void;
}

interface GlobalSearchProps {
  role: 'super_admin' | 'dairy_owner' | 'delivery_boy' | 'customer';
  onNavigate?: (section: string) => void;
  onAction?: (action: string) => void;
}

const getSearchItems = (role: string): SearchItem[] => {
  const baseItems: SearchItem[] = [
    { id: 'settings', title: 'Settings', description: 'Manage your preferences', category: 'navigation', icon: Settings },
  ];

  switch (role) {
    case 'super_admin':
      return [
        { id: 'overview', title: 'Dashboard Overview', description: 'View system statistics', category: 'navigation', icon: TrendingUp },
        { id: 'dairies', title: 'Manage Dairies', description: 'View and manage all dairies', category: 'navigation', icon: Building2 },
        { id: 'users', title: 'User Analytics', description: 'View user activity', category: 'navigation', icon: Users },
        { id: 'data', title: 'Data Management', description: 'Manage system data', category: 'navigation', icon: BarChart3 },
        { id: 'add-dairy', title: 'Register New Dairy', description: 'Add a new dairy to the system', category: 'action', icon: Building2 },
        { id: 'create-owner', title: 'Create Dairy Owner', description: 'Create a new dairy owner account', category: 'action', icon: Users },
        ...baseItems,
      ];
    case 'dairy_owner':
      return [
        { id: 'overview', title: 'Dashboard', description: 'View your dashboard', category: 'navigation', icon: TrendingUp },
        { id: 'products', title: 'Products', description: 'Manage your products', category: 'navigation', icon: Package },
        { id: 'customers', title: 'Customers', description: 'View and manage customers', category: 'navigation', icon: Users },
        { id: 'delivery-boys', title: 'Delivery Boys', description: 'Manage delivery personnel', category: 'navigation', icon: Truck },
        { id: 'deliveries', title: 'Deliveries', description: 'View today\'s deliveries', category: 'navigation', icon: Calendar },
        { id: 'analytics', title: 'Analytics', description: 'View performance analytics', category: 'navigation', icon: BarChart3 },
        { id: 'add-product', title: 'Add New Product', description: 'Create a new product', category: 'action', icon: Package },
        { id: 'add-customer', title: 'Add New Customer', description: 'Register a new customer', category: 'action', icon: Users },
        { id: 'add-delivery-boy', title: 'Add Delivery Boy', description: 'Register a new delivery personnel', category: 'action', icon: Truck },
        ...baseItems,
      ];
    case 'delivery_boy':
      return [
        { id: 'route', title: 'Today\'s Route', description: 'View optimized delivery route', category: 'navigation', icon: Truck },
        { id: 'deliveries', title: 'Pending Deliveries', description: 'View pending deliveries', category: 'navigation', icon: Package },
        { id: 'earnings', title: 'Earnings', description: 'View your earnings', category: 'navigation', icon: TrendingUp },
        { id: 'performance', title: 'Performance', description: 'View your performance stats', category: 'navigation', icon: BarChart3 },
        ...baseItems,
      ];
    case 'customer':
      return [
        { id: 'overview', title: 'Dashboard', description: 'View your dashboard', category: 'navigation', icon: TrendingUp },
        { id: 'subscriptions', title: 'My Subscriptions', description: 'Manage your subscriptions', category: 'navigation', icon: Package },
        { id: 'orders', title: 'Order History', description: 'View past orders', category: 'navigation', icon: FileText },
        { id: 'loyalty', title: 'Loyalty Points', description: 'View your rewards', category: 'navigation', icon: TrendingUp },
        { id: 'new-subscription', title: 'New Subscription', description: 'Request a new subscription', category: 'action', icon: Package },
        { id: 'schedule-delivery', title: 'Schedule Delivery', description: 'Schedule a one-time delivery', category: 'action', icon: Calendar },
        ...baseItems,
      ];
    default:
      return baseItems;
  }
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  role,
  onNavigate,
  onAction
}) => {
  const [open, setOpen] = useState(false);
  const items = getSearchItems(role);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((item: SearchItem) => {
    setOpen(false);
    if (item.category === 'action') {
      onAction?.(item.id);
    } else {
      onNavigate?.(item.id);
    }
  }, [onAction, onNavigate]);

  const navigationItems = items.filter(i => i.category === 'navigation');
  const actionItems = items.filter(i => i.category === 'action');

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {actionItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                {actionItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Action
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
