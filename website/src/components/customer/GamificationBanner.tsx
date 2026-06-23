import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Flame, Target, Gift, Sparkles, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GamificationBannerProps {
  currentStreak: number;
  pointsToNextReward: number;
  nextRewardName: string;
  totalOrders: number;
}

export function GamificationBanner({ 
  currentStreak, 
  pointsToNextReward, 
  nextRewardName,
  totalOrders 
}: GamificationBannerProps) {
  const [animatedStreak, setAnimatedStreak] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStreak(currentStreak), 300);
    return () => clearTimeout(timer);
  }, [currentStreak]);

  const milestones = [
    { orders: 10, label: '10 Orders', emoji: '🥉' },
    { orders: 25, label: '25 Orders', emoji: '🥈' },
    { orders: 50, label: '50 Orders', emoji: '🥇' },
    { orders: 100, label: '100 Orders', emoji: '💎' },
  ];

  const currentMilestone = milestones.find(m => m.orders > totalOrders) || milestones[milestones.length - 1];
  const previousMilestone = milestones[milestones.indexOf(currentMilestone) - 1];
  const startOrders = previousMilestone?.orders || 0;
  const milestoneProgress = Math.min(
    ((totalOrders - startOrders) / (currentMilestone.orders - startOrders)) * 100,
    100
  );

  return (
    <div className="space-y-3">
      {/* Streak Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 border border-orange-500/30 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 animate-pulse" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/30" />
              <div className="relative p-2.5 rounded-full bg-orange-500/20">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-500">
                  {animatedStreak}
                </span>
                <span className="text-sm font-medium text-orange-500/80">day streak</span>
              </div>
              <p className="text-xs text-muted-foreground">Keep ordering to maintain!</p>
            </div>
          </div>
          
          <div className="flex gap-1">
            {[...Array(Math.min(animatedStreak, 7))].map((_, i) => (
              <div
                key={i}
                className="w-2 h-8 rounded-full bg-gradient-to-t from-orange-600 to-orange-400"
                style={{
                  height: `${20 + (i * 4)}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Points to Next Reward */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Next Reward</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary">
            <span>{nextRewardName}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress value={100 - (pointsToNextReward / 100) * 100} className="h-2" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" />
              {pointsToNextReward} points to go
            </span>
            <span className="text-primary font-medium">Unlock reward!</span>
          </div>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="rounded-2xl bg-card border border-border/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Order Milestone</span>
          </div>
          <span className="text-2xl">{currentMilestone.emoji}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{totalOrders} orders</span>
            <span className="text-foreground font-medium">{currentMilestone.label}</span>
          </div>
          <Progress value={milestoneProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {currentMilestone.orders - totalOrders} more orders to unlock {currentMilestone.label} badge!
          </p>
        </div>
      </div>
    </div>
  );
}
