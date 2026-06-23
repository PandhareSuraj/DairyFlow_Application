 import React, { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
 import { X, Sparkles } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Link } from 'react-router-dom';
 
export function AnnouncementBar() {
  const { t } = useTranslation('tour');
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Persist countdown end time in localStorage
    const STORAGE_KEY = 'announcement_end_time';
    let endTime = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (!endTime || endTime <= Date.now()) {
      endTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
      localStorage.setItem(STORAGE_KEY, endTime.toString());
    }

    const updateTime = () => {
      const diff = Math.max(0, endTime - Date.now());
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);
 
   if (!isVisible) return null;
 
   const formatTime = (n: number) => n.toString().padStart(2, '0');
 
   return (
     <div className="bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground py-2.5 px-4 relative overflow-hidden">
       {/* Animated background shimmer */}
       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer" />
       
       <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-sm font-medium relative">
         <Sparkles className="w-4 h-4 animate-pulse hidden sm:block" />
         
         <span className="text-center">
           {t('announcement.text')}
         </span>
         
         {/* Countdown timer */}
         <div className="hidden md:flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1">
           <span className="font-mono font-bold">{formatTime(timeLeft.hours)}</span>:
           <span className="font-mono font-bold">{formatTime(timeLeft.minutes)}</span>:
           <span className="font-mono font-bold">{formatTime(timeLeft.seconds)}</span>
         </div>
         
         <Link 
           to="/auth" 
           className="font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
         >
           {t('announcement.cta')} →
         </Link>
         
         <button
           onClick={() => setIsVisible(false)}
           className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
           aria-label="Close announcement"
         >
           <X className="w-4 h-4" />
         </button>
       </div>
     </div>
   );
 }