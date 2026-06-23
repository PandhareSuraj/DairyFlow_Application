import React from 'react';
import { MapPin, Navigation, Clock, CheckCircle2, Circle, Home, Route, User, Wallet } from 'lucide-react';

export function DeliveryMockup() {
  return (
    <div className="w-full h-full bg-background flex flex-col text-[10px]">
      {/* Header */}
      <div className="px-3 py-2 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[8px] opacity-80">Good Morning</div>
            <div className="font-bold text-xs">Rahul Kumar</div>
          </div>
          <div className="flex items-center gap-1 bg-primary-foreground/20 rounded-full px-2 py-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[8px]">Online</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30">
        {[
          { icon: CheckCircle2, value: '12', label: 'Done' },
          { icon: Clock, value: '5', label: 'Pending' },
          { icon: Wallet, value: '₹450', label: 'Earned' },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="flex items-center justify-center gap-0.5">
              <stat.icon className="w-2.5 h-2.5 text-primary" />
              <span className="font-bold text-foreground">{stat.value}</span>
            </div>
            <div className="text-[7px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Map area */}
      <div className="flex-1 bg-muted/20 relative overflow-hidden">
        {/* Simplified map visualization */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full">
          <path 
            d="M 20 80 Q 40 40, 80 50 T 140 30" 
            fill="none" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          {/* Markers */}
          <circle cx="20" cy="80" r="4" fill="hsl(var(--success))" />
          <circle cx="80" cy="50" r="3" fill="hsl(var(--primary))" />
          <circle cx="140" cy="30" r="4" fill="hsl(var(--warning))" />
        </svg>

        {/* Current delivery card */}
        <div className="absolute bottom-2 left-2 right-2 bg-card rounded-lg p-2 shadow-medium border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Mrs. Sharma</div>
                <div className="text-[8px] text-muted-foreground">Block A, Apt 12</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-success">2 items</div>
              <div className="text-[8px] text-muted-foreground">0.5 km</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 h-5 bg-success text-success-foreground rounded text-[8px] font-medium flex items-center justify-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Delivered
            </button>
            <button className="flex-1 h-5 bg-muted text-muted-foreground rounded text-[8px] font-medium flex items-center justify-center gap-0.5">
              <Navigation className="w-2.5 h-2.5" />
              Navigate
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-around py-1.5 bg-card border-t border-border">
        {[
          { icon: Home, label: 'Home', active: false },
          { icon: Route, label: 'Route', active: true },
          { icon: Wallet, label: 'Earnings', active: false },
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
