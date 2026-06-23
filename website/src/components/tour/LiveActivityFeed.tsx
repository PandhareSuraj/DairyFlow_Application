 import React, { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { Activity, CheckCircle2, UserPlus, Trophy } from 'lucide-react';
 
 interface ActivityItem {
   id: number;
   type: 'delivery' | 'customer' | 'achievement';
   dairy: string;
   count: number;
 }
 
 const dairyNames = [
   'Sharma Dairy', 'Krishna Farms', 'Patel Milk Co', 'Fresh Dairy', 
   'Sunrise Dairy', 'Green Valley', 'Pure Milk', 'Golden Dairy'
 ];
 
 function generateActivity(): ActivityItem {
   const types: ActivityItem['type'][] = ['delivery', 'customer', 'achievement'];
   const type = types[Math.floor(Math.random() * types.length)];
   return {
     id: Date.now() + Math.random(),
     type,
     dairy: dairyNames[Math.floor(Math.random() * dairyNames.length)],
     count: type === 'delivery' ? Math.floor(Math.random() * 80) + 20 : Math.floor(Math.random() * 15) + 5
   };
 }
 
 export function LiveActivityFeed() {
   const { t } = useTranslation('tour');
   const [activities, setActivities] = useState<ActivityItem[]>([
     generateActivity(),
     generateActivity(),
     generateActivity()
   ]);
 
   useEffect(() => {
     const interval = setInterval(() => {
       setActivities(prev => {
         const newActivity = generateActivity();
         return [newActivity, ...prev.slice(0, 2)];
       });
     }, 4000);
     return () => clearInterval(interval);
   }, []);
 
   const getIcon = (type: ActivityItem['type']) => {
     switch (type) {
       case 'delivery': return CheckCircle2;
       case 'customer': return UserPlus;
       case 'achievement': return Trophy;
     }
   };
 
   const getColor = (type: ActivityItem['type']) => {
     switch (type) {
       case 'delivery': return 'text-success bg-success/10';
       case 'customer': return 'text-primary bg-primary/10';
       case 'achievement': return 'text-warning bg-warning/10';
     }
   };
 
   const getMessage = (item: ActivityItem) => {
     switch (item.type) {
       case 'delivery': 
         return t('liveActivity.completedDeliveries', { count: item.count });
       case 'customer': 
         return t('liveActivity.addedCustomers', { count: item.count });
       case 'achievement': 
         return t('liveActivity.achievedOnTime');
     }
   };
 
   return (
     <div className="bg-card rounded-2xl border border-border/50 shadow-soft p-6">
       <div className="flex items-center gap-2 mb-4">
         <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
         <span className="text-sm font-semibold text-foreground">
           {t('liveActivity.title')}
         </span>
       </div>
       
       <div className="space-y-3">
         {activities.map((item, index) => {
           const Icon = getIcon(item.type);
           return (
             <div 
               key={item.id}
               className={cn(
                 'flex items-center gap-3 p-3 rounded-xl transition-all duration-500',
                 index === 0 ? 'animate-slide-in-bottom bg-muted/50' : 'bg-muted/30'
               )}
             >
               <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', getColor(item.type))}>
                 <Icon className="w-4 h-4" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm text-foreground truncate">
                   <span className="font-semibold">{item.dairy}</span>{' '}
                   {getMessage(item)}
                 </p>
               </div>
             </div>
           );
         })}
       </div>
     </div>
   );
 }