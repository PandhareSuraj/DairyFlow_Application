import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { submitLeadToCRM } from '@/lib/bizflow-crm';
import { toast } from '@/hooks/use-toast';
import { isLeadCaptured } from './LeadCaptureModal';
import { cn } from '@/lib/utils';

interface LeadGateProps {
  children: React.ReactNode;
  className?: string;
}

export function LeadGate({ children, className }: LeadGateProps) {
  const { t } = useTranslation('tour');
  const [unlocked, setUnlocked] = useState(isLeadCaptured());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await submitLeadToCRM({ contact_person: name.trim(), phone: phone.trim() });
      sessionStorage.setItem('lead_captured', 'true');
      setUnlocked(true);
      toast({ title: t('leadMagnet.successTitle'), description: t('leadMagnet.successMessage') });
    } catch (err) {
      console.error('[LeadGate] CRM submission failed:', err);
      sessionStorage.setItem('lead_captured', 'true');
      setUnlocked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content */}
      <div className="blur-md select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay gate */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-3xl">
        <div className="bg-card border border-border/50 rounded-2xl shadow-strong p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {t('leadMagnet.gate.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t('leadMagnet.gate.description')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder={t('leadMagnet.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder={t('leadMagnet.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              pattern="[6-9]\d{9}"
              maxLength={10}
            />
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('leadMagnet.gate.cta')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
