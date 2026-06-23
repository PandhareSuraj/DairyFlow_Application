import React from 'react';
import { cn } from '@/lib/utils';
import { Crown, Star, Award, Trophy } from 'lucide-react';

interface LoyaltyProgressRingProps {
  points: number;
  tier: string;
  nextTierPoints: number;
  className?: string;
}

const tierConfig = {
  bronze: { color: 'hsl(30, 70%, 45%)', icon: Star, next: 'Silver', nextPoints: 500 },
  silver: { color: 'hsl(210, 15%, 65%)', icon: Award, next: 'Gold', nextPoints: 2000 },
  gold: { color: 'hsl(45, 90%, 50%)', icon: Trophy, next: 'Platinum', nextPoints: 5000 },
  platinum: { color: 'hsl(270, 50%, 60%)', icon: Crown, next: null, nextPoints: 0 },
};

export function LoyaltyProgressRing({ points, tier, nextTierPoints, className }: LoyaltyProgressRingProps) {
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.bronze;
  const Icon = config.icon;
  
  const progress = config.next 
    ? Math.min((points / config.nextPoints) * 100, 100)
    : 100;
  
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ backgroundColor: config.color }}
      />
      
      {/* Background ring */}
      <svg className="w-32 h-32 -rotate-90 transform">
        <circle
          cx="64"
          cy="64"
          r="54"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
          className="opacity-30"
        />
        {/* Progress ring */}
        <circle
          cx="64"
          cy="64"
          r="54"
          stroke={config.color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 1s ease-out',
          }}
          className="drop-shadow-[0_0_10px_currentColor]"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        <div 
          className="p-3 rounded-full mb-1"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon 
            className="h-6 w-6" 
            style={{ color: config.color }}
          />
        </div>
        <span className="text-2xl font-bold text-foreground">{points.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground capitalize">{tier} Tier</span>
      </div>
    </div>
  );
}
