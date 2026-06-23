import React from 'react';
import { cn } from '@/lib/utils';

interface MockupFrameProps {
  children: React.ReactNode;
  type?: 'desktop' | 'mobile' | 'tablet';
  className?: string;
  showBrowser?: boolean;
}

export function MockupFrame({ 
  children, 
  type = 'desktop', 
  className,
  showBrowser = true 
}: MockupFrameProps) {
  const frames = {
    desktop: 'max-w-4xl aspect-video',
    tablet: 'max-w-md aspect-[3/4]',
    mobile: 'max-w-[280px] aspect-[9/19]',
  };

  const borderRadius = {
    desktop: 'rounded-lg',
    tablet: 'rounded-3xl',
    mobile: 'rounded-[2.5rem]',
  };

  return (
    <div className={cn(
      'relative mx-auto',
      frames[type],
      className
    )}>
      {/* Device frame */}
      <div className={cn(
        'relative h-full w-full bg-gradient-to-br from-gray-800 to-gray-900 p-1 shadow-strong',
        borderRadius[type]
      )}>
        {/* Inner bezel */}
        <div className={cn(
          'relative h-full w-full bg-gray-900 overflow-hidden',
          type === 'mobile' ? 'rounded-[2rem]' : type === 'tablet' ? 'rounded-2xl' : 'rounded-md'
        )}>
          {/* Browser bar for desktop */}
          {showBrowser && type === 'desktop' && (
            <div className="h-8 bg-gray-800 flex items-center px-3 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 bg-gray-700 rounded-full flex items-center px-3">
                  <span className="text-xs text-gray-400 truncate">dairyflow.mywebz.in</span>
                </div>
              </div>
            </div>
          )}

          {/* Notch for mobile */}
          {type === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-gray-900 rounded-b-2xl z-10" />
          )}

          {/* Content */}
          <div className={cn(
            'h-full w-full overflow-hidden',
            type === 'desktop' && showBrowser && 'h-[calc(100%-2rem)]'
          )}>
            {children}
          </div>

          {/* Home indicator for mobile */}
          {type === 'mobile' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gray-600 rounded-full" />
          )}
        </div>
      </div>

      {/* Reflection/shadow */}
      <div className={cn(
        'absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 blur-xl rounded-full',
        type === 'mobile' && 'w-1/2'
      )} />
    </div>
  );
}

interface FloatingBadgeProps {
  children: React.ReactNode;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  delay?: number;
  className?: string;
}

export function FloatingBadge({ children, position, delay = 0, className }: FloatingBadgeProps) {
  const positions = {
    'top-left': 'top-4 left-4 md:-left-12 md:-top-4',
    'top-right': 'top-4 right-4 md:-right-12 md:-top-4',
    'bottom-left': 'bottom-4 left-4 md:-left-12 md:-bottom-4',
    'bottom-right': 'bottom-4 right-4 md:-right-12 md:-bottom-4',
  };

  return (
    <div
      className={cn(
        'absolute px-4 py-2 bg-card/90 backdrop-blur-sm rounded-xl shadow-medium border border-border/50',
        'animate-bounce-subtle opacity-0 animate-fade-in',
        positions[position],
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {children}
    </div>
  );
}
