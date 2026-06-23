import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { submitLeadToCRM } from '@/lib/bizflow-crm';
import { toast } from '@/hooks/use-toast';
import { isLeadCaptured } from './LeadCaptureModal';
import { cn } from '@/lib/utils';

interface InlineLeadFormProps {
  variant?: 'hero' | 'banner';
  className?: string;
}

export function InlineLeadForm({ variant = 'hero', className }: InlineLeadFormProps) {
  const { t } = useTranslation('tour');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isLeadCaptured() || success) {
    return (
      <div className={cn('flex items-center gap-2 text-success font-medium', className)}>
        <CheckCircle className="w-5 h-5" />
        <span>{t('leadMagnet.alreadyCaptured')}</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await submitLeadToCRM({ contact_person: name.trim(), phone: phone.trim() });
      setSuccess(true);
      sessionStorage.setItem('lead_captured', 'true');
      toast({ title: t('leadMagnet.successTitle'), description: t('leadMagnet.successMessage') });
    } catch {
      toast({ title: t('leadMagnet.errorTitle'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'banner') {
    return (
      <form onSubmit={handleSubmit} className={cn('flex flex-col sm:flex-row gap-3 max-w-xl mx-auto', className)}>
        <Input
          placeholder={t('leadMagnet.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 bg-background"
        />
        <Input
          placeholder={t('leadMagnet.phonePlaceholder')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          pattern="[6-9]\d{9}"
          maxLength={10}
          className="h-12 bg-background"
        />
        <Button type="submit" disabled={loading} className="h-12 px-8 bg-gradient-primary hover:opacity-90 whitespace-nowrap">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {t('leadMagnet.banner.cta')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col sm:flex-row gap-3', className)}>
      <Input
        placeholder={t('leadMagnet.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="h-12"
      />
      <Input
        placeholder={t('leadMagnet.phonePlaceholder')}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        pattern="[6-9]\d{9}"
        maxLength={10}
        className="h-12"
      />
      <Button type="submit" disabled={loading} size="lg" className="bg-gradient-primary hover:opacity-90 h-12 px-8 shadow-strong pulse-glow whitespace-nowrap">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            <Sparkles className="mr-2 w-4 h-4" />
            {t('leadMagnet.hero.cta')}
          </>
        )}
      </Button>
    </form>
  );
}
