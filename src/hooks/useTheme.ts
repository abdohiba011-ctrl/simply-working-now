import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Always default to light mode. Only honor an explicit user choice
    // saved in localStorage — never auto-switch based on the OS preference.
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('motonita-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes and add the current theme
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('motonita-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};
