import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, X, Loader2, CheckCircle, Clock } from 'lucide-react';
import { submitLeadToCRM } from '@/lib/bizflow-crm';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const SESSION_KEYS = {
  captured: 'lead_captured',
  timedDismissed: 'lead_timed_dismissed',
  exitDismissed: 'lead_exit_dismissed',
};

export function isLeadCaptured(): boolean {
  return sessionStorage.getItem(SESSION_KEYS.captured) === 'true';
}

function markLeadCaptured() {
  sessionStorage.setItem(SESSION_KEYS.captured, 'true');
}

interface LeadCaptureModalProps {
  trigger: 'timed' | 'exit';
  delayMs?: number;
}

export function LeadCaptureModal({ trigger, delayMs = 30000 }: LeadCaptureModalProps) {
  const { t } = useTranslation('tour');
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const dismissKey = trigger === 'timed' ? SESSION_KEYS.timedDismissed : SESSION_KEYS.exitDismissed;

  const shouldShow = useCallback(() => {
    return !isLeadCaptured() && sessionStorage.getItem(dismissKey) !== 'true';
  }, [dismissKey]);

  // Timed trigger - skip on mobile to reduce bounce
  useEffect(() => {
    if (trigger !== 'timed' || !shouldShow() || isMobile) return;
    const timer = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(timer);
  }, [trigger, delayMs, shouldShow, isMobile]);

  // Exit intent trigger
  useEffect(() => {
    if (trigger !== 'exit' || !shouldShow()) return;
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10 && shouldShow()) {
        setOpen(true);
      }
    };
    document.documentElement.addEventListener('mouseleave', handler);
    return () => document.documentElement.removeEventListener('mouseleave', handler);
  }, [trigger, shouldShow]);

  const handleDismiss = () => {
    setOpen(false);
    sessionStorage.setItem(dismissKey, 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await submitLeadToCRM({
        contact_person: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setSuccess(true);
      markLeadCaptured();
      toast({ title: t('leadMagnet.successTitle'), description: t('leadMagnet.successMessage') });
      setTimeout(() => setOpen(false), 2000);
    } catch {
      toast({ title: t('leadMagnet.errorTitle'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isExit = trigger === 'exit';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isExit ? 'bg-destructive/10' : 'bg-primary/10'
            )}>
              {isExit ? <Clock className="w-8 h-8 text-destructive" /> : <Gift className="w-8 h-8 text-primary" />}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {isExit ? t('leadMagnet.exit.title') : t('leadMagnet.timed.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isExit ? t('leadMagnet.exit.description') : t('leadMagnet.timed.description')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="w-16 h-16 text-success animate-in zoom-in" />
            <p className="text-lg font-semibold text-foreground">{t('leadMagnet.successTitle')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <Input
              placeholder={t('leadMagnet.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <Input
              placeholder={t('leadMagnet.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              pattern="[6-9]\d{9}"
              maxLength={10}
            />
            <Input
              placeholder={t('leadMagnet.emailPlaceholder')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 text-lg h-12"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                isExit ? t('leadMagnet.exit.cta') : t('leadMagnet.timed.cta')
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {t('leadMagnet.privacyNote')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
