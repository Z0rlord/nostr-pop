"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/components/I18nProvider";
import { signInWithGoogle, signInWithApple } from "@/lib/firebase";

async function establishSession(user: {
  getIdToken: () => Promise<string>;
  email: string | null;
  displayName: string | null;
}) {
  if (!user.email) {
    throw new Error("Google account must have an email address.");
  }

  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      email: user.email,
      name: user.displayName,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.code === "DATABASE_UNAVAILABLE") {
      throw new Error("Server is reconnecting to the database — please try again.");
    }
    throw new Error(data.error || "Authentication failed");
  }
  const dest =
    data.role === "admin"
      ? "/admin"
      : data.role === "instructor"
        ? "/instructor"
        : data.role === "student"
          ? "/student"
          : "/home";
  window.location.replace(dest);
}

export default function LoginPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    setError("");
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithApple();
      await establishSession(user);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase.");
      } else if (e.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (e.code === "auth/popup-blocked") {
        setError("Popup blocked — allow popups for tenshinryu.xyz and try again.");
      } else {
        setError(e.message || "Sign-in failed");
      }
      setLoading(false);
    }
  };

  return (
    <div className="kiwami-page">
      <div className="kiwami-container flex flex-col min-h-screen">
        <SiteHeader />

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">Sign In</span>
        </nav>

        <main className="flex-1 section-pad kiwami-container-narrow">
          <div className="flex justify-end mb-4">
            <LocaleSwitcher />
          </div>

          <div className="text-center mb-8">
            <Image
              src="/logo-tenshinryu.jpg"
              alt="Tenshinryu KIWAMI"
              width={120}
              height={120}
              className="mx-auto mb-6 rounded-full w-28 h-28 object-cover border border-border shadow-card"
              priority
            />
            <h1 className="font-heading text-2xl md:text-3xl mb-2">
              {t("auth.login.title")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Sign in to access your member area, training dashboard, and curriculum.
            </p>
          </div>

          {error && <div className="alert-error mb-6">{error}</div>}

          <div className="card space-y-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => handleSignIn("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded bg-white hover:border-primary transition disabled:opacity-50 font-medium"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? t("common.loading") : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={() => handleSignIn("apple")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded bg-white hover:border-primary transition disabled:opacity-50 font-medium"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.29-.74 3.24-.74 2.34.1 4.25 2.04 4.25 4.73 0 .2-.02.39-.04.58-2.02.91-3.53 3.23-3.53 5.66zM12.03 7.25c-.15-2.55 2.11-4.73 4.51-4.73.18 2.35-2.18 4.84-4.51 4.73z" />
              </svg>
              {loading ? t("common.loading") : "Continue with Apple"}
            </button>
          </div>

          <p className="text-center text-muted-foreground text-xs leading-relaxed mt-6 max-w-md mx-auto">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-center text-sm text-muted-foreground mt-4">
            New member?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              View membership plans
            </Link>
          </p>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
