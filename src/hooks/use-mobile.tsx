import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    
    // Use matchMedia.matches instead of window.innerWidth to avoid forced reflow
    mql.addEventListener("change", onChange);
    
    // Defer initial check to avoid blocking paint
    requestAnimationFrame(() => {
      setIsMobile(mql.matches);
    });
    
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

const LG_BREAKPOINT = 1024;

export function useIsBelowLg() {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => setIsBelow(mql.matches);
    mql.addEventListener("change", onChange);
    requestAnimationFrame(() => setIsBelow(mql.matches));
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBelow;
}
