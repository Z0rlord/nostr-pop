"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-dojo-slate/50">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-dojo-mist/60">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-lg text-white">DojoPop</p>
            <p className="mt-2 max-w-sm">{t("footer.description")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/watch" className="hover:text-dojo-gold transition-colors">
              {t("footer.practiceFeed")}
            </Link>
            <Link href="/schools" className="hover:text-dojo-gold transition-colors">
              {t("footer.affiliatedSchools")}
            </Link>
            <Link href="/#for-instructors" className="hover:text-dojo-gold transition-colors">
              {t("footer.forInstructors")}
            </Link>
            <Link href="/nostr" className="hover:text-dojo-gold transition-colors">
              {t("footer.nostrGuide")}
            </Link>
            <a
              href="https://github.com/Z0rlord/nostr-pop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dojo-gold transition-colors"
            >
              {t("footer.github")}
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">{t("footer.copyright", { year })}</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <Link href="/terms" className="hover:text-dojo-gold transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-dojo-gold transition-colors">
              {t("footer.privacy")}
            </Link>
            <a
              href="mailto:admin@dojopop.live"
              className="hover:text-dojo-gold transition-colors"
            >
              {t("footer.contact")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
