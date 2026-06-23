import React from 'react';
import { Home, ShoppingBag, Gift, User, Bell, ChevronRight, Truck, Star, Calendar } from 'lucide-react';

export function CustomerMockup() {
  return (
    <div className="w-full h-full bg-background flex flex-col text-[10px]">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-primary to-primary/80">
        <div className="flex items-center justify-between text-primary-foreground">
          <div>
            <div className="text-[8px] opacity-80">Good Morning ☀️</div>
            <div className="font-bold text-xs">Priya!</div>
          </div>
          <div className="relative">
            <Bell className="w-4 h-4" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
          </div>
        </div>
      </div>

      {/* Loyalty card */}
      <div className="mx-2 -mt-1 bg-card rounded-xl p-2 shadow-medium border border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-2">
          {/* Progress ring */}
          <div className="relative w-10 h-10">
            <svg className="w-full h-full -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle 
                cx="20" cy="20" r="16" fill="none" 
                stroke="hsl(var(--primary))" strokeWidth="3"
                strokeDasharray={`${0.7 * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="w-3 h-3 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">Gold Member</span>
              <span className="text-[7px] bg-warning/20 text-warning px-1 rounded">⭐</span>
            </div>
            <div className="text-[8px] text-muted-foreground">850 / 1000 points to Platinum</div>
            <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full w-[85%] bg-gradient-to-r from-primary to-warning rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Active subscription */}
      <div className="mx-2 mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-foreground">Active Subscription</span>
          <span className="text-[8px] text-primary">View all →</span>
        </div>
        <div className="bg-card rounded-lg p-2 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              🥛
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">Farm Fresh Milk</div>
              <div className="text-[8px] text-muted-foreground">500ml • Daily at 6:30 AM</div>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Today's delivery */}
      <div className="mx-2 mt-2 flex-1">
        <div className="font-semibold text-foreground mb-1.5">Today's Delivery</div>
        <div className="bg-success/10 rounded-lg p-2 border border-success/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Truck className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-success">On the way!</div>
              <div className="text-[8px] text-muted-foreground">Arriving in ~15 minutes</div>
            </div>
          </div>
          {/* Mini timeline */}
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <div className="flex-1 h-0.5 bg-success" />
            <div className="w-2 h-2 rounded-full bg-success" />
            <div className="flex-1 h-0.5 bg-success" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="flex-1 h-0.5 bg-muted" />
            <div className="w-2 h-2 rounded-full bg-muted" />
          </div>
          <div className="flex justify-between text-[6px] text-muted-foreground mt-0.5">
            <span>Picked</span>
            <span>Out</span>
            <span>Nearby</span>
            <span>Delivered</span>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-around py-1.5 bg-card border-t border-border mt-2">
        {[
          { icon: Home, label: 'Home', active: true },
          { icon: ShoppingBag, label: 'Orders', active: false },
          { icon: Calendar, label: 'Schedule', active: false },
          { icon: Gift, label: 'Rewards', active: false },
          { icon: User, label: 'Profile', active: false },
        ].map((item, i) => (
          <div key={i} className={`flex flex-col items-center ${item.active ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="w-3.5 h-3.5" />
            <span className="text-[7px]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
