 import React, { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 import { ArrowRight, X } from 'lucide-react';
 import { Link } from 'react-router-dom';
 
 export function StickyCTABar() {
   const { t } = useTranslation('tour');
   const [isVisible, setIsVisible] = useState(false);
   const [isDismissed, setIsDismissed] = useState(false);
 
   useEffect(() => {
     const handleScroll = () => {
       // Show after scrolling past hero section (~600px)
       const shouldShow = window.scrollY > 600;
       setIsVisible(shouldShow && !isDismissed);
     };
 
     window.addEventListener('scroll', handleScroll, { passive: true });
     return () => window.removeEventListener('scroll', handleScroll);
   }, [isDismissed]);
 
   if (!isVisible) return null;
 
   return (
     <div 
       className={cn(
         'fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-strong',
         'transform transition-transform duration-300',
         isVisible ? 'translate-y-0' : 'translate-y-full'
       )}
     >
       <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
         <p className="text-sm md:text-base font-medium text-foreground hidden sm:block">
           🚀 {t('stickyCTA.text')}
         </p>
         
         <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
           <Button
             asChild
             className="bg-gradient-primary hover:opacity-90 shadow-medium pulse-glow"
           >
             <Link to="/auth">
               {t('stickyCTA.cta')}
               <ArrowRight className="ml-2 w-4 h-4" />
             </Link>
           </Button>
           
           <button
             onClick={() => setIsDismissed(true)}
             className="p-2 hover:bg-muted rounded-lg transition-colors"
             aria-label="Dismiss"
           >
             <X className="w-4 h-4 text-muted-foreground" />
           </button>
         </div>
       </div>
     </div>
   );
 }