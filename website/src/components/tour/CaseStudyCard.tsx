 import React from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { TrendingUp, Users, Clock } from 'lucide-react';
 
 interface CaseStudy {
   name: string;
   location: string;
   metric: string;
   metricLabel: string;
   quote: string;
 }
 
const icons = [TrendingUp, Clock, Users];
 
 export function CaseStudySection() {
   const { t } = useTranslation('tour');
   const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
 
  // Get translated case studies
  const caseStudies = t('caseStudy.studies', { returnObjects: true }) as CaseStudy[];

   return (
     <section 
       ref={ref as React.RefObject<HTMLDivElement>}
       className="py-20 px-4"
     >
       <div className="max-w-6xl mx-auto">
         <div className={cn(
           'text-center mb-12 transition-all duration-700',
           isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
         )}>
           <h2 className="text-3xl md:text-4xl font-bold mb-4">
             {t('caseStudy.title')}
           </h2>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('caseStudy.subtitle')}
           </p>
         </div>
 
         <div className={cn(
           'grid md:grid-cols-3 gap-6 transition-all duration-700 delay-200',
           isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
         )}>
          {Array.isArray(caseStudies) && caseStudies.map((study, index) => {
            const IconComponent = icons[index % icons.length];
            return (
              <div 
                key={index}
                className="group bg-card rounded-3xl border border-border/50 shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Image placeholder */}
                <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <IconComponent className="w-16 h-16 text-primary/50" />
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{study.name}</h3>
                      <p className="text-sm text-muted-foreground">{study.location}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{study.metric}</div>
                      <div className="text-xs text-muted-foreground">{study.metricLabel}</div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic">
                    "{study.quote}"
                  </p>
                </div>
              </div>
            );
          })}
         </div>
       </div>
     </section>
   );
 }