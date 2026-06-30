"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "./dictionaries/en";
import { interpolate } from "./interpolate";
import type { Locale } from "./types";

type TValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  t: (path: string, values?: TValues) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolvePath(dictionary: Dictionary, path: string): string | undefined {
  const keys = path.split(".");
  let cur: unknown = dictionary;
  for (const key of keys) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const t = useCallback(
    (path: string, values?: TValues) => {
      const raw = resolvePath(dictionary, path) ?? path;
      return values ? interpolate(raw, values) : raw;
    },
    [dictionary]
  );

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `dojo_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
      startTransition(() => {
        router.refresh();
      });
    },
    [router]
  );

  const value = useMemo(
    () => ({ locale, dictionary, t, setLocale }),
    [locale, dictionary, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
