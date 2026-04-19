import { useState, useEffect } from 'react';
import { X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage, Language } from '@/contexts/LanguageContext';

const STORAGE_KEY = 'motori-lang-banner-dismissed';

interface LanguageConfig {
  code: Language;
  nativeName: string;
  suggestion: string;
  switchText: string;
}

const languageConfigs: Record<string, LanguageConfig> = {
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    suggestion: 'العربية متوفرة!',
    switchText: 'تبديل',
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    suggestion: 'Français disponible!',
    switchText: 'Changer',
  },
};

export const LanguageSuggestionBanner = () => {
  const { language, setLanguage } = useLanguage();
  const [suggestedLanguage, setSuggestedLanguage] = useState<LanguageConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Detect browser language
    const browserLang = navigator.language.toLowerCase();
    const primaryLang = browserLang.split('-')[0];

    // Check if browser language is Arabic or French, and different from current site language
    if (primaryLang === 'ar' && language !== 'ar') {
      setSuggestedLanguage(languageConfigs.ar);
      setIsVisible(true);
    } else if (primaryLang === 'fr' && language !== 'fr') {
      setSuggestedLanguage(languageConfigs.fr);
      setIsVisible(true);
    }
  }, [language]);

  const handleSwitch = () => {
    if (suggestedLanguage) {
      setLanguage(suggestedLanguage.code);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible || !suggestedLanguage) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-[150] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-3 md:gap-4">
        <Globe className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium text-sm md:text-base" translate="no">
          {suggestedLanguage.suggestion}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSwitch}
            className="font-medium"
            translate="no"
          >
            {suggestedLanguage.switchText}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-md hover:bg-primary-foreground/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
