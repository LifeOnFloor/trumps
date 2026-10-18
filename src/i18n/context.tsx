import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Language, TranslationDictionary } from './types.js';
import { ja } from './ja.js';
import { en } from './en.js';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'trumps_language_pref';

export const I18nProvider: React.FC<{
  children: React.ReactNode;
  initialLanguage?: Language;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang') as Language | null;
      if (urlLang === 'ja' || urlLang === 'en') return urlLang;

      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === 'ja' || saved === 'en') return saved;
    }
    return 'ja';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = useMemo(() => (language === 'en' ? en : ja), [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'ja',
      setLanguage: () => {},
      t: ja,
    };
  }
  return context;
}
