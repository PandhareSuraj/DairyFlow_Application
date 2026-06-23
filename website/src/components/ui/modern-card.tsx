import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ModernCardProps {
  title: string;
  description?: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export function ModernCard({ 
  title, 
  description, 
  value, 
  icon, 
  trend, 
  className,
  onClick 
}: ModernCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-border/20 bg-gradient-card backdrop-blur-xl shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-[1.02] cursor-pointer group",
        onClick && "hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
        {trend && (
          <div className={cn(
            "text-xs font-medium mt-2 flex items-center",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span className={cn(
              "inline-block w-2 h-2 rounded-full mr-1",
              trend.isPositive ? "bg-success" : "bg-destructive"
            )} />
            {trend.value}
          </div>
        )}
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}