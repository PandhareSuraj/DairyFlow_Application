import { useEffect, useState, useRef, useCallback } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
  startOnMount?: boolean;
}

// Easing functions
export const easings = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

export function useAnimatedCounter(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const {
    duration = 2000,
    delay = 0,
    easing = easings.easeOutExpo,
    startOnMount = false,
  } = options;

  const [value, setValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasStartedRef = useRef(false);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    setValue(Math.floor(easedProgress * endValue));

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setValue(endValue);
      setIsAnimating(false);
    }
  }, [duration, easing, endValue]);

  const start = useCallback(() => {
    if (hasStartedRef.current && !startOnMount) return;
    hasStartedRef.current = true;
    
    setIsAnimating(true);
    startTimeRef.current = undefined;

    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, delay);
  }, [animate, delay, startOnMount]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setValue(0);
    setIsAnimating(false);
    hasStartedRef.current = false;
    startTimeRef.current = undefined;
  }, []);

  useEffect(() => {
    if (startOnMount) {
      start();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startOnMount, start]);

  return { value, isAnimating, start, reset };
}

export function useCounterOnScroll(
  endValue: number,
  options: Omit<UseAnimatedCounterOptions, 'startOnMount'> = {}
) {
  const ref = useRef<HTMLElement>(null);
  const { value, isAnimating, start, reset } = useAnimatedCounter(endValue, {
    ...options,
    startOnMount: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (prefersReducedMotion) {
            // Skip animation, show final value immediately
            reset();
            setTimeout(() => start(), 0);
          } else {
            start();
          }
          observer.unobserve(element);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [start, reset]);

  return { ref, value, isAnimating };
}

export function formatNumber(num: number, suffix?: string): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' + (suffix || '');
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K' + (suffix || '');
  }
  return num.toLocaleString() + (suffix || '');
}
