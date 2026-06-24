"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/context";

type FormState = {
  schoolName: string;
  discipline: string;
  city: string;
  instructorName: string;
  email: string;
  npub: string;
  message: string;
  website: string;
};

const empty: FormState = {
  schoolName: "",
  discipline: "",
  city: "",
  instructorName: "",
  email: "",
  npub: "",
  message: "",
  website: "",
};

export function SchoolOnboardingForm() {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/instructors/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          npub: form.npub.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("onboardForm.sendFailed"));
      }
      setSent(true);
      setForm(empty);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("onboardForm.genericError")
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-dojo-gold/30 bg-dojo-gold/10 p-6">
        <p className="font-medium text-white">{t("instructors.sentTitle")}</p>
        <p className="mt-2 text-sm text-dojo-mist/70">{t("instructors.sentBody")}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-dojo-gold hover:underline"
        >
          {t("instructors.sendAnother")}
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-white/10 bg-dojo-ink/60 px-3 py-2 text-sm text-white placeholder:text-dojo-mist/40 focus:border-dojo-gold/50 focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="schoolName" className="block text-xs font-medium text-dojo-mist">
            {t("onboardForm.schoolName")}
          </label>
          <input
            id="schoolName"
            required
            value={form.schoolName}
            onChange={(e) => update("schoolName", e.target.value)}
            className={inputClass}
            placeholder={t("onboardForm.schoolNamePh")}
          />
        </div>
        <div>
          <label htmlFor="discipline" className="block text-xs font-medium text-dojo-mist">
            {t("onboardForm.discipline")}
          </label>
          <input
            id="discipline"
            required
            value={form.discipline}
            onChange={(e) => update("discipline", e.target.value)}
            className={inputClass}
            placeholder={t("onboardForm.disciplinePh")}
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-xs font-medium text-dojo-mist">
            {t("onboardForm.city")}
          </label>
          <input
            id="city"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
            placeholder={t("onboardForm.cityPh")}
          />
        </div>
        <div>
          <label htmlFor="instructorName" className="block text-xs font-medium text-dojo-mist">
            {t("onboardForm.yourName")}
          </label>
          <input
            id="instructorName"
            required
            value={form.instructorName}
            onChange={(e) => update("instructorName", e.target.value)}
            className={inputClass}
            placeholder={t("onboardForm.yourNamePh")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="onboard-email" className="block text-xs font-medium text-dojo-mist">
          {t("onboardForm.email")}
        </label>
        <input
          id="onboard-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClass}
          placeholder={t("onboardForm.emailPh")}
        />
      </div>

      <div>
        <label htmlFor="onboard-npub" className="block text-xs font-medium text-dojo-mist">
          {t("onboardForm.npub")}{" "}
          <span className="text-dojo-mist/40">{t("onboardForm.npubHint")}</span>
        </label>
        <input
          id="onboard-npub"
          value={form.npub}
          onChange={(e) => update("npub", e.target.value)}
          className={inputClass}
          placeholder="npub1…"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-xs font-medium text-dojo-mist">
          {t("onboardForm.message")}{" "}
          <span className="text-dojo-mist/40">{t("common.optional")}</span>
        </label>
        <textarea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className={inputClass}
          placeholder={t("onboardForm.messagePh")}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-dojo-mist/50">
        {t("instructors.privacyAgree")}{" "}
        <Link href="/privacy" className="text-dojo-gold hover:underline">
          {t("footer.privacy")}
        </Link>
        . {t("instructors.privacyOnly")}
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-dojo-crimson px-6 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60 sm:w-auto"
      >
        {loading ? t("instructors.submitting") : t("instructors.submit")}
      </button>
    </form>
  );
}
