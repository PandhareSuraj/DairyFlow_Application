import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Check, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PricingComparison } from './PricingComparison';
import { InlineLeadForm } from './InlineLeadForm';

type TierKey = 'starter' | 'professional' | 'enterprise';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  yearlyPrice?: string;
  period: string;
  features: string[];
  cta: string;
}

export function PricingSection() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const tierKeys: TierKey[] = ['starter', 'professional', 'enterprise'];
  
  const tiers = tierKeys.map(key => ({
    key,
    highlighted: key === 'professional',
    ...t(`pricing.tiers.${key}`, { returnObjects: true }) as PricingTier,
  }));

  return (
    <section 
      id="pricing"
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-12 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('pricing.title')} <span className="text-primary">{t('pricing.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-muted">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                billingCycle === 'monthly' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('pricing.billing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                billingCycle === 'yearly' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('pricing.billing.yearly')}
              <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                {t('pricing.billing.save')}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, index) => {
            const displayPrice = billingCycle === 'yearly' && tier.yearlyPrice 
              ? tier.yearlyPrice 
              : tier.price;

            return (
              <div
                key={tier.key}
                className={cn(
                  'relative rounded-3xl p-8 transition-all duration-500',
                  tier.highlighted 
                    ? 'bg-gradient-to-br from-primary/10 via-card to-accent/10 border-2 border-primary shadow-strong scale-105 z-10' 
                    : 'bg-card border border-border/50 shadow-soft hover:shadow-medium',
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                )}
                style={{ transitionDelay: `${200 + index * 100}ms` }}
              >
                {/* Popular badge */}
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      {t('pricing.mostPopular')}
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {displayPrice}
                    </span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.key === 'enterprise' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground text-center">
                      {t('pricing.enterprise.leadTitle')}
                    </p>
                    <InlineLeadForm variant="banner" className="flex-col" />
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{t('pricing.limitedSpots', { defaultValue: 'Only 3 spots left this month' })}</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    asChild
                    className={cn(
                      'w-full',
                      tier.highlighted 
                        ? 'bg-gradient-primary hover:opacity-90 shadow-medium' 
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    )}
                  >
                    <Link to="/auth">{tier.cta}</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <PricingComparison />
      </div>
    </section>
  );
}
