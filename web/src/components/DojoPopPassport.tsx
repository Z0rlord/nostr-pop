"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { PassportEditModal } from "@/components/PassportEditModal";
import { useI18n } from "@/i18n/context";
import type { FieldSource } from "@/lib/passport-display";
import {
  fetchNostrProfile,
  profileDisplayName,
  type NostrProfile,
} from "@/lib/nostr-profile";
import { profileShareUrl } from "@/lib/media-url";
import type { PracticeIdentity } from "@/lib/practice-identity";
import { truncateNpub } from "@/lib/practice-events";

type SchoolAffiliation = {
  schoolId: string;
  schoolName: string;
  location: string;
  disciplines: string[];
  role: "owner" | "instructor" | "student";
};

type PassportOverrides = {
  affiliatedSchoolId?: string;
  displaySchool?: string;
  rank?: string;
  discipline?: string;
  location?: string;
};

type PassportDisplay = {
  schoolName: string | null;
  schoolId: string | null;
  schoolSource: FieldSource;
  location: string | null;
  locationSource: FieldSource;
  rank: string | null;
  rankSupplement: string | null;
  rankSource: FieldSource;
  rankSupplementSource: FieldSource;
  discipline: string | null;
  disciplineSource: FieldSource;
};

type PassportMeta = {
  affiliations: SchoolAffiliation[];
  overrides: PassportOverrides | null;
  display: PassportDisplay | null;
  memberSince: string | null;
  memberStatus: string | null;
  memberActive: boolean;
  paidUntil: string | null;
};

export type DojoPopPassportStats = {
  practiceDays: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  latestDayNumber?: number;
  leaderboardRank: number | null;
  firstPracticeAt?: number;
};

type Props = {
  npub: string;
  pubkeyHex: string;
  stats: DojoPopPassportStats;
  editable?: boolean;
  identity?: PracticeIdentity;
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-dojo-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs">
      {children}
    </span>
  );
}

