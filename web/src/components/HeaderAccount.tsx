"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/context";
import {
  clearPracticeIdentity,
  loadPracticeIdentity,
} from "@/lib/practice-identity";

type HeaderAccountProps = {
  hidePracticeLink?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function HeaderAccount({
  hidePracticeLink = false,
  onNavigate,
  className,
}: HeaderAccountProps = {}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(!!loadPracticeIdentity());
  }, [pathname]);

  function signOut() {
    clearPracticeIdentity();
    setSignedIn(false);
    onNavigate?.();
    window.location.href = "/practice";
  }

  if (signedIn) {
    return (
      <div className={className}>
        {!hidePracticeLink ? (
          <Link
            href="/practice"
            className="hidden sm:inline hover:text-white transition-colors"
            onClick={onNavigate}
          >
            {t("header.myPractice")}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-white/25 px-4 py-2 font-medium text-dojo-mist hover:border-white/40 hover:text-white transition-colors"
        >
          {t("header.signOut")}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/practice"
      className={
        className
          ? "rounded-full border border-white/20 px-4 py-3 text-center font-medium text-white hover:border-dojo-gold/50 hover:text-dojo-gold transition-colors"
          : "rounded-full border border-white/20 px-4 py-2 font-medium text-white hover:border-dojo-gold/50 hover:text-dojo-gold transition-colors"
      }
      onClick={onNavigate}
    >
      {t("header.signIn")}
    </Link>
  );
}
