import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface PersonalizedGreetingProps {
  userName: string;
  avatarUrl?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getMotivationalMessage(hour: number): string {
  if (hour < 10) return 'Fresh dairy awaits! 🥛';
  if (hour < 14) return 'Stay healthy today! 💪';
  if (hour < 18) return 'Your orders are on track! ✨';
  return 'Ready for tomorrow? 🌙';
}

export function PersonalizedGreeting({ 
  userName, 
  avatarUrl, 
  notificationCount = 0,
  onNotificationClick,
  onSettingsClick 
}: PersonalizedGreetingProps) {
  const greeting = getGreeting();
  const hour = new Date().getHours();
  const message = getMotivationalMessage(hour);

  return (
    <div className="flex items-center justify-between p-4 pt-safe">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-xl font-bold text-foreground truncate max-w-[180px]">
            {userName}
          </h1>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl"
          onClick={onNotificationClick}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={onSettingsClick}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
