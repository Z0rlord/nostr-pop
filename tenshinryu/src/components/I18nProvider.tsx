"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define available locales and their display names
export const locales = ["en", "ja", "fr", "it", "pl", "es", "de", "el"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  it: "Italiano",
  pl: "Polski",
  es: "Español",
  de: "Deutsch",
  el: "Ελληνικά",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  ja: "🇯🇵",
  fr: "🇫🇷",
  it: "🇮🇹",
  pl: "🇵🇱",
  es: "🇪🇸",
  de: "🇩🇪",
  el: "🇬🇷",
};

// Import all translations
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import fr from "../../messages/fr.json";
import it from "../../messages/it.json";
import pl from "../../messages/pl.json";
import es from "../../messages/es.json";
import de from "../../messages/de.json";
import el from "../../messages/el.json";

const messages: Record<Locale, any> = {
  en,
  ja,
  fr,
  it,
  pl,
  es,
  de,
  el,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  locales: readonly Locale[];
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Cookie helper functions
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  // Use server-provided initialLocale if available, otherwise read from cookie/localStorage
  const [locale, setLocaleState] = useState<Locale>(() => {
    // If server provided initialLocale, use it
    if (initialLocale) {
      return initialLocale;
    }
    // Otherwise try to read from cookie on client
    if (typeof window !== "undefined") {
      const cookieLocale = getCookie("locale") as Locale;
      if (cookieLocale && locales.includes(cookieLocale)) {
        return cookieLocale;
      }
    }
    return "en";
  });
  const [mounted, setMounted] = useState(!!initialLocale); // If server provided locale, we're ready

  useEffect(() => {
    setMounted(true);
    // Sync with localStorage after mount
    try {
      const saved = localStorage.getItem("locale") as Locale;
      if (saved && locales.includes(saved)) {
        setLocaleState(saved);
        setCookie("locale", saved);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("locale", newLocale);
      setCookie("locale", newLocale);
      document.documentElement.lang = newLocale;
    } catch (e) {
      // localStorage not available
    }
  };

  // Translation function with nested key support
  const t = (key: string, params?: Record<string, string>): string => {
    // If server provided initialLocale, use it immediately (no flash)
    // Otherwise wait for client mount to avoid hydration mismatch
    const activeLocale = mounted ? locale : (initialLocale || "en");
    const keys = key.split(".");
    let value: any = messages[activeLocale];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English
        value = messages["en"];
        for (const fk of keys) {
          value = value?.[fk];
          if (value === undefined) break;
        }
        break;
      }
    }
    
    if (typeof value !== "string") {
      return "";
    }
    
    // Replace params
    if (params) {
      return Object.entries(params).reduce(
        (str, [key, val]) => str.replace(`{${key}}`, val),
        value
      );
    }
    
    return value;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales, isLoading: !mounted }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
