 import React from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { useScrollAnimation } from '@/hooks/useScrollAnimation';
 
 // Brand names for the marquee
const brands = [
  { name: 'Shree Gokul Dairy', color: 'hsl(var(--primary))' },
  { name: 'FreshMilk Express', color: 'hsl(var(--accent))' },
  { name: 'Desi Farms', color: 'hsl(var(--success))' },
  { name: 'PureDrop Dairy', color: 'hsl(var(--warning))' },
  { name: 'MilkBasket Pro', color: 'hsl(var(--primary))' },
  { name: 'Govardhan Fresh', color: 'hsl(var(--accent))' },
  { name: 'Daily Dairy Co.', color: 'hsl(var(--success))' },
  { name: 'Kamdhenu Milk', color: 'hsl(var(--warning))' },
];
 
 function LogoPlaceholder({ name, color }: { name: string; color: string }) {
   return (
     <div 
       className="flex items-center justify-center h-12 px-8 mx-4 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-default"
     >
       <span 
         className="font-bold text-lg whitespace-nowrap"
         style={{ color }}
       >
         {name}
       </span>
     </div>
   );
 }
 
 export function CustomerLogos() {
   const { t } = useTranslation('tour');
   const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
 
   return (
     <section 
       ref={ref as React.RefObject<HTMLDivElement>}
       className="py-12 border-y border-border/50 bg-muted/20 overflow-hidden"
     >
       <div className={cn(
         'text-center mb-8 transition-all duration-500',
         isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
       )}>
         <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
           {t('trust.trustedBy')}
         </p>
       </div>
       
       {/* Marquee container */}
       <div className="relative pause-animation">
         {/* Gradient masks */}
         <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
         <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
         
         {/* Scrolling logos */}
          <div className="flex animate-marquee">
            {[...brands, ...brands, ...brands].map((brand, idx) => (
              <LogoPlaceholder key={idx} name={brand.name} color={brand.color} />
            ))}
         </div>
       </div>
     </section>
   );
 }