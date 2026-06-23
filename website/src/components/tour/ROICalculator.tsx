 import React, { useState, useMemo } from 'react';
 import { useTranslation } from 'react-i18next';
 import { cn } from '@/lib/utils';
 import { useScrollAnimation } from '@/hooks/useScrollAnimation';
 import { Calculator, TrendingUp, Clock, Target, ArrowRight } from 'lucide-react';
 import { Slider } from '@/components/ui/slider';
 import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LeadGate } from './LeadGate';
 
 export function ROICalculator() {
   const { t } = useTranslation('tour');
   const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
   
    const [monthlyIncome, setMonthlyIncome] = useState(100000);
    const [customers, setCustomers] = useState(100);
    const [dailyOrders, setDailyOrders] = useState(80);
    const [missedRate, setMissedRate] = useState(5);

    const savings = useMemo(() => {
      const avgOrderValue = monthlyIncome / (customers * 30);
      const missedOrdersCurrent = (dailyOrders * 30 * missedRate) / 100;
      const missedOrdersNew = missedOrdersCurrent * 0.05;
      const savedOrders = missedOrdersCurrent - missedOrdersNew;
      const monthlySavings = Math.round(savedOrders * avgOrderValue);
      const savingsPercent = ((monthlySavings / monthlyIncome) * 100).toFixed(1);
      const hoursPerWeek = Math.round((customers / 50) * 2);
      
      return {
        monthly: monthlySavings,
        percent: savingsPercent,
        hours: hoursPerWeek,
        reduction: 95
      };
    }, [monthlyIncome, customers, dailyOrders, missedRate]);
 
   const formatCurrency = (value: number) => {
     if (value >= 100000) {
       return `₹${(value / 100000).toFixed(1)}L`;
     } else if (value >= 1000) {
       return `₹${(value / 1000).toFixed(0)}K`;
     }
     return `₹${value}`;
   };
 
   return (
     <section 
       ref={ref as React.RefObject<HTMLDivElement>}
       className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5"
     >
       <div className="max-w-5xl mx-auto">
         <div className={cn(
           'text-center mb-12 transition-all duration-700',
           isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
         )}>
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
             <Calculator className="w-4 h-4" />
             {t('roi.title')}
           </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              {t('roi.heading', { defaultValue: 'Calculate Your Savings' })}
            </h2>
         </div>
 
         <div className={cn(
           'grid md:grid-cols-2 gap-8 transition-all duration-700 delay-200',
           isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
         )}>
           {/* Input controls */}
            <div className="bg-card rounded-3xl border border-border/50 shadow-soft p-8 space-y-8">
              {/* Monthly income slider */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="font-medium text-foreground">{t('roi.monthlyIncome', { defaultValue: 'Your Current Monthly Income' })}</label>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(monthlyIncome)}</span>
                </div>
                <Slider
                  value={[monthlyIncome]}
                  onValueChange={(v) => setMonthlyIncome(v[0])}
                  min={20000}
                  max={1000000}
                  step={10000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>₹20K</span>
                  <span>₹10L</span>
                </div>
              </div>

              {/* Customers slider */}
              <div>
               <div className="flex justify-between items-center mb-4">
                 <label className="font-medium text-foreground">{t('roi.customers')}</label>
                 <span className="text-2xl font-bold text-primary">{customers}</span>
               </div>
               <Slider
                 value={[customers]}
                 onValueChange={(v) => setCustomers(v[0])}
                 min={10}
                 max={500}
                 step={10}
                 className="w-full"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                 <span>10</span>
                 <span>500+</span>
               </div>
             </div>
 
             {/* Daily orders slider */}
             <div>
               <div className="flex justify-between items-center mb-4">
                 <label className="font-medium text-foreground">{t('roi.dailyOrders')}</label>
                 <span className="text-2xl font-bold text-primary">{dailyOrders}</span>
               </div>
               <Slider
                 value={[dailyOrders]}
                 onValueChange={(v) => setDailyOrders(v[0])}
                 min={10}
                 max={300}
                 step={5}
                 className="w-full"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                 <span>10</span>
                 <span>300+</span>
               </div>
             </div>
 
             {/* Missed rate slider */}
             <div>
               <div className="flex justify-between items-center mb-4">
                 <label className="font-medium text-foreground">{t('roi.currentMissed')}</label>
                 <span className="text-2xl font-bold text-destructive">{missedRate}%</span>
               </div>
               <Slider
                 value={[missedRate]}
                 onValueChange={(v) => setMissedRate(v[0])}
                 min={1}
                 max={15}
                 step={1}
                 className="w-full"
               />
               <div className="flex justify-between text-xs text-muted-foreground mt-2">
                 <span>1%</span>
                 <span>15%</span>
               </div>
             </div>
           </div>
 
            {/* Results - gated behind lead form */}
            <LeadGate>
              <div className="bg-gradient-to-br from-primary/10 via-card to-accent/10 rounded-3xl border-2 border-primary/30 shadow-strong p-8">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t('roi.result.title')}
                </h3>
                
                <div className="space-y-6">
                  {/* Monthly savings */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-success">
                        {formatCurrency(savings.monthly)}
                      </div>
                      <div className="text-muted-foreground">
                         {t('roi.result.monthly')}
                       </div>
                       <div className="text-sm text-success/80 font-medium">
                         {savings.percent}% {t('roi.result.ofIncome', { defaultValue: 'of your income' })}
                       </div>
                    </div>
                  </div>

                  {/* Hours saved */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {savings.hours} {t('roi.result.hoursLabel', { defaultValue: 'hrs' })}
                      </div>
                      <div className="text-muted-foreground">
                        {t('roi.result.weekly')}
                      </div>
                    </div>
                  </div>

                  {/* Reduction */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-accent">
                        {savings.reduction}%
                      </div>
                      <div className="text-muted-foreground">
                        {t('roi.result.reduction')}
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full mt-8 bg-gradient-primary hover:opacity-90 text-lg h-12 pulse-glow"
                >
                  <Link to="/auth">
                    {t('nav.getStarted')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </LeadGate>
          </div>
        </div>
      </section>
    );
  }