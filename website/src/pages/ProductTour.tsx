import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Menu, Milk } from 'lucide-react';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { BackToTopButton } from '@/components/tour/BackToTopButton';
import { ScrollProgressBar } from '@/components/tour/ScrollProgressBar';
import { ErrorBoundary, ComponentErrorFallback } from '@/components/ErrorBoundary';
import { AnnouncementBar } from '@/components/tour/AnnouncementBar';
import { CustomerLogos } from '@/components/tour/CustomerLogos';
import { TrustSignalsBar } from '@/components/tour/TrustSignalsBar';
import { ROICalculator } from '@/components/tour/ROICalculator';
import { CaseStudySection } from '@/components/tour/CaseStudyCard';
import { StickyCTABar } from '@/components/tour/StickyCTABar';
import { SocialProofNotification } from '@/components/tour/SocialProofNotification';
import { LeadCaptureModal } from '@/components/tour/LeadCaptureModal';
import { LeadBanner } from '@/components/tour/FeaturesShowcase';
import { OfflineBanner } from '@/components/ui/connection-status';
import { PWAInstallButton } from '@/components/ui/pwa-install-button';
import { HeroSection } from '@/components/tour/HeroSection';

// Lazy load below-the-fold sections for better performance
const ProblemSolutionSection = lazy(() => import('@/components/tour/ProblemSolutionSection').then(m => ({ default: m.ProblemSolutionSection })));
const FeaturesShowcase = lazy(() => import('@/components/tour/FeaturesShowcase').then(m => ({ default: m.FeaturesShowcase })));
const HowItWorksTimeline = lazy(() => import('@/components/tour/HowItWorksTimeline').then(m => ({ default: m.HowItWorksTimeline })));
const InteractiveDemo = lazy(() => import('@/components/tour/InteractiveDemo').then(m => ({ default: m.InteractiveDemo })));
const StatsSection = lazy(() => import('@/components/tour/StatsSection').then(m => ({ default: m.StatsSection })));
const TestimonialCarousel = lazy(() => import('@/components/tour/TestimonialCarousel').then(m => ({ default: m.TestimonialCarousel })));
const PricingSection = lazy(() => import('@/components/tour/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/tour/FAQSection').then(m => ({ default: m.FAQSection })));
const CTASection = lazy(() => import('@/components/tour/CTASection').then(m => ({ default: m.CTASection })));

function SectionLoaderWithTranslation() {
  const { t } = useTranslation('tour');
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{t('accessibility.loadingSection')}</span>
    </div>
  );
}

export default function ProductTour() {
  const { t } = useTranslation('tour');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Set canonical URL and page title
  React.useEffect(() => {
    document.title = "DairyFlow - India's #1 Dairy Delivery Management App";
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (link) link.setAttribute('href', 'https://dairyflow.mywebz.in/');
    return () => { if (link) link.setAttribute('href', 'https://dairyflow.mywebz.in/'); };
  }, []);

  // Inject FAQPage JSON-LD structured data for Google rich snippets
  React.useEffect(() => {
    const faqItems = t('faq.items', { returnObjects: true }) as Array<{ question: string; answer: string }>;
    if (!Array.isArray(faqItems)) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('faq-jsonld');
      if (el) document.head.removeChild(el);
    };
  }, [t]);

  const navLinks = [
    { href: '#features', label: t('nav.features') },
    { href: '#pricing', label: t('nav.pricing') },
    { href: '#faq', label: t('nav.faq') },
  ];

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Offline banner */}
      <OfflineBanner />

      {/* Announcement bar */}
      <AnnouncementBar />

      {/* Skip navigation link */}
      <a href="#main-content" className="skip-nav">
        {t('accessibility.skipToContent')}
      </a>

      {/* Fixed header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Milk className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">DairyFlow</span>
          </Link>
          
          {/* Desktop navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link 
              to="/blog" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {t('nav.blog')}
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 md:gap-4">
            <PWAInstallButton className="hidden md:flex" />
            <LanguageSelector />
            
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label={t('accessibility.openMenu')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <nav className="flex flex-col gap-4 mt-8" aria-label="Mobile navigation">
                  {navLinks.map((link) => (
                    <a 
                      key={link.href}
                      href={link.href} 
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <Link 
                    to="/blog" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.blog')}
                  </Link>
                  <Button asChild className="mt-4 bg-gradient-primary hover:opacity-90">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      {t('nav.getStarted')}
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <Button asChild size="sm" className="hidden md:flex bg-gradient-primary hover:opacity-90">
              <Link to="/auth">{t('nav.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Scroll progress indicator */}
      <ScrollProgressBar />

      {/* Main content */}
      <main id="main-content">
        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <HeroSection />
        </ErrorBoundary>

        {/* Trust signals */}
        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <CustomerLogos />
          <TrustSignalsBar />
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <ProblemSolutionSection />
          </Suspense>
        </ErrorBoundary>

        {/* ROI Calculator */}
        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <ROICalculator />
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <FeaturesShowcase />
          </Suspense>
        </ErrorBoundary>

        {/* Mid-page lead capture banner */}
        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <LeadBanner />
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <HowItWorksTimeline />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <InteractiveDemo />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <StatsSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <TestimonialCarousel />
          </Suspense>
        </ErrorBoundary>

        {/* Case Studies */}
        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <CaseStudySection />
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <PricingSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <FAQSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<ComponentErrorFallback />}>
          <Suspense fallback={<SectionLoaderWithTranslation />}>
            <CTASection />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="bg-muted/30 border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-foreground">DairyFlow</h3>
              <p className="text-sm text-muted-foreground">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">{t('nav.features')}</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">{t('nav.pricing')}</a></li>
                <li><a href="#demo" className="hover:text-primary transition-colors">{t('footer.demo')}</a></li>
                <li><Link to="/blog" className="hover:text-primary transition-colors">{t('nav.blog')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#faq" className="hover:text-primary transition-colors">{t('footer.about')}</a></li>
                <li><a href="mailto:support@dairyflow.in" className="hover:text-primary transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} DairyFlow. {t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      <BackToTopButton />
      <StickyCTABar />
      <SocialProofNotification />

      {/* Lead capture modals: timed (30s) + exit intent */}
      <LeadCaptureModal trigger="timed" delayMs={30000} />
      <LeadCaptureModal trigger="exit" />
    </div>
  );
}
