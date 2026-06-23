import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation, useStaggeredAnimation } from '@/hooks/useScrollAnimation';
import { 
  UserPlus, Package, Users, Truck, TrendingUp,
  CheckCircle2
} from 'lucide-react';

const stepIcons = [UserPlus, Package, Users, Truck, TrendingUp];

interface TimelineStep {
  title: string;
  description: string;
  details: string[];
}

export function HowItWorksTimeline() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const steps = t('howItWorks.steps', { returnObjects: true }) as TimelineStep[];
  const { containerRef, visibleItems } = useStaggeredAnimation(steps.length, 200);

  return (
    <section 
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 bg-muted/30"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-16 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('howItWorks.title')} <span className="text-primary">{t('howItWorks.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        {/* Timeline */}
        <div 
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative"
        >
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-0.5" />

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, index) => {
              const StepIcon = stepIcons[index] || UserPlus;
              const isItemVisible = visibleItems.includes(index);
              const isEven = index % 2 === 0;

              return (
                <div 
                  key={index}
                  className={cn(
                    'relative flex items-start gap-6',
                    'md:gap-0',
                    isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                  )}
                >
                  {/* Icon circle */}
                  <div className={cn(
                    'relative z-10 flex-shrink-0',
                    'md:absolute md:left-1/2 md:-translate-x-1/2'
                  )}>
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center',
                      'transition-all duration-500',
                      isItemVisible 
                        ? 'bg-primary text-primary-foreground scale-100' 
                        : 'bg-muted text-muted-foreground scale-75'
                    )}>
                      <StepIcon className="w-7 h-7" />
                    </div>
                    {/* Step number */}
                    <div className={cn(
                      'absolute -top-2 -right-2 w-7 h-7 rounded-full',
                      'bg-card border-2 border-primary text-primary font-bold text-sm',
                      'flex items-center justify-center',
                      'transition-all duration-500 delay-200',
                      isItemVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    )}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Content card */}
                  <div className={cn(
                    'flex-1',
                    'md:w-5/12',
                    isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left',
                    'transition-all duration-500',
                    isItemVisible 
                      ? 'opacity-100 translate-x-0' 
                      : isEven 
                        ? 'opacity-0 -translate-x-8' 
                        : 'opacity-0 translate-x-8'
                  )}>
                    <div className={cn(
                      'p-6 rounded-2xl bg-card border border-border/50 shadow-soft',
                      'hover:shadow-medium transition-shadow duration-300'
                    )}>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {step.description}
                      </p>
                      <ul className={cn(
                        'space-y-2',
                        isEven ? 'md:items-end' : 'md:items-start'
                      )}>
                        {step.details.map((detail, detailIndex) => (
                          <li 
                            key={detailIndex}
                            className={cn(
                              'flex items-center gap-2 text-sm text-muted-foreground',
                              isEven ? 'md:flex-row-reverse' : ''
                            )}
                          >
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block md:w-5/12" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
