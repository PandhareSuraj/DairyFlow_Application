import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, IndianRupee, Award } from 'lucide-react';

interface EarningsPanelProps {
  deliveredToday: number;
  totalDeliveries: number;
}

export const EarningsPanel = ({ deliveredToday, totalDeliveries }: EarningsPanelProps) => {
  // Mock earnings calculation (can be replaced with real data)
  const perDeliveryRate = 15; // ₹15 per delivery
  const todayEarnings = deliveredToday * perDeliveryRate;
  const weeklyEstimate = todayEarnings * 6; // 6 working days
  const onTimeBonus = deliveredToday >= totalDeliveries && totalDeliveries > 0 ? 50 : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Today's Earnings Hero */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today's Earnings</p>
              <div className="flex items-baseline gap-1">
                <IndianRupee className="h-6 w-6 text-primary" />
                <span className="text-4xl font-bold text-foreground">{todayEarnings + onTimeBonus}</span>
              </div>
              {onTimeBonus > 0 && (
                <div className="flex items-center gap-1 mt-2 text-success text-sm">
                  <Award className="h-4 w-4" />
                  <span>+₹{onTimeBonus} on-time bonus!</span>
                </div>
              )}
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Weekly Estimate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{weeklyEstimate}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Award className="h-4 w-4" />
              <span className="text-xs">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalDeliveries > 0 ? Math.round((deliveredToday / totalDeliveries) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deliveries ({deliveredToday} × ₹{perDeliveryRate})</span>
            <span className="font-medium text-foreground">₹{todayEarnings}</span>
          </div>
          {onTimeBonus > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-success">On-time Bonus</span>
              <span className="font-medium text-success">+₹{onTimeBonus}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-bold text-primary text-lg">₹{todayEarnings + onTimeBonus}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Complete all deliveries to earn the ₹50 on-time bonus!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
