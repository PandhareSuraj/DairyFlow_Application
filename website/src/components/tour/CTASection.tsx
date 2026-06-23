import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Shield, Clock, Headphones, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { submitLeadToCRM } from '@/lib/bizflow-crm';


export function CTASection() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsLoading(true);
    try {
      await submitLeadToCRM({
        contact_person: name,
        phone,
        email: email || undefined,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('CRM submission failed:', error);
      // Graceful degradation: still show success to avoid blocking the user
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const trustBadges = [
    { icon: Shield, label: t('cta.trust.secure') },
    { icon: Clock, label: t('cta.trust.uptime') },
    { icon: Headphones, label: t('cta.trust.support') },
  ];

  return (
    <section 
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className={cn(
          'text-center transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            {t('cta.badge')}
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            {t('cta.title')}
            <span className="block text-primary">{t('cta.titleHighlight')}</span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('cta.subtitle')}
          </p>

          {/* CTA form or success message */}
          {!isSubmitted ? (
            <form 
              onSubmit={handleSubmit}
              className={cn(
                'flex flex-col gap-3 max-w-md mx-auto mb-10',
                'transition-all duration-700 delay-200',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <Input
                type="text"
                placeholder={t('cta.namePlaceholder', 'Your name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
                required
                minLength={2}
                maxLength={100}
              />
              <Input
                type="tel"
                placeholder={t('cta.phonePlaceholder', 'Phone number (10 digits)')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base"
                required
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian phone number"
              />
              <Input
                type="email"
                placeholder={t('cta.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
              />
              <Button 
                type="submit" 
                size="lg"
                className="bg-gradient-primary hover:opacity-90 shadow-strong h-12 px-8 w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('cta.submitButton')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>
          ) : (
            <div className={cn(
              'bg-success/10 border border-success/30 rounded-2xl p-6 max-w-md mx-auto mb-10',
              'animate-bounce-in'
            )}>
              <div className="text-success font-semibold mb-2">🎉 {t('cta.successTitle')}</div>
              <p className="text-sm text-muted-foreground">
                {t('cta.successMessage')}
              </p>
            </div>
          )}

          {/* Alternative CTA */}
          <div className={cn(
            'mb-10 transition-all duration-700 delay-300',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}>
            <span className="text-muted-foreground">{t('cta.or')} </span>
            <Button variant="link" asChild className="p-0 text-primary">
              <Link to="/auth">{t('cta.signInLink')}</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className={cn(
            'flex flex-wrap items-center justify-center gap-8',
            'transition-all duration-700 delay-400',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <badge.icon className="w-5 h-5 text-primary" />
                <span className="text-sm">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
