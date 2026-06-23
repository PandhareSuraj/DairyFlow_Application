 import React, { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { CheckCircle, X } from 'lucide-react';
 
const notificationsConfig = [
  { name: 'Shree Gokul Dairy', location: 'Nashik', actionKey: 'socialProof.actions.startedTrial' },
  { name: 'FreshMilk Express', location: 'Pune', actionKey: 'socialProof.actions.upgraded' },
  { name: 'Desi Farms', location: 'Jaipur', actionKey: 'socialProof.actions.completedDeliveries' },
  { name: 'PureDrop Dairy', location: 'Surat', actionKey: 'socialProof.actions.joined' },
  { name: 'Kamdhenu Milk', location: 'Indore', actionKey: 'socialProof.actions.savedMoney' },
];
 
 export function SocialProofNotification() {
   const { t } = useTranslation('tour');
   const [currentIndex, setCurrentIndex] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [isDismissed, setIsDismissed] = useState(false);
 
   useEffect(() => {
     if (isDismissed) return;
 
     // Show first notification after 5 seconds
     const initialDelay = setTimeout(() => {
       setIsVisible(true);
     }, 5000);
 
     return () => clearTimeout(initialDelay);
   }, [isDismissed]);
 
   useEffect(() => {
     if (!isVisible || isDismissed) return;
 
     // Rotate through notifications
     const interval = setInterval(() => {
       setIsVisible(false);
       
       setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % notificationsConfig.length);
         setIsVisible(true);
       }, 500);
     }, 8000);
 
     return () => clearInterval(interval);
   }, [isVisible, isDismissed]);
 
   if (isDismissed) return null;
 
  const notification = notificationsConfig[currentIndex];
 
   return (
     <div 
        className={cn(
          'fixed bottom-20 sm:bottom-24 left-4 z-30 max-w-[280px]',
         'transform transition-all duration-500',
         isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
       )}
     >
       <div className="bg-card rounded-2xl border border-border/50 shadow-strong p-4 pr-10">
         <button
           onClick={() => setIsDismissed(true)}
           className="absolute top-2 right-2 p-1 hover:bg-muted rounded-lg transition-colors"
          aria-label={t('accessibility.dismissNotifications')}
         >
           <X className="w-3 h-3 text-muted-foreground" />
         </button>
         
         <div className="flex items-start gap-3">
           <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
             <CheckCircle className="w-5 h-5 text-success" />
           </div>
           <div>
             <p className="text-sm font-medium text-foreground">
              {notification.name} {t('socialProof.from')} {notification.location}
             </p>
             <p className="text-xs text-muted-foreground mt-0.5">
              {t(notification.actionKey)}
             </p>
             <p className="text-xs text-muted-foreground/70 mt-1">
              {t('socialProof.justNow')}
             </p>
           </div>
         </div>
       </div>
     </div>
   );
 }