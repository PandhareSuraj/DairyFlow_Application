import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  variant?: 'typewriter' | 'reveal' | 'gradient';
}

export function AnimatedText({
  text,
  className,
  delay = 0,
  speed = 50,
  as: Component = 'span',
  variant = 'reveal',
}: AnimatedTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (variant === 'typewriter') {
      let currentIndex = 0;
      const timeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (currentIndex <= text.length) {
            setDisplayedText(text.slice(0, currentIndex));
            currentIndex++;
          } else {
            setIsComplete(true);
            clearInterval(interval);
          }
        }, speed);

        return () => clearInterval(interval);
      }, delay);

      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setDisplayedText(text);
        setIsComplete(true);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [text, delay, speed, variant]);

  if (variant === 'typewriter') {
    return (
      <Component className={cn(className)}>
        {displayedText}
        {!isComplete && (
          <span className="inline-block w-0.5 h-[1em] bg-primary ml-1 animate-pulse" />
        )}
      </Component>
    );
  }

  if (variant === 'gradient') {
    return (
      <Component
        className={cn(
          'bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift',
          className
        )}
      >
        {text}
      </Component>
    );
  }

  // Reveal variant with word-by-word animation
  const words = text.split(' ');
  
  return (
    <Component className={cn('flex flex-wrap gap-x-2', className)}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block opacity-0 translate-y-4 animate-fade-in"
          style={{ animationDelay: `${delay + index * 100}ms`, animationFillMode: 'forwards' }}
        >
          {word}
        </span>
      ))}
    </Component>
  );
}

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function GradientText({ children, className, animate = true }: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary',
        animate && 'bg-[length:200%_auto] animate-gradient-shift',
        className
      )}
    >
      {children}
    </span>
  );
}
