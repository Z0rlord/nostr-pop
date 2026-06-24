"use client";

import { useI18n, localeNames, localeFlags } from "./I18nProvider";
import { useState, useRef, useEffect } from "react";

export default function LocaleSwitcher() {
  const { locale, setLocale, locales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLocaleChange(newLocale: typeof locales[number]) {
    setLocale(newLocale);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-surface hover:border-primary transition-colors text-sm font-medium rounded-md"
        aria-label="Change language"
      >
        <span>{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border-2 border-border shadow-lg z-50 rounded-md overflow-hidden">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleLocaleChange(l)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary hover:text-primary-foreground transition-colors ${
                locale === l ? "bg-primary/10 border-l-4 border-primary" : ""
              }`}
            >
              <span className="text-lg">{localeFlags[l]}</span>
              <span className="font-medium">{localeNames[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
