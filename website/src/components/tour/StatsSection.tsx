import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCounterOnScroll, formatNumber } from '@/hooks/useAnimatedCounter';
import { Truck, Users, Building2, Clock } from 'lucide-react';
import { LiveActivityFeed } from './LiveActivityFeed';

interface StatItem {
  icon: React.ElementType;
  value: number;
  suffix: string;
  labelKey: string;
}

const stats: StatItem[] = [
  { icon: Truck, value: 10000, suffix: '+', labelKey: 'deliveriesCompleted' },
  { icon: Building2, value: 500, suffix: '+', labelKey: 'registeredDairies' },
  { icon: Users, value: 50000, suffix: '+', labelKey: 'happyCustomers' },
  { icon: Clock, value: 99.5, suffix: '%', labelKey: 'onTimeRate' },
];

function AnimatedStat({ icon: Icon, value, suffix, labelKey, index }: StatItem & { index: number }) {
  const { t } = useTranslation('tour');
  const { ref, value: animatedValue } = useCounterOnScroll(value, { 
    duration: 2000,
    delay: index * 200 
  });

  const displayValue = suffix === '%' 
    ? animatedValue.toFixed(1) + suffix
    : formatNumber(animatedValue, suffix);

  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>}
      className="text-center p-8"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
        {displayValue}
      </div>
      <div className="text-muted-foreground">{t(`stats.items.${labelKey}`)}</div>
    </div>
  );
}

export function StatsSection() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section 
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-16 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('stats.title')} <span className="text-primary">{t('stats.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('stats.subtitle')}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main stats */}
          <div className={cn(
            'lg:col-span-2 grid grid-cols-2 gap-6',
            'transition-all duration-700 delay-200',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}>
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border/50 shadow-soft hover:shadow-medium transition-shadow duration-300"
              >
                <AnimatedStat {...stat} index={index} />
              </div>
            ))}
          </div>

          {/* Live activity feed */}
          <div className={cn(
            'transition-all duration-700 delay-400',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          )}>
            <LiveActivityFeed />
          </div>
        </div>
      </div>
    </section>
  );
}
