import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { loadLanguage } from '@/i18n';

type Language = 'en' | 'hi' | 'mr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  languages: { code: Language; name: string; nativeName: string }[];
  isLoadingTranslations: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const languageOptions: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('i18nextLng');
    return (stored as Language) || 'en';
  });
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);

  useEffect(() => {
    const loadUserLanguage = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        const preferredLang = (data as any)?.preferred_language;
        if (preferredLang && preferredLang !== language) {
          setIsLoadingTranslations(true);
          await loadLanguage(preferredLang);
          await i18n.changeLanguage(preferredLang);
          setLanguageState(preferredLang as Language);
          setIsLoadingTranslations(false);
        }
      }
    };
    loadUserLanguage();
  }, [user?.id, i18n]);

  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === language) return;
    setIsLoadingTranslations(true);
    localStorage.setItem('i18nextLng', lang);
    // Load bundles BEFORE changing language so i18next has them ready
    await loadLanguage(lang);
    await i18n.changeLanguage(lang);
    setLanguageState(lang);
    setIsLoadingTranslations(false);

    if (user?.id) {
      supabase
        .from('profiles')
        .update({ preferred_language: lang } as any)
        .eq('id', user.id);
    }
  }, [language, i18n, user?.id]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: languageOptions, isLoadingTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};
