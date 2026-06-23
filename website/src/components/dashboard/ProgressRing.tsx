import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  showPercentage?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
  animated?: boolean;
}

const variantColors = {
  default: 'stroke-muted-foreground',
  primary: 'stroke-primary',
  success: 'stroke-success',
  warning: 'stroke-warning',
  destructive: 'stroke-destructive',
};

const variantTextColors = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  variant = 'primary',
  showPercentage = true,
  label,
  sublabel,
  className,
  animated = true,
}) => {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'fill-none transition-all',
            variantColors[variant],
            animated && 'duration-700 ease-out'
          )}
          style={{
            transition: animated ? 'stroke-dashoffset 0.7s ease-out' : 'none',
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showPercentage && (
          <span className={cn(
            'text-2xl font-bold',
            variantTextColors[variant]
          )}>
            {Math.round(normalizedProgress)}%
          </span>
        )}
        {label && (
          <span className="text-xs font-medium text-foreground mt-1">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

// Compact version for inline use
interface CompactProgressRingProps {
  progress: number;
  size?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export const CompactProgressRing: React.FC<CompactProgressRingProps> = ({
  progress,
  size = 24,
  variant = 'primary',
  className,
}) => {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn('transform -rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="stroke-muted fill-none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={cn('fill-none transition-all duration-500', variantColors[variant])}
      />
    </svg>
  );
};
