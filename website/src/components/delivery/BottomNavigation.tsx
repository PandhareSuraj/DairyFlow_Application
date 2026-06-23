import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Package, 
  MapPin, 
  User, 
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: {
    pending: number;
    delivered: number;
  };
}

const navItems = [
  { id: 'deliveries', label: 'Deliveries', icon: Package },
  { id: 'route', label: 'Route', icon: MapPin },
  { id: 'completed', label: 'Done', icon: CheckCircle },
  { id: 'earnings', label: 'Earnings', icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNavigation = ({ activeTab, onTabChange, stats }: BottomNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.id === 'deliveries' && stats.pending > 0;
          const completedBadge = item.id === 'completed' && stats.delivered > 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "scale-110 transition-transform")} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-warning text-warning-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {stats.pending}
                  </span>
                )}
                {completedBadge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-success text-success-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {stats.delivered}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
