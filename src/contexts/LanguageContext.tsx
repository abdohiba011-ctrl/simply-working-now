// Language context for multi-language support (EN, FR, AR) - v3 with react-i18next
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { t: i18nT, i18n } = useTranslation();
  
  const language = (i18n.language || 'en') as Language;
  const isRTL = language === 'ar';

  // Update document direction and language when language changes
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Keep notranslate class to prevent Google Translate
    document.documentElement.classList.add('notranslate');
    document.documentElement.setAttribute('translate', 'no');
    
    // Add or remove RTL class for additional styling
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
    
    // Save to localStorage
    localStorage.setItem('motori-language', language);
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
  };

  const t = (key: string): string => {
    return i18nT(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};
