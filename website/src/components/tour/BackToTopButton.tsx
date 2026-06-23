import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stickyCTAVisible, setStickyCTAVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
      setStickyCTAVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed right-6 z-50 h-12 w-12 rounded-full shadow-lg",
        stickyCTAVisible ? "bottom-20" : "bottom-6",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "transition-all duration-300 ease-out",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "translate-y-16 opacity-0 scale-75 pointer-events-none"
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};
