"use client";

import Link from "next/link";
import {
  formatDisciplines,
  formatLocation,
  localizedDescription,
  localizedHighlights,
  localizedSenseiTitle,
  type AffiliatedSchoolPublic,
} from "@/lib/affiliated-schools";
import { useI18n } from "@/i18n/context";

export function AffiliatedSchoolCard({ school }: { school: AffiliatedSchoolPublic }) {
  const { t, locale } = useI18n();
  const description = localizedDescription(school, locale);
  const highlights = localizedHighlights(school, locale);
  const senseiTitle = localizedSenseiTitle(school, locale);

  const statusLabel =
    school.status === "pilot" ? t("schools.pilot") : t("schools.active");
  const statusClass =
    school.status === "pilot"
      ? "border-dojo-gold/30 bg-dojo-gold/10 text-dojo-gold"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <article className="card-glow flex h-full flex-col rounded-2xl border border-white/5 bg-dojo-slate/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-white">{school.name}</h2>
          <p className="mt-1 text-sm text-dojo-mist/60">{formatLocation(school)}</p>
          {school.website && (
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-dojo-gold hover:underline"
            >
              {school.website.replace(/^https?:\/\//, "")} ↗
            </a>
          )}
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mt-1 text-xs font-medium text-dojo-crimson">
        {formatDisciplines(school.disciplines)}
      </p>

      {school.sensei && (
        <p className="mt-3 text-sm text-dojo-mist/70">
          {t("common.sensei")}{" "}
          <span className="text-white">{school.sensei}</span>
        </p>
      )}

      {senseiTitle && (
        <p className="mt-0.5 text-xs text-dojo-mist/50">{senseiTitle}</p>
      )}

      <p className="mt-3 flex-1 text-sm leading-relaxed text-dojo-mist/70">
        {description}
      </p>

      {highlights && highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-xs text-dojo-mist/60">
          {highlights.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-dojo-gold">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {school.locations && school.locations.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-white/5 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50">
            {t("schools.locations")}
          </p>
          {school.locations.map((loc) => (
            <div key={loc.name} className="text-sm">
              <p className="font-medium text-white">{loc.name}</p>
              <p className="text-xs text-dojo-mist/60">{loc.address}</p>
              {loc.schedule && loc.schedule.length > 0 && (
                <p className="mt-0.5 text-xs text-dojo-mist/50">
                  {loc.schedule.join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
        {school.live ? (
          <>
            <Link
              href={`/school/${school.id}/join`}
              className="rounded-full bg-dojo-crimson px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              {t("schools.joinRoster")}
            </Link>
            <Link
              href={`/school/${school.id}`}
              className="text-sm text-dojo-gold hover:underline"
            >
              {t("schools.memberLog")}
            </Link>
            {school.rosterSize > 0 && (
              <span className="text-xs text-dojo-mist/50">
                {t("schools.rosterCount", { count: school.rosterSize })}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-dojo-mist/50">{t("schools.openingSoon")}</span>
        )}
        {school.contactPhone && (
          <a
            href={`tel:${school.contactPhone.replace(/\s/g, "")}`}
            className="text-sm text-dojo-mist/60 hover:text-dojo-gold transition-colors"
          >
            {school.contactPhone}
          </a>
        )}
      </div>
    </article>
  );
}
