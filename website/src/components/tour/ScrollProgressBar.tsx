import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export const ScrollProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  const updateProgress = useCallback(() => {
    const now = Date.now();
    // Throttle to ~60fps (16ms)
    if (now - lastUpdateRef.current < 16) return;
    
    lastUpdateRef.current = now;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    setProgress(scrollProgress);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    updateProgress(); // Initial calculation
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll, updateProgress]);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-muted/50" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Page scroll progress">
      <div
        className={cn(
          "h-full bg-gradient-primary transition-all duration-75 ease-out",
          "shadow-[0_0_10px_hsl(var(--primary-glow)/0.5)]"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
