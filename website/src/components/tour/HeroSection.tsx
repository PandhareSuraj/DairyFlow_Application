import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, TrendingUp, Truck, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientText } from './AnimatedText';
import { FloatingElement, ParallaxBackground } from './ParallaxSection';
import { Link } from 'react-router-dom';
import { InlineLeadForm } from './InlineLeadForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { VideoModal } from './VideoModal';

// Lazy load the entire Three.js scene (~774KB) so it doesn't block initial paint
const Scene3D = lazy(() => import('./Scene3D'));

interface StatBadgeProps {
  icon: React.ElementType;
  value: string;
  label: string;
  delay?: number;
  className?: string;
}

function StatBadge({ icon: Icon, value, label, delay = 0, className }: StatBadgeProps) {
  return (
    <FloatingElement delay={delay} duration={4}>
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-medium',
        'opacity-0 animate-fade-in',
        className
      )} style={{ animationDelay: `${delay * 1000}ms`, animationFillMode: 'forwards' }}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-lg font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </FloatingElement>
  );
}

export function HeroSection() {
  const { t } = useTranslation('tour');
  const isMobile = useIsMobile();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <ParallaxBackground className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6 text-center lg:text-left">
            {/* Combined badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary animate-fade-in">
              <span className="inline-flex items-center gap-1.5 text-warning">
                <Star className="w-4 h-4 fill-warning" />
                {t('hero.rating')}
              </span>
              <span className="w-px h-4 bg-border" />
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {t('hero.badge')}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight opacity-0 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              {t('hero.headline')}{' '}
              <GradientText>{t('hero.headlineHighlight')}</GradientText>
              {' '}{t('hero.headlineSuffix')}
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              {t('hero.subheadline')}
            </p>

            {/* CTA group */}
            <div className="space-y-3 opacity-0 animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
              <InlineLeadForm variant="hero" className="justify-center lg:justify-start" />
              <div className="flex justify-center lg:justify-start">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6 group"
                  onClick={() => setVideoModalOpen(true)}
                >
                  <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                  {t('hero.watchDemo')}
                </Button>
              </div>
            </div>

            {/* Video Modal */}
            <VideoModal open={videoModalOpen} onOpenChange={setVideoModalOpen} />

            {/* Trust indicators inline */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-success" />
                {t('hero.noCreditCard')}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-success" />
                {t('hero.freeTrial')}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-success" />
                {t('hero.cancelAnytime')}
              </span>
            </div>

            {/* Inline testimonial for immediate social proof */}
            <div className="flex items-center gap-3 text-sm opacity-0 animate-fade-in" style={{ animationDelay: '1000ms', animationFillMode: 'forwards' }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">RP</div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground italic leading-snug">"{t('hero.testimonial.quote')}"</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground/70">— {t('hero.testimonial.author')}</span>
                  <span className="text-amber-400 text-xs tracking-tight">★★★★★</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right - 3D Scene (only render on desktop for performance) */}
          <div className="relative h-[400px] lg:h-[500px] hidden md:block">
            {/* 3D Canvas - conditionally rendered to avoid loading Three.js on mobile */}
            <div className="absolute inset-0">
              {!isMobile && (
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading 3D scene…</div>}>
                  <Scene3D />
                </Suspense>
              )}
            </div>

            {/* Floating stat badges */}
            <StatBadge 
              icon={TrendingUp}
              value="10K+"
              label={t('hero.stats.deliveriesPerDay')}
              delay={1}
              className="absolute top-8 left-0"
            />
            <StatBadge 
              icon={CheckCircle}
              value="99.5%"
              label={t('hero.trust.onTimeRate')}
              delay={1.3}
              className="absolute top-1/2 -right-4"
            />
            <StatBadge 
              icon={Truck}
              value="2K+"
              label={t('hero.stats.deliveryPartners')}
              delay={1.6}
              className="absolute bottom-8 left-8"
            />
          </div>
        </div>
      </div>
    </ParallaxBackground>
  );
}
