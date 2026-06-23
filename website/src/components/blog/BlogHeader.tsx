import React from 'react';
 import { useTranslation } from 'react-i18next';
import { Newspaper } from 'lucide-react';

export function BlogHeader() {
   const { t } = useTranslation('blog');
   
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Newspaper className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
           {t('title')}
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
           {t('subtitle')}
        </p>
      </div>
    </section>
  );
}
