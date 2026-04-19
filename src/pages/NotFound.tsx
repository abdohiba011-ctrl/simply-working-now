import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center">
                <AlertTriangle className="w-16 h-16 text-muted-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
                404
              </div>
            </div>
          </div>

          {/* Content */}
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            {t('notFound.title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('notFound.description')}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg" className="gap-2">
              <Link to="/">
                <Home className="w-5 h-5" />
                {t('notFound.goToHomepage')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/listings?location=Maarif">
                <Search className="w-5 h-5" />
                {t('notFound.browseBikes')}
              </Link>
            </Button>
          </div>

          {/* Back link */}
          <div className="mt-8">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('notFound.goBack')}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
