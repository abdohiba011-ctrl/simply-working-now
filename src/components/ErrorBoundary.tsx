import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import motoriLogo from '@/assets/motori-logo.svg';
import motoriLogoDark from '@/assets/motori-logo-dark.svg';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Fallback translations for when i18n is not available (error occurred before i18n loaded)
const fallbackTranslations: Record<string, Record<string, string>> = {
  en: {
    title: 'Something went wrong',
    message: 'We encountered an unexpected error. This might be a temporary issue. Please try refreshing the page.',
    refreshPage: 'Refresh Page',
    goToHome: 'Go to Home',
    persistsMessage: 'If this problem persists, please contact support.',
  },
  ar: {
    title: 'حدث خطأ ما',
    message: 'واجهنا خطأ غير متوقع. قد تكون هذه مشكلة مؤقتة. يرجى تحديث الصفحة.',
    refreshPage: 'تحديث الصفحة',
    goToHome: 'الذهاب للرئيسية',
    persistsMessage: 'إذا استمرت المشكلة، يرجى التواصل مع الدعم.',
  },
  fr: {
    title: "Une erreur s'est produite",
    message: "Nous avons rencontré une erreur inattendue. Il peut s'agir d'un problème temporaire. Veuillez actualiser la page.",
    refreshPage: 'Actualiser la page',
    goToHome: "Aller à l'accueil",
    persistsMessage: 'Si ce problème persiste, veuillez contacter le support.',
  },
};

// Get browser language or stored preference
const getLanguage = (): string => {
  try {
    // Check localStorage for saved preference
    const stored = localStorage.getItem('i18nextLng');
    if (stored && ['en', 'ar', 'fr'].includes(stored)) {
      return stored;
    }
    // Fall back to browser language
    const browserLang = navigator.language?.slice(0, 2) || 'en';
    return ['en', 'ar', 'fr'].includes(browserLang) ? browserLang : 'en';
  } catch {
    return 'en';
  }
};

// Structured error logging for future monitoring integration
const logError = (error: Error | null, errorInfo: React.ErrorInfo | null) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    type: 'react_error_boundary',
    error: {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack?.slice(0, 1000) || null,
    },
    componentStack: errorInfo?.componentStack?.slice(0, 500) || null,
    location: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };
  
  console.error('[ErrorBoundary] Application error:', errorData);
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const lang = getLanguage();
      const t = fallbackTranslations[lang] || fallbackTranslations.en;
      const isRTL = lang === 'ar';
      
      // Check for dark mode preference
      const isDarkMode = typeof window !== 'undefined' && 
        (document.documentElement.classList.contains('dark') ||
         window.matchMedia('(prefers-color-scheme: dark)').matches);

      return (
        <div 
          className="min-h-screen bg-background flex items-center justify-center p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="max-w-md w-full text-center space-y-6">
            {/* Motori Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={isDarkMode ? motoriLogoDark : motoriLogo} 
                alt="Motori.ma" 
                className="h-10 w-auto"
              />
            </div>

            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t.title}
              </h1>
              <p className="text-muted-foreground">
                {t.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t.refreshPage}
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                {t.goToHome}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t.persistsMessage}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
