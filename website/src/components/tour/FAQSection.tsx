import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'pricing' | 'setup' | 'features' | 'general';
}

const categoryColors: Record<string, string> = {
  pricing: 'bg-primary/10 text-primary',
  setup: 'bg-success/10 text-success',
  features: 'bg-warning/10 text-warning',
  general: 'bg-accent text-accent-foreground',
};

export function FAQSection() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const faqItems = t('faq.items', { returnObjects: true }) as FAQItem[];
  const categories = t('faq.categories', { returnObjects: true }) as Record<string, string>;

  return (
    <section
      id="faq"
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 bg-muted/30 scroll-mt-20"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-12 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            {t('faq.badge')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {t('faq.title')} <span className="text-primary">{t('faq.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('faq.subtitle')}
            <a href="#contact" className="text-primary hover:underline ml-1">{t('faq.contactLink')}</a>.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className={cn(
          'transition-all duration-700 delay-200',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={cn(
                  'bg-card border border-border rounded-xl px-6 overflow-hidden',
                  'transition-all duration-300',
                  'data-[state=open]:shadow-medium data-[state=open]:border-primary/30'
                )}
              >
                <AccordionTrigger className="hover:no-underline py-5 gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0',
                      categoryColors[item.category] || categoryColors.general
                    )}>
                      {categories[item.category] || item.category}
                    </span>
                    <span className="font-semibold text-foreground">
                      {item.question}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pt-0 text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Still have questions CTA */}
        <div className={cn(
          'mt-12 text-center p-8 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-border',
          'transition-all duration-700 delay-400',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('faq.stillHaveQuestions.title')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('faq.stillHaveQuestions.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:support@dairyflow.app"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {t('faq.stillHaveQuestions.emailSupport')}
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-6 py-3 bg-card border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
            >
              {t('faq.stillHaveQuestions.liveChat')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
