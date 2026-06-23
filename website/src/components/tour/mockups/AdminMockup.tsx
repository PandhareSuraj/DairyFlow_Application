import React from 'react';
import { Building2, Users, Settings, Shield, Database, Activity, BarChart3, Bell, Search, ChevronDown } from 'lucide-react';

export function AdminMockup() {
  return (
    <div className="w-full h-full bg-background flex text-[10px]">
      {/* Sidebar */}
      <div className="w-14 bg-muted text-muted-foreground flex flex-col items-center py-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center mb-3">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="space-y-2 flex-1">
          {[
            { icon: BarChart3, active: true },
            { icon: Building2, active: false },
            { icon: Users, active: false },
            { icon: Database, active: false },
            { icon: Activity, active: false },
            { icon: Settings, active: false },
          ].map((item, i) => (
            <div 
              key={i} 
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.active ? 'bg-primary/20 text-primary' : 'hover:bg-muted-foreground/10'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-8 bg-card border-b border-border flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-muted rounded flex items-center px-1.5 gap-1">
              <Search className="w-2 h-2 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground">Search...</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Bell className="w-3 h-3 text-muted-foreground" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-destructive rounded-full" />
            </div>
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[8px] text-primary font-bold">SA</span>
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="flex-1 p-2 overflow-hidden bg-muted/30">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { label: 'Total Dairies', value: '124', trend: '+12%', color: 'text-primary' },
              { label: 'Active Users', value: '3,847', trend: '+8%', color: 'text-success' },
              { label: 'Deliveries/Day', value: '12.4K', trend: '+15%', color: 'text-warning' },
              { label: 'Revenue', value: '₹2.4Cr', trend: '+22%', color: 'text-accent-foreground' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-md p-1.5 border border-border/50">
                <div className="text-[7px] text-muted-foreground">{stat.label}</div>
                <div className="font-bold text-foreground">{stat.value}</div>
                <div className={`text-[7px] ${stat.color}`}>{stat.trend}</div>
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* Chart */}
            <div className="bg-card rounded-md p-2 border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <div className="h-1.5 w-14 bg-foreground/70 rounded" />
                <div className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
                  <span>Last 7 days</span>
                  <ChevronDown className="w-2 h-2" />
                </div>
              </div>
              <div className="h-16 flex items-end gap-0.5">
                {[45, 60, 35, 80, 55, 70, 90].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-0.5">
                    <div 
                      className="bg-primary/60 rounded-t"
                      style={{ height: `${h * 0.4}%` }}
                    />
                    <div 
                      className="bg-success/60 rounded-t"
                      style={{ height: `${h * 0.3}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dairies list */}
            <div className="bg-card rounded-md p-2 border border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="h-1.5 w-12 bg-foreground/70 rounded" />
                <div className="text-[7px] text-primary">View all</div>
              </div>
              <div className="space-y-1">
                {[
                  { name: 'Krishna Dairy', orders: 245, status: 'active' },
                  { name: 'Amul Fresh', orders: 189, status: 'active' },
                  { name: 'Nandini Milk', orders: 156, status: 'pending' },
                ].map((dairy, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
                        <Building2 className="w-2 h-2 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-[8px] font-medium text-foreground">{dairy.name}</div>
                        <div className="text-[6px] text-muted-foreground">{dairy.orders} orders</div>
                      </div>
                    </div>
                    <div className={`text-[6px] px-1 py-0.5 rounded ${
                      dairy.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>
                      {dairy.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-card rounded-md p-2 border border-border/50 mt-2">
            <div className="h-1.5 w-16 bg-foreground/70 rounded mb-1.5" />
            <div className="flex gap-2">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-1 text-[7px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    i === 0 ? 'bg-success' : i === 1 ? 'bg-primary' : 'bg-warning'
                  }`} />
                  <span className="text-muted-foreground truncate">New dairy registered</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
