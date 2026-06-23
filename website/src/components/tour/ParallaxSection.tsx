import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useParallax } from '@/hooks/useScrollAnimation';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
  disabled?: boolean;
}

export const ParallaxSection = forwardRef<HTMLDivElement, ParallaxSectionProps>(({
  children,
  className,
  speed = 0.3,
  direction = 'up',
  disabled = false,
}, forwardedRef) => {
  const { ref, offset } = useParallax(speed);
  const translateY = direction === 'up' ? -offset : offset;

  // Combine refs if needed
  const setRefs = (node: HTMLDivElement) => {
    (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      ref={setRefs}
      className={cn('will-change-transform', className)}
      style={{
        transform: disabled ? undefined : `translateY(${translateY}px)`,
      }}
    >
      {children}
    </div>
  );
});

ParallaxSection.displayName = 'ParallaxSection';

interface ParallaxBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  overlayOpacity?: number;
  gradient?: boolean;
}

export function ParallaxBackground({ 
  children, 
  className, 
  overlayOpacity = 0.5,
  gradient = true 
}: ParallaxBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background layer */}
      <div className="absolute inset-0">
        {gradient && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10"
            style={{ opacity: overlayOpacity }}
          />
        )}
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FloatingElement({ children, className, delay = 0, duration = 3 }: FloatingElementProps) {
  return (
    <div
      className={cn('animate-bounce-subtle', className)}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}
