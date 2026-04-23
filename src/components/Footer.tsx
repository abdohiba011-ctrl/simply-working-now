import { memo } from "react";
import { Facebook, Instagram, Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import logoDark from "@/assets/motonita-logo-dark.svg";

export const Footer = memo(() => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <img src={logoDark} alt="Motonita Maroc" className="h-10 w-auto mb-4" translate="no" />
            <p className="text-background/80 mb-4 leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex gap-4">
              <a
                href="https://web.facebook.com/Motonita.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary flex items-center justify-center transition-colors"
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/motonita.ma/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary flex items-center justify-center transition-colors"
                aria-label="Visit our Instagram page"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://api.whatsapp.com/send?phone=212710564476"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary flex items-center justify-center transition-colors"
                aria-label="Contact us on WhatsApp (0710564476)"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-background/80 hover:text-primary transition-colors">
                  {t('footer.home')}
                </Link>
              </li>
              <li>
                <Link to="/listings" className="text-background/80 hover:text-primary transition-colors">
                  {t('footer.browseBikes')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-background/80 hover:text-primary transition-colors">
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-background/80 hover:text-primary transition-colors">
                  {t('footer.faq')}
                </Link>
              </li>
            </ul>
            
            {/* Legal Links */}
          </div>

          {/* Popular Cities */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary">{t('footer.popularCities')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/listings?location=Casablanca" className="text-background/80 hover:text-primary transition-colors flex items-center gap-2">
                  {t('cityNames.casablanca')}
                  <Badge variant="default" className="bg-green-800 text-white text-[10px] px-1.5 py-0">{t('footer.nowLive')}</Badge>
                </Link>
              </li>
              <li>
                <span className="text-background/50 flex items-center gap-2 cursor-not-allowed">
                  {t('cityNames.marrakesh')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('footer.comingSoon')}</Badge>
                </span>
              </li>
              <li>
                <span className="text-background/50 flex items-center gap-2 cursor-not-allowed">
                  {t('cityNames.rabat')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('footer.comingSoon')}</Badge>
                </span>
              </li>
              <li>
                <span className="text-background/50 flex items-center gap-2 cursor-not-allowed">
                  {t('cityNames.tangier')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('footer.comingSoon')}</Badge>
                </span>
              </li>
              <li>
                <span className="text-background/50 flex items-center gap-2 cursor-not-allowed">
                  {t('cityNames.agadir')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('footer.comingSoon')}</Badge>
                </span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-primary">{t('footer.contactUs')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-background/80">{t('cityNames.casablanca')}, Morocco</span>
              </li>
              <li className="flex items-center gap-3">
                <WhatsAppIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <a href="https://api.whatsapp.com/send?phone=212710564476" target="_blank" rel="noopener noreferrer" className="text-background/80 hover:text-primary transition-colors">
                  0710564476
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <a href="mailto:contact@motonita.ma" className="text-background/80 hover:text-primary transition-colors">
                  contact@motonita.ma
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-background/60">
              © {new Date().getFullYear()} Motonita Maroc. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-2 md:gap-4 text-sm text-background/60">
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                {t('legal.privacyPolicy')}
              </Link>
              <span>|</span>
              <Link to="/terms" className="hover:text-primary transition-colors">
                {t('legal.termsConditions')}
              </Link>
              <span>|</span>
              <Link to="/cookies" className="hover:text-primary transition-colors">
                {t('legal.cookiesPolicy')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
