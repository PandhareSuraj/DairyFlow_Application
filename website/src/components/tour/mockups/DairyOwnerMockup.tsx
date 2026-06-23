import React from 'react';
import { Package, Users, Truck, TrendingUp, BarChart3, Bell } from 'lucide-react';

export function DairyOwnerMockup() {
  return (
    <div className="w-full h-full bg-background flex text-[10px]">
      {/* Sidebar */}
      <div className="w-12 bg-muted/50 border-r border-border flex flex-col items-center py-2 gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
          <Package className="w-3 h-3 text-primary" />
        </div>
        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
          <Users className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
          <Truck className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
          <BarChart3 className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-2 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="h-2 w-16 bg-foreground/80 rounded" />
            <div className="h-1.5 w-10 bg-muted-foreground/50 rounded mt-1" />
          </div>
          <div className="flex gap-1">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <div className="w-5 h-5 rounded-full bg-primary/20" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { label: 'Revenue', value: '₹45K', color: 'bg-primary/10 text-primary', icon: TrendingUp },
            { label: 'Orders', value: '156', color: 'bg-success/10 text-success', icon: Package },
            { label: 'Customers', value: '89', color: 'bg-accent/10 text-accent-foreground', icon: Users },
            { label: 'Deliveries', value: '142', color: 'bg-warning/10 text-warning', icon: Truck },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-md p-1.5 border border-border/50">
              <div className={`w-4 h-4 rounded ${stat.color} flex items-center justify-center mb-1`}>
                <stat.icon className="w-2 h-2" />
              </div>
              <div className="font-bold text-foreground">{stat.value}</div>
              <div className="text-[8px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="bg-card rounded-md p-2 border border-border/50 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="h-1.5 w-12 bg-foreground/70 rounded" />
            <div className="flex gap-1">
              <div className="h-3 w-8 bg-muted rounded text-[6px] flex items-center justify-center">Week</div>
              <div className="h-3 w-8 bg-primary/20 rounded text-[6px] flex items-center justify-center text-primary">Month</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-12">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Recent orders table */}
        <div className="bg-card rounded-md p-1.5 border border-border/50">
          <div className="h-1.5 w-14 bg-foreground/70 rounded mb-1.5" />
          <div className="space-y-1">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <div className="h-1.5 w-12 bg-muted-foreground/50 rounded" />
                </div>
                <div className="h-2 w-6 bg-success/20 text-success rounded text-[6px] flex items-center justify-center">
                  Done
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
