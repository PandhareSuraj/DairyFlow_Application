import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation, useStaggeredAnimation } from '@/hooks/useScrollAnimation';
import { 
  FileText, Truck, Star, CreditCard, BarChart3,
  ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';

const problemIcons = [FileText, XCircle, XCircle, XCircle, XCircle];
const solutionIcons = [CheckCircle2, Truck, Star, CreditCard, BarChart3];

export function ProblemSolutionSection() {
  const { t } = useTranslation('tour');
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const items = t('problemSolution.items', { returnObjects: true }) as Array<{ problem: string; solution: string }>;
  const { containerRef, visibleItems } = useStaggeredAnimation(items.length, 150);

  return (
    <section 
      ref={sectionRef as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 bg-muted/30"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-16 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-destructive">{t('problemSolution.title')}</span> {t('problemSolution.titleSuffix')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('problemSolution.subtitle')}
          </p>
        </div>

        {/* Problem/Solution grid */}
        <div 
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="space-y-6"
        >
          {items.map((item, index) => {
            const ProblemIcon = problemIcons[index] || XCircle;
            const SolutionIcon = solutionIcons[index] || CheckCircle2;
            const isItemVisible = visibleItems.includes(index);

            return (
              <div 
                key={index}
                className={cn(
                  'grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center transition-all duration-500',
                  isItemVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Problem */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <ProblemIcon className="w-6 h-6 text-destructive" />
                  </div>
                  <span className="text-foreground font-medium">{item.problem}</span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <div className={cn(
                    'w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center',
                    'transition-all duration-500',
                    isItemVisible ? 'scale-100' : 'scale-0'
                  )} style={{ transitionDelay: `${index * 100 + 200}ms` }}>
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Solution */}
                <div className={cn(
                  'flex items-center gap-4 p-4 rounded-xl bg-success/5 border border-success/20',
                  'transition-all duration-500',
                  isItemVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                )} style={{ transitionDelay: `${index * 100 + 100}ms` }}>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <SolutionIcon className="w-6 h-6 text-success" />
                  </div>
                  <span className="text-foreground font-medium">{item.solution}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
