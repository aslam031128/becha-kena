'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { bn, TranslationDict } from './bn';
import { dictionaries } from './translations';
import { TOP_LANGUAGES, Language } from './languages';

export type Locale = 'bn' | 'en' | 'ar' | 'hi' | 'es' | 'fr' | 'zh' | 'ms' | 'de' | 'ur';

interface I18nContextType {
  locale: Locale;
  currentLanguage: Language;
  t: TranslationDict;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('bn');

  useEffect(() => {
    const saved = localStorage.getItem('bk_locale') as Locale | null;
    if (saved && dictionaries[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const currentLanguage =
    TOP_LANGUAGES.find((l) => l.code === locale) || TOP_LANGUAGES[0];

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = currentLanguage.dir || 'ltr';
    }
  }, [locale, currentLanguage]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('bk_locale', newLocale);
  };

  const toggleLocale = () => {
    const next = locale === 'bn' ? 'en' : 'bn';
    setLocale(next);
  };

  const t = dictionaries[locale] || bn;

  return (
    <I18nContext.Provider
      value={{
        locale,
        currentLanguage,
        t,
        setLocale,
        toggleLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: 'bn' as Locale,
      currentLanguage: TOP_LANGUAGES[0],
      t: bn,
      setLocale: () => {},
      toggleLocale: () => {},
    };
  }
  return context;
}

