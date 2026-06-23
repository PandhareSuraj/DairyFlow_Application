import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONSENT_KEY = 'dairyflow_cookie_consent';

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = (value: 'accepted' | 'declined') => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(CONSENT_KEY, value);
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-[72px] left-4 right-4 md:left-auto md:right-6 md:bottom-[72px] md:max-w-sm z-[100]',
        'bg-card border border-border/40 rounded-2xl shadow-lg backdrop-blur-xl',
        'p-5 transition-all duration-500 ease-out',
        exiting ? 'opacity-0 translate-y-6 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-5'
      )}
    >
      <button
        onClick={() => dismiss('declined')}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close cookie banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Cookie className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">We use cookies</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We use essential cookies to keep you signed in and remember your preferences. Read our{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs px-4" onClick={() => dismiss('accepted')}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs px-4" onClick={() => dismiss('declined')}>
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
