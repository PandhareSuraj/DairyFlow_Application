import React from 'react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  index?: number;
  className?: string;
  iconColor?: string;
  isVisible?: boolean;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  index = 0,
  className,
  iconColor = 'text-primary',
  isVisible = true,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group relative p-6 rounded-2xl bg-card border border-border/50 shadow-soft',
        'hover:shadow-medium hover:border-primary/30 hover:-translate-y-1',
        'transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Icon with animated background */}
        <div className="mb-4 relative">
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br from-primary/10 to-accent/10',
            'group-hover:from-primary/20 group-hover:to-accent/20',
            'transition-all duration-300'
          )}>
            <Icon 
              className={cn(
                'w-7 h-7 transition-all duration-300',
                'group-hover:scale-110',
                iconColor
              )} 
            />
          </div>
          
          {/* Decorative ring on hover */}
          <div className="absolute inset-0 w-14 h-14 rounded-xl border-2 border-primary/0 group-hover:border-primary/20 group-hover:scale-125 transition-all duration-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

interface FeatureCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function FeatureCardGrid({ children, className, columns = 3 }: FeatureCardGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(
      'grid gap-6',
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}
