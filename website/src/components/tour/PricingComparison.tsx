 import React from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { useScrollAnimation } from '@/hooks/useScrollAnimation';
 import { Check, X, Shield } from 'lucide-react';
 
 interface Feature {
  nameKey: string;
   starter: boolean | string;
   professional: boolean | string;
   enterprise: boolean | string;
 }
 
const featuresConfig: Feature[] = [
  { nameKey: 'pricing.comparison.customers', starter: 'pricing.tiers.starter.features.0', professional: 'pricing.comparison.unlimited', enterprise: 'pricing.comparison.unlimited' },
  { nameKey: 'pricing.comparison.routeOptimization', starter: 'pricing.comparison.basic', professional: 'pricing.comparison.aiPowered', enterprise: 'pricing.comparison.aiCustom' },
  { nameKey: 'pricing.comparison.support', starter: 'pricing.comparison.emailSupport', professional: 'pricing.comparison.prioritySupport', enterprise: 'pricing.comparison.dedicatedAM' },
  { nameKey: 'pricing.comparison.apiAccess', starter: false, professional: true, enterprise: true },
  { nameKey: 'pricing.comparison.whiteLabel', starter: false, professional: false, enterprise: true },
  { nameKey: 'pricing.comparison.multiLocation', starter: false, professional: true, enterprise: true },
  { nameKey: 'pricing.comparison.customIntegrations', starter: false, professional: false, enterprise: true },
  { nameKey: 'pricing.comparison.slaGuarantee', starter: false, professional: false, enterprise: true },
 ];
 
function FeatureValue({ value, t }: { value: boolean | string; t: (key: string) => string }) {
   if (typeof value === 'string') {
    // Check if value looks like a translation key
    const translatedValue = value.includes('.') ? t(value) : value;
    return <span className="text-foreground font-medium">{translatedValue}</span>;
   }
   return value ? (
     <Check className="w-5 h-5 text-success mx-auto" />
   ) : (
     <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
   );
 }
 
 export function PricingComparison() {
   const { t } = useTranslation('tour');
   const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
 
   return (
     <div 
       ref={ref as React.RefObject<HTMLDivElement>}
       className={cn(
         'mt-16 transition-all duration-700',
         isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
       )}
     >
       <h3 className="text-xl font-bold text-center mb-8">{t('pricing.compare')}</h3>
       
        <p className="text-xs text-muted-foreground text-center mb-2 md:hidden">← {t('pricing.comparison.scrollHint', { defaultValue: 'Scroll to compare all plans' })} →</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
           <thead>
             <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">{t('pricing.comparison.feature')}</th>
              <th className="text-center py-4 px-4 font-semibold text-foreground">{t('pricing.tiers.starter.name')}</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">{t('pricing.tiers.professional.name')}</th>
              <th className="text-center py-4 px-4 font-semibold text-foreground">{t('pricing.tiers.enterprise.name')}</th>
             </tr>
           </thead>
           <tbody>
            {featuresConfig.map((feature, index) => (
               <tr 
                 key={index} 
                 className="border-b border-border/50 hover:bg-muted/30 transition-colors"
               >
                <td className="py-4 px-4 text-foreground">{t(feature.nameKey)}</td>
                 <td className="py-4 px-4 text-center">
                  <FeatureValue value={feature.starter} t={t} />
                 </td>
                 <td className="py-4 px-4 text-center bg-primary/5">
                  <FeatureValue value={feature.professional} t={t} />
                 </td>
                 <td className="py-4 px-4 text-center">
                  <FeatureValue value={feature.enterprise} t={t} />
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
 
       {/* Money-back guarantee */}
       <div className="mt-12 bg-gradient-to-r from-success/10 via-success/5 to-success/10 rounded-2xl border border-success/20 p-6 flex items-center gap-4">
         <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center flex-shrink-0">
           <Shield className="w-7 h-7 text-success" />
         </div>
         <div>
           <h4 className="font-bold text-lg text-foreground">{t('pricing.guarantee.title')}</h4>
           <p className="text-muted-foreground">{t('pricing.guarantee.description')}</p>
         </div>
       </div>
     </div>
   );
 }