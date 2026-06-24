"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { patchPassportOverrides } from "@/lib/passport-api";
import type { PracticeIdentity } from "@/lib/practice-identity";

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  disciplines: string[];
};

type Affiliation = {
  schoolId: string;
  schoolName: string;
  role: "owner" | "instructor" | "student";
};

type Overrides = {
  affiliatedSchoolId?: string;
  displaySchool?: string;
  rank?: string;
  discipline?: string;
  location?: string;
};

type Props = {
  open: boolean;
  identity: PracticeIdentity;
  affiliations: Affiliation[];
  overrides: Overrides | null;
  onClose: () => void;
  onSaved: () => void;
};

const CUSTOM_SCHOOL = "__custom__";

export function PassportEditModal({
  open,
  identity,
  affiliations,
  overrides,
  onClose,
  onSaved,
}: Props) {
  const { t } = useI18n();
  const onRoster = affiliations.length > 0;
  const primary = affiliations[0];

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolChoice, setSchoolChoice] = useState(CUSTOM_SCHOOL);
  const [displaySchool, setDisplaySchool] = useState("");
  const [rank, setRank] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/schools")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.schools) {
          setSchools(data.schools as SchoolOption[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (overrides?.affiliatedSchoolId) {
      setSchoolChoice(overrides.affiliatedSchoolId);
      setDisplaySchool("");
    } else if (overrides?.displaySchool) {
      setSchoolChoice(CUSTOM_SCHOOL);
      setDisplaySchool(overrides.displaySchool);
    } else {
      setSchoolChoice(CUSTOM_SCHOOL);
      setDisplaySchool("");
    }
    setRank(overrides?.rank ?? "");
    setDiscipline(overrides?.discipline ?? "");
    setLocation(overrides?.location ?? "");
  }, [open, overrides]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        affiliatedSchoolId:
          onRoster || schoolChoice === CUSTOM_SCHOOL ? null : schoolChoice,
        displaySchool:
          onRoster || schoolChoice !== CUSTOM_SCHOOL
            ? null
            : displaySchool.trim() || null,
        rank: rank.trim() || null,
        discipline: discipline.trim() || null,
        location: location.trim() || null,
      };

      const res = await patchPassportOverrides(identity, payload);
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || t("passport.editSaveFailed"));
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("passport.editSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-dojo-ink/80 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="passport-edit-title"
        className="card-glow relative w-full max-w-lg rounded-2xl border border-dojo-gold/30 bg-dojo-ink p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="passport-edit-title" className="font-display text-2xl text-white">
          {t("passport.editTitle")}
        </h2>
        <p className="mt-2 text-sm text-dojo-mist/70">{t("passport.editSubtitle")}</p>

        {error && (
          <p className="mt-4 rounded-lg bg-dojo-crimson/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {onRoster && primary ? (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50">
                {t("passport.school")}
              </label>
              <p className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {primary.schoolName}
              </p>
              <p className="mt-1 text-xs text-dojo-mist/55">{t("passport.schoolRosterLocked")}</p>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="passport-school"
                  className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50"
                >
                  {t("passport.school")}
                </label>
                <select
                  id="passport-school"
                  value={schoolChoice}
                  onChange={(e) => setSchoolChoice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-dojo-slate px-3 py-2 text-sm text-white"
                >
                  <option value={CUSTOM_SCHOOL}>{t("passport.schoolCustom")}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} — {school.city}, {school.country}
                    </option>
                  ))}
                </select>
              </div>
              {schoolChoice === CUSTOM_SCHOOL && (
                <div>
                  <label
                    htmlFor="passport-school-name"
                    className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50"
                  >
                    {t("passport.schoolName")}
                  </label>
                  <input
                    id="passport-school-name"
                    type="text"
                    value={displaySchool}
                    onChange={(e) => setDisplaySchool(e.target.value)}
                    placeholder={t("passport.schoolNamePlaceholder")}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-dojo-slate px-3 py-2 text-sm text-white placeholder:text-dojo-mist/40"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label
              htmlFor="passport-rank"
              className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50"
            >
              {onRoster ? t("passport.beltSelfReported") : t("passport.rankSelfReported")}
            </label>
            <input
              id="passport-rank"
              type="text"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder={t("passport.rankPlaceholder")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-dojo-slate px-3 py-2 text-sm text-white placeholder:text-dojo-mist/40"
            />
            <p className="mt-1 text-xs text-dojo-mist/55">{t("passport.selfReportedNote")}</p>
          </div>

          <div>
            <label
              htmlFor="passport-discipline"
              className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50"
            >
              {t("passport.discipline")}
            </label>
            <input
              id="passport-discipline"
              type="text"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder={t("passport.disciplinePlaceholder")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-dojo-slate px-3 py-2 text-sm text-white placeholder:text-dojo-mist/40"
            />
          </div>

          <div>
            <label
              htmlFor="passport-location"
              className="text-xs font-medium uppercase tracking-wide text-dojo-mist/50"
            >
              {t("passport.location")} {t("common.optional")}
            </label>
            <input
              id="passport-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("passport.locationPlaceholder")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-dojo-slate px-3 py-2 text-sm text-white placeholder:text-dojo-mist/40"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-dojo-mist hover:border-white/35 hover:text-white transition-colors disabled:opacity-50"
          >
            {t("passport.editCancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-full bg-dojo-crimson px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? t("passport.editSaving") : t("passport.editSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
