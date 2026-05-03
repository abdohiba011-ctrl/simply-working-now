import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Only show on long pages
const LONG_PAGES = [
  '/',
  '/listings',
  '/affiliate',
  '/about',
  '/fixers',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/cookies',
];

export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // Check if current route is a long page (includes /bike/* paths)
  const isLongPage = LONG_PAGES.includes(location.pathname);

  useEffect(() => {
    if (!isLongPage) {
      setIsVisible(false);
      return;
    }

    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    toggleVisibility(); // Check initial state
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [isLongPage, location.pathname]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isLongPage) return null;

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center justify-center rounded-full bg-primary shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "w-[32px] h-[32px]",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4 text-black" />
    </button>
  );
};
