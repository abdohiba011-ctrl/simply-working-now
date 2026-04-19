import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';

// Get initial language from localStorage or default to 'en'
const getInitialLanguage = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('motori-language');
      if (saved && ['en', 'fr', 'ar'].includes(saved)) {
        return saved;
      }
    }
  } catch {
    // localStorage may be blocked or unavailable (incognito, security settings)
    console.warn('[i18n] localStorage unavailable, using default language');
  }
  return 'en';
};

// Initialize i18n with error handling
try {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fr: { translation: fr },
        ar: { translation: ar }
      },
      lng: getInitialLanguage(),
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      },
      // Missing translation detector (dev mode)
      saveMissing: true,
      missingKeyHandler: (lngs, ns, key) => {
        if (import.meta.env.DEV) {
          console.warn(`⚠️ Missing translation key: "${key}" for language(s): ${lngs.join(', ')}`);
        }
      },
      // Return empty string for missing keys in production to show fallback
      returnEmptyString: false,
      // Parse missing key handler
      parseMissingKeyHandler: (key) => {
        if (import.meta.env.DEV) {
          // Show visual indicator in dev mode
          return `[MISSING: ${key}]`;
        }
        return key;
      }
    });
} catch (error) {
  console.error('[i18n] Failed to initialize:', error);
  // Initialize with minimal config as fallback
  i18n
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en } },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false }
    });
}

export default i18n;
