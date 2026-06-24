"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/i18n/context";

type Props = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalLayout({ title, lastUpdated, children }: Props) {
  const { t, locale } = useI18n();

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
          >
            {t("common.backHome")}
          </Link>
          <h1 className="mt-6 font-display text-3xl text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-dojo-mist/50">
            Last updated: {lastUpdated}
          </p>
          {locale !== "en" && (
            <p className="mt-4 rounded-lg border border-dojo-gold/20 bg-dojo-gold/5 px-4 py-3 text-sm text-dojo-mist/70">
              {t("legal.englishOnly")}
            </p>
          )}
          <div className="legal-prose mt-10 space-y-6 text-sm leading-relaxed text-dojo-mist/80">
            {children}
          </div>
          <nav className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm">
            <Link href="/terms" className="text-dojo-gold hover:underline">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="text-dojo-gold hover:underline">
              {t("footer.privacy")}
            </Link>
            <a
              href="mailto:admin@dojopop.live"
              className="text-dojo-gold hover:underline"
            >
              {t("footer.contact")}
            </a>
          </nav>
        </article>
      </main>
      <Footer />
    </>
  );
}
