"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NostrGuideContent } from "@/components/NostrGuideContent";
import { useI18n } from "@/i18n/context";

export default function NostrGuidePage() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
          >
            {t("common.backHome")}
          </Link>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-dojo-gold">
            {t("nostr.pageEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
            {t("nostr.pageTitle")}
          </h1>
          <p className="mt-4 text-dojo-mist/70">{t("nostr.pageSubtitle")}</p>
          <div className="mt-10">
            <NostrGuideContent variant="full" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
