import React from 'react';
 import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { Milk, LogOut, User, Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  onNavigate?: (section: string) => void;
  onAction?: (action: string) => void;
  onMenuClick?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  onNavigate,
  onAction,
  onMenuClick,
  showSearch = true,
  showNotifications = true,
  className,
}) => {
  const { user, logout } = useAuth();
   const { t } = useTranslation('common');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
       case 'super_admin': return t('roles.superAdmin');
       case 'dairy_owner': return t('roles.dairyOwner');
       case 'delivery_boy': return t('roles.deliveryBoy');
       case 'customer': return t('roles.customer');
       default: return t('roles.user');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
     if (hour < 12) return t('greetings.morning');
     if (hour < 17) return t('greetings.afternoon');
     return t('greetings.evening');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={cn(
      'sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <Milk className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              {title ? (
                <>
                  <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                  {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold text-foreground">
                    {getGreeting()}, {user?.name?.split(' ')[0]}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {user?.dairyName || getRoleLabel(user?.role || '')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center section - Search */}
        {showSearch && (
          <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4">
            <GlobalSearch
              role={user?.role || 'customer'}
              onNavigate={onNavigate}
              onAction={onAction}
            />
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          {showSearch && (
            <div className="md:hidden">
              <GlobalSearch
                role={user?.role || 'customer'}
                onNavigate={onNavigate}
                onAction={onAction}
              />
            </div>
          )}

          {/* Notifications */}
          {showNotifications && (
            <NotificationCenter role={user?.role || 'customer'} />
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {user ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card/95 backdrop-blur-xl border-border/40" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role || '')}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => onAction?.('profile')}
              >
                <User className="mr-2 h-4 w-4" />
                   <span>{t('navigation.profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => onAction?.('settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                   <span>{t('navigation.settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-destructive/10 text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                   <span>{t('navigation.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
