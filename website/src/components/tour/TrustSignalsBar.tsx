 import React from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { useScrollAnimation } from '@/hooks/useScrollAnimation';
 import { Star, Shield, Award, CheckCircle } from 'lucide-react';
 
 interface TrustBadge {
   icon: React.ElementType;
   rating?: string;
   label: string;
  sublabelKey?: string;
 }
 
const trustBadgesConfig: TrustBadge[] = [
  { icon: Star, rating: '4.8', label: 'G2', sublabelKey: 'trust.reviews' },
  { icon: Star, rating: '4.9', label: 'Capterra', sublabelKey: 'trust.rating' },
  { icon: Shield, label: 'ISO 27001', sublabelKey: 'trust.certified' },
  { icon: CheckCircle, label: 'SOC2', sublabelKey: 'trust.compliant' },
  { icon: Award, label: 'GDPR', sublabelKey: 'trust.ready' },
 ];
 
 export function TrustSignalsBar() {
   const { t } = useTranslation('tour');
   const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
 
   return (
     <section 
       ref={ref as React.RefObject<HTMLDivElement>}
       className="py-8 px-4"
     >
       <div className={cn(
         'max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10 transition-all duration-700',
         isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
       )}>
        {trustBadgesConfig.map((badge, index) => (
           <div 
             key={index}
             className={cn(
               'flex items-center gap-2 transition-all duration-300',
               'hover:scale-105'
             )}
             style={{ transitionDelay: `${index * 100}ms` }}
           >
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
               <badge.icon className="w-5 h-5 text-primary" />
             </div>
             <div className="text-left">
               <div className="flex items-baseline gap-1">
                 {badge.rating && (
                   <span className="text-lg font-bold text-foreground">{badge.rating}</span>
                 )}
                 <span className="font-semibold text-foreground">{badge.label}</span>
               </div>
              {badge.sublabelKey && (
                <span className="text-xs text-muted-foreground">{t(badge.sublabelKey)}</span>
               )}
             </div>
           </div>
         ))}
       </div>
     </section>
   );
 }