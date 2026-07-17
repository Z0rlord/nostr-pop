"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HeaderAccount } from "@/components/HeaderAccount";

const navLinkClass =
  "hover:text-white transition-colors";
const mobileNavLinkClass =
  "block rounded-lg px-3 py-3 text-base text-dojo-mist/90 hover:bg-white/5 hover:text-white transition-colors";

export function Header() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navItems = [
    { href: "/practice", label: t("header.myPractice") },
    { href: "/watch", label: t("header.watch") },
    { href: "/chat", label: t("header.chat") },
    { href: "/#how-it-works", label: t("header.howItWorks") },
    { href: "/schools", label: t("header.schools") },
    { href: "/#for-instructors", label: t("header.instructors") },
  ] as const;

  return (
    <header className="border-b border-white/5 bg-dojo-ink/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-tight text-white">
          Dojo<span className="text-dojo-crimson">Pop</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-dojo-mist/80 sm:gap-6 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <HeaderAccount />
          <Link
            href="/join"
            className="rounded-full bg-dojo-crimson px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors"
          >
            {t("header.join")}
          </Link>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/15 p-2 text-dojo-mist hover:border-dojo-gold/40 hover:text-dojo-gold transition-colors lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          id="mobile-nav"
          className="border-t border-white/10 bg-dojo-ink/95 backdrop-blur-md lg:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavLinkClass}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-4">
              <LanguageSwitcher />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <HeaderAccount
                hidePracticeLink
                onNavigate={closeMenu}
                className="flex flex-col gap-3"
              />
              <Link
                href="/join"
                className="rounded-full bg-dojo-crimson px-4 py-3 text-center font-medium text-white hover:bg-red-700 transition-colors"
                onClick={closeMenu}
              >
                {t("header.join")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
