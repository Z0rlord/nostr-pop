"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

function InstructorInviteContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [invite, setInvite] = useState<{
    email?: string;
    name?: string;
    dojoName?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError(t("instructor.invite.accept.invalid"));
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/instructor/invite/validate?token=${token}`);
      const data = await res.json();

      if (data.success) {
        if (data.invite.inviteRole === "owner") {
          window.location.replace(`/invite/owner?token=${token}`);
          return;
        }
        setInvite(data.invite);
        setName(data.invite.name || "");
      } else {
        setError(data.error || t("instructor.invite.accept.invalid"));
      }
    } catch {
      setError(t("instructor.invite.accept.invalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("instructor.invite.accept.passwordMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("instructor.invite.accept.passwordHint"));
      return;
    }

    setValidating(true);

    try {
      const res = await fetch("/api/instructor/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || t("instructor.invite.accept.createFailed"));
      }
    } catch {
      setError(t("instructor.invite.accept.createFailed"));
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin mb-4">⏳</div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-4">{t("instructor.invite.accept.invalid")}</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/login" className="text-accent hover:underline">
            {t("navigation.login")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">{t("instructor.invite.accept.success")}</h1>
          <p className="text-gray-400 mb-6">{t("instructor.invite.accept.successDesc")}</p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full px-6 py-3 bg-accent text-white rounded font-medium hover:bg-accent/90"
            >
              {t("navigation.login")}
            </Link>
            <Link
              href="/instructor"
              className="block w-full px-6 py-3 bg-surface border border-neutral-700 text-white rounded font-medium hover:bg-neutral-800"
            >
              Go to Instructor Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-white p-2 rounded-lg mb-4">
            <img src="/logo-icon.png" alt="Tenshinryu" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("instructor.invite.accept.title")}</h1>
          <p className="text-gray-400">
            {t("instructor.invite.accept.welcome")}{" "}
            <span className="text-accent font-medium">{invite?.dojoName}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t("instructor.invite.email")}</label>
            <input
              type="email"
              value={invite?.email || ""}
              disabled
              className="w-full px-4 py-3 bg-surface border border-neutral-700 rounded text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("instructor.invite.accept.name")} *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("instructor.invite.namePlaceholder")}
              className="w-full px-4 py-3 bg-surface border border-neutral-700 rounded text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("instructor.invite.accept.password")} *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("instructor.invite.accept.passwordHint")}
              className="w-full px-4 py-3 bg-surface border border-neutral-700 rounded text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("instructor.invite.accept.passwordConfirm")} *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-neutral-700 rounded text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {showPassword ? t("instructor.invite.accept.hidePassword") : t("instructor.invite.accept.showPassword")}
          </button>

          <button
            type="submit"
            disabled={validating}
            className="w-full py-3 bg-accent text-white font-medium rounded hover:bg-accent/90 disabled:opacity-50"
          >
            {validating ? t("instructor.invite.accept.creating") : t("instructor.invite.accept.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InstructorInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="animate-pulse">Loading…</div>
        </div>
      }
    >
      <InstructorInviteContent />
    </Suspense>
  );
}
