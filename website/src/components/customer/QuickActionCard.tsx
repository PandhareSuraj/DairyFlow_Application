import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'accent' | 'warning';
  badge?: string;
}

const colorStyles = {
  primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
  secondary: 'bg-secondary/10 text-secondary-foreground border-secondary/20 hover:bg-secondary/15',
  accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15',
};

export function QuickActionCard({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  color = 'primary',
  badge 
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-200 active:scale-95",
        colorStyles[color]
      )}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
          {badge}
        </span>
      )}
      
      <div className={cn(
        "p-3 rounded-xl mb-2 transition-transform duration-200",
        color === 'primary' && "bg-primary/10",
        color === 'secondary' && "bg-secondary/10",
        color === 'accent' && "bg-emerald-500/10",
        color === 'warning' && "bg-amber-500/10"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      
      <span className="text-sm font-medium text-foreground">{label}</span>
      {description && (
        <span className="text-[10px] text-muted-foreground mt-0.5">{description}</span>
      )}
    </button>
  );
}
