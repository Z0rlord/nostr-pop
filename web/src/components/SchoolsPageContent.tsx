"use client";

import Link from "next/link";
import { AffiliatedSchoolCard } from "@/components/AffiliatedSchoolCard";
import { useI18n } from "@/i18n/context";
import type { AffiliatedSchoolPublic } from "@/lib/affiliated-schools";

export function SchoolsPageContent({ schools }: { schools: AffiliatedSchoolPublic[] }) {
  const { t } = useI18n();
  const featured = schools.filter((s) => s.featured);
  const others = schools.filter((s) => !s.featured);

  return (
    <>
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-dojo-gold">
          {t("schools.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
          {t("schools.title")}
        </h1>
        <p className="mt-4 text-dojo-mist/70">{t("schools.description")}</p>
      </div>

      {schools.length === 0 ? (
        <div className="card-glow mt-12 rounded-2xl border border-dojo-gold/20 bg-dojo-gold/5 p-10 text-center">
          <p className="text-dojo-mist/70">{t("schools.empty")}</p>
          <Link
            href="/#for-instructors"
            className="mt-6 inline-block rounded-full bg-dojo-crimson px-6 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            {t("schools.registerCta")}
          </Link>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {featured.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-white">{t("schools.featured")}</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {featured.map((school) => (
                  <AffiliatedSchoolCard key={school.id} school={school} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-white">{t("schools.all")}</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {others.map((school) => (
                  <AffiliatedSchoolCard key={school.id} school={school} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-16 rounded-2xl border border-white/5 bg-dojo-slate/40 p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <h2 className="font-display text-lg text-white">{t("schools.listTitle")}</h2>
          <p className="mt-2 text-sm text-dojo-mist/70">{t("schools.listBody")}</p>
        </div>
        <Link
          href="/#for-instructors"
          className="mt-6 inline-block shrink-0 rounded-full border border-dojo-gold/30 bg-dojo-gold/10 px-6 py-3 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 transition-colors sm:mt-0"
        >
          {t("schools.listCta")}
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-dojo-mist/50">{t("schools.footnote")}</p>
    </>
  );
}
