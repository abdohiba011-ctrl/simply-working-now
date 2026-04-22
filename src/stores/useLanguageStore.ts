import { create } from "zustand";
import i18n from "@/i18n";

export type Language = "en" | "fr" | "ar";

interface LanguageState {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
}

const stored = (typeof window !== "undefined"
  ? (localStorage.getItem("motonita-language") as Language | null)
  : null) || "fr";

export const useLanguageStore = create<LanguageState>((set) => ({
  language: stored,
  isRTL: stored === "ar",
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("motonita-language", lang);
    set({ language: lang, isRTL: lang === "ar" });
  },
}));