function PassportField({
  label,
  value,
  mono,
  empty,
  selfReported,
  selfReportedLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  empty?: boolean;
  selfReported?: boolean;
  selfReportedLabel?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={`mt-1 truncate text-sm font-semibold sm:text-base ${
          empty ? "text-dojo-mist/40 italic" : "text-dojo-ink"
        } ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
        title={value}
      >
        {value}
      </p>
      {selfReported && !empty && selfReportedLabel && (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-dojo-crimson/70">
          {selfReportedLabel}
        </p>
      )}
    </div>
  );
}

function roleLabel(
  role: SchoolAffiliation["role"],
  t: (path: string, values?: Record<string, string | number>) => string
): string {
  if (role === "owner") return t("passport.roleOwner");
  if (role === "instructor") return t("passport.roleInstructor");
  return t("passport.roleStudent");
}

function memberStatusLabel(
  meta: PassportMeta | null,
  t: (key: string, values?: Record<string, string | number>) => string
): { text: string; empty: boolean } {
  if (!meta) return { text: "—", empty: true };
  if (meta.memberActive) return { text: t("passport.memberActive"), empty: false };
  if (meta.memberSince) {
    return {
      text: t("passport.memberInactive", { status: meta.memberStatus ?? "—" }),
      empty: false,
    };
  }
  return { text: t("passport.notMember"), empty: true };
}

export function DojoPopPassport({
  npub,
  pubkeyHex,
  stats,
  editable = false,
  identity,
}: Props) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [meta, setMeta] = useState<PassportMeta | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [npubCopied, setNpubCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const displayName = profileDisplayName(profile, truncateNpub(npub, 10, 6));
  const display = meta?.display;
  const primarySchool = meta?.affiliations[0];
  const profileUrl = profileShareUrl(npub);
  const canEdit = editable && !!identity;

  const loadPassport = useCallback(async () => {
    const res = await fetch(`/api/passport?npub=${encodeURIComponent(npub)}`);
    return res.ok ? (res.json() as Promise<PassportMeta>) : null;
  }, [npub]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchNostrProfile(pubkeyHex), loadPassport()])
      .then(([prof, passport]) => {
        if (cancelled) return;
        setProfile(prof);
        setMeta(passport);
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setMeta(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [npub, pubkeyHex, loadPassport, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(profileUrl, {
      margin: 1,
      width: 120,
      color: { dark: "#0f0f12", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profileUrl]);

  async function copyNpub() {
    try {
      await navigator.clipboard.writeText(npub);
      setNpubCopied(true);
      window.setTimeout(() => setNpubCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const member = memberStatusLabel(meta, t);
  const joinDate = meta?.memberSince
    ? new Date(meta.memberSince).toLocaleDateString()
    : stats.firstPracticeAt
      ? new Date(stats.firstPracticeAt * 1000).toLocaleDateString()
      : null;

  const schoolName = display?.schoolName ?? primarySchool?.schoolName;
  const schoolId = display?.schoolId ?? primarySchool?.schoolId;
  const schoolEmpty = !schoolName;

  const locationValue = display?.location ?? primarySchool?.location ?? "—";
  const locationEmpty = !display?.location && !primarySchool?.location;

  let rankValue = "—";
  let rankEmpty = true;
  if (display?.rank) {
    if (display.rankSource === "roster") {
      rankValue = t(`passport.${display.rank}`);
      if (display.rankSupplement) {
        rankValue = `${rankValue} · ${display.rankSupplement}`;
      }
      rankEmpty = false;
    } else {
      rankValue = display.rank;
      rankEmpty = false;
    }
  } else if (primarySchool) {
    rankValue = roleLabel(primarySchool.role, t);
    rankEmpty = false;
  }

  const rankSelfReported =
    display?.rankSource === "self" ||
    display?.rankSupplementSource === "self";

  const disciplineValue =
    display?.discipline ??
    (primarySchool?.disciplines.length
      ? primarySchool.disciplines
          .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
          .join(" · ")
      : "—");
  const disciplineEmpty =
    !display?.discipline && !primarySchool?.disciplines.length;
  const disciplineSelfReported = display?.disciplineSource === "self";

  const locationSelfReported =
    display?.locationSource === "self" && !primarySchool?.location;
  const schoolSelfReported = display?.schoolSource === "self";

  return (
    <section
      className="card-glow relative overflow-hidden rounded-2xl border-2 border-dojo-gold/50 bg-gradient-to-br from-[#f4efe4] via-[#ebe4d4] to-[#ddd4be] shadow-xl"
      aria-label={t("passport.title")}
    >
      {/* Holographic sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(135deg, rgba(196,30,58,0.08) 0%, rgba(212,168,83,0.12) 40%, rgba(255,255,255,0.2) 50%, rgba(196,30,58,0.06) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-3 rounded-xl border border-dojo-gold/25" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-dojo-gold/30 pb-3">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-wide text-dojo-ink sm:text-2xl">
              {t("passport.title")}
            </h2>
            <p className="mt-0.5 text-xs italic text-dojo-crimson/80 sm:text-sm">
              {t("passport.tagline")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-full border border-dojo-crimson/40 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-dojo-crimson hover:bg-white transition-colors"
              >
                {t("passport.editButton")}
              </button>
            )}
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dojo-crimson">
              {t("passport.network")}
            </p>
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-dojo-crimson text-sm font-bold text-white">
              道
            </div>
          </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          {/* Main body */}
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            {/* Avatar */}
            <div className="mx-auto sm:mx-0">
              <div className="relative h-24 w-20 overflow-hidden rounded-lg border-2 border-white bg-dojo-slate shadow-md sm:h-32 sm:w-28">
                {profile?.picture ? (
                  <Image
                    src={profile.picture}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-dojo-ink/10 text-xs text-dojo-ink/40">
                    {loading ? "…" : t("passport.noPhoto")}
                  </div>
                )}
              </div>
            </div>

            {/* Identity fields */}
            <div className="min-w-0 space-y-3">
              <div>
                <FieldLabel>{t("passport.name")}</FieldLabel>
                <p className="mt-1 truncate font-display text-xl font-bold text-dojo-ink sm:text-2xl">
                  {displayName}
                </p>
                {profile?.nip05 && (
                  <p className="mt-0.5 truncate font-mono text-xs text-dojo-crimson/90">
                    {profile.nip05}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel>{t("passport.npub")}</FieldLabel>
                <div className="mt-1 flex items-center gap-2">
                  <p
                    className="min-w-0 truncate font-mono text-xs text-dojo-ink sm:text-sm"
                    title={npub}
                  >
                    {truncateNpub(npub, 14, 10)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyNpub()}
                    className="shrink-0 rounded-md border border-dojo-ink/20 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-dojo-ink hover:bg-white transition-colors"
                  >
                    {npubCopied ? t("passport.copied") : t("passport.copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR column */}
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dojo-gold/20 bg-white/40 p-3 lg:min-w-[140px]">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={t("passport.qrAlt")}
                width={120}
                height={120}
                className="rounded"
              />
            ) : (
              <div className="h-[120px] w-[120px] animate-pulse rounded bg-dojo-ink/10" />
            )}
            <p className="text-center text-[10px] text-dojo-ink/60">
              {t("passport.scanProfile")}
            </p>
          </div>
        </div>

        {/* Detail grid */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-dojo-gold/25 pt-4 sm:grid-cols-3 lg:grid-cols-4">
          <PassportField
            label={t("passport.member")}
            value={member.text}
            empty={member.empty}
          />
          <PassportField
            label={t("passport.practiceDays")}
            value={
              stats.latestDayNumber
                ? String(stats.latestDayNumber)
                : stats.practiceDays > 0
                  ? String(stats.practiceDays)
                  : "—"
            }
            empty={!stats.latestDayNumber && stats.practiceDays === 0}
          />
          <PassportField
            label={t("passport.streak")}
            value={
              stats.currentStreak > 0
                ? t("passport.streakDays", { count: String(stats.currentStreak) })
                : "—"
            }
            empty={stats.currentStreak === 0}
          />
          <PassportField
            label={t("passport.school")}
            value={schoolName ?? t("passport.noSchool")}
            empty={schoolEmpty}
            selfReported={schoolSelfReported}
            selfReportedLabel={t("passport.selfReportedBadge")}
          />
          <PassportField
            label={t("passport.location")}
            value={locationValue}
            empty={locationEmpty}
            selfReported={locationSelfReported}
            selfReportedLabel={t("passport.selfReportedBadge")}
          />
          <PassportField
            label={t("passport.rank")}
            value={rankValue}
            empty={rankEmpty}
            selfReported={rankSelfReported}
            selfReportedLabel={t("passport.selfReportedBadge")}
          />
          <PassportField
            label={t("passport.discipline")}
            value={disciplineValue}
            empty={disciplineEmpty}
            selfReported={disciplineSelfReported}
            selfReportedLabel={t("passport.selfReportedBadge")}
          />
          <PassportField
            label={t("passport.joined")}
            value={joinDate ?? "—"}
            empty={!joinDate}
          />
        </div>

        {meta && meta.affiliations.length > 1 && (
          <p className="mt-3 text-xs text-dojo-ink/55">
            {t("passport.moreSchools", { count: String(meta.affiliations.length - 1) })}
          </p>
        )}

        {schoolId && (
          <p className="mt-2 text-xs text-dojo-ink/55">
            <Link
              href={`/school/${schoolId}`}
              className="text-dojo-crimson hover:underline"
            >
              {t("passport.viewSchool")}
            </Link>
          </p>
        )}
      </div>

      {canEdit && identity && (
        <PassportEditModal
          open={editOpen}
          identity={identity}
          affiliations={meta?.affiliations ?? []}
          overrides={meta?.overrides ?? null}
          onClose={() => setEditOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </section>
  );
}
