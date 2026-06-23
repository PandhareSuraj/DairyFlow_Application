import React from 'react';
import { cn } from '@/lib/utils';
import { Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ProgressRing } from '@/components/dashboard/ProgressRing';

interface DeliveryStatsProps {
  total: number;
  delivered: number;
  pending: number;
  notDelivered: number;
}

export const DeliveryStats = ({ total, delivered, pending, notDelivered }: DeliveryStatsProps) => {
  const completionPercent = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-background to-background rounded-2xl p-4 space-y-4">
      {/* Main Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today's Progress</h2>
          <p className="text-sm text-muted-foreground">
            {delivered} of {total} completed
          </p>
        </div>
        <ProgressRing 
          progress={completionPercent} 
          size={64} 
          strokeWidth={6}
          showPercentage={true}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatItem 
          icon={Package} 
          value={total} 
          label="Total" 
          colorClass="text-primary bg-primary/10"
        />
        <StatItem 
          icon={CheckCircle} 
          value={delivered} 
          label="Done" 
          colorClass="text-success bg-success/10"
        />
        <StatItem 
          icon={Clock} 
          value={pending} 
          label="Pending" 
          colorClass="text-warning bg-warning/10"
        />
        <StatItem 
          icon={XCircle} 
          value={notDelivered} 
          label="Failed" 
          colorClass="text-destructive bg-destructive/10"
        />
      </div>
    </div>
  );
};

interface StatItemProps {
  icon: React.ElementType;
  value: number;
  label: string;
  colorClass: string;
}

const StatItem = ({ icon: Icon, value, label, colorClass }: StatItemProps) => (
  <div className="flex flex-col items-center p-2 rounded-xl bg-card/50">
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-1", colorClass)}>
      <Icon className="h-4 w-4" />
    </div>
    <span className="text-lg font-bold text-foreground">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);
