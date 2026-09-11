import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types/production';
import { translations } from './translations';

export type BreakdownLanguage = 'en' | 'ta' | 'auto';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  breakdownLanguage: BreakdownLanguage;
  setBreakdownLanguage: (lang: BreakdownLanguage) => void;
  effectiveBreakdownLang: Language;
  autoConvertBamini: boolean;
  setAutoConvertBamini: (enabled: boolean) => void;
  t: typeof translations.en;
  fontFamily: 'default' | 'tamil-modern' | 'tamil-serif';
  setFontFamily: (font: 'default' | 'tamil-modern' | 'tamil-serif') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('cinebreak_language');
    return (saved === 'ta' || saved === 'en') ? saved : 'en';
  });

  const [breakdownLanguage, setBreakdownLanguageState] = useState<BreakdownLanguage>(() => {
    const saved = localStorage.getItem('cinebreak_breakdown_language');
    return (saved === 'ta' || saved === 'en' || saved === 'auto') ? saved : 'ta';
  });

  const [autoConvertBamini, setAutoConvertBaminiState] = useState<boolean>(() => {
    const saved = localStorage.getItem('cinebreak_auto_convert_bamini');
    return saved === null ? true : saved === 'true'; // Default is TRUE
  });

  const [fontFamily, setFontFamily] = useState<'default' | 'tamil-modern' | 'tamil-serif'>('tamil-modern');

  useEffect(() => {
    localStorage.setItem('cinebreak_language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('cinebreak_breakdown_language', breakdownLanguage);
  }, [breakdownLanguage]);

  useEffect(() => {
    localStorage.setItem('cinebreak_auto_convert_bamini', String(autoConvertBamini));
  }, [autoConvertBamini]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setBreakdownLanguage = (lang: BreakdownLanguage) => {
    setBreakdownLanguageState(lang);
  };

  const setAutoConvertBamini = (enabled: boolean) => {
    setAutoConvertBaminiState(enabled);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'ta' : 'en'));
  };

  const effectiveBreakdownLang: Language =
    breakdownLanguage === 'auto' ? language : breakdownLanguage;

  const t = translations[language];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        breakdownLanguage,
        setBreakdownLanguage,
        effectiveBreakdownLang,
        autoConvertBamini,
        setAutoConvertBamini,
        t,
        fontFamily,
        setFontFamily,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
