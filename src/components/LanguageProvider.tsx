"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations, type Language, type Translations } from "@/lib/i18n";

const STORAGE_KEY = "pacepulse_lang";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "id",
  setLanguage: () => {},
  t: translations.id,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "id" || saved === "en") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const t = (language === "en" ? translations.en : translations.id) as Translations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle({ onChange }: { onChange?: (lang: Language) => void }) {
  const { language, setLanguage } = useLanguage();

  const handleSelect = (next: Language) => {
    setLanguage(next);
    onChange?.(next);
  };

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="inline-flex items-center rounded-lg bg-[#18181B] border border-[#27272A] p-0.5 text-[11px] font-mono font-bold shrink-0"
    >
      <button
        type="button"
        onClick={() => handleSelect("id")}
        className={`px-2 py-1 rounded-md transition-colors ${
          language === "id"
            ? "bg-emerald-500 text-zinc-950"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => handleSelect("en")}
        className={`px-2 py-1 rounded-md transition-colors ${
          language === "en"
            ? "bg-emerald-500 text-zinc-950"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
