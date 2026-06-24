"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PersonalPracticeDashboard } from "@/components/PersonalPracticeDashboard";
import { PracticeVideoPublish } from "@/components/PracticeVideoPublish";
import { PracticeSignIn } from "@/components/PracticeSignIn";
import { MembershipStatusBanner } from "@/components/MembershipStatusBanner";
import { useI18n } from "@/i18n/context";
import {
  clearPracticeIdentity,
  loadPracticeIdentity,
  savePracticeIdentity,
  type PracticeIdentity,
} from "@/lib/practice-identity";

export default function PracticePage() {
  const { t } = useI18n();
  const [identity, setIdentity] = useState<PracticeIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Never block the sign-in UI on a background bunker reconnect — that call can
    // hang if Primal is closed. Publishing opens a fresh signer when needed.
    setIdentity(loadPracticeIdentity());
    setHydrated(true);
  }, []);

  function upgradeIdentity(next: PracticeIdentity) {
    savePracticeIdentity(next);
    setIdentity(next);
  }

  function signOut() {
    clearPracticeIdentity();
    setIdentity(null);
  }

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {!hydrated ? (
            <p className="py-16 text-center text-dojo-mist/60">{t("common.loading")}</p>
          ) : !identity ? (
            <PracticeSignIn onSignedIn={setIdentity} variant="page" />
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-dojo-gold/80">
                    {t("signIn.signedInAs")}
                  </p>
                  <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">
                    {t("practice.title")}
                  </h1>
                  <p className="mt-2 max-w-xl text-dojo-mist/70">{t("practice.description")}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="shrink-0 rounded-full border border-white/25 px-5 py-2 text-sm font-medium text-dojo-mist hover:border-white/40 hover:text-white transition-colors"
                >
                  {t("practice.signOut")}
                </button>
              </div>

              <MembershipStatusBanner npub={identity.npub} />

              <div className="mt-8">
                <PracticeVideoPublish
                  identity={identity}
                  onSignOut={signOut}
                  onIdentityChange={upgradeIdentity}
                />
              </div>

              <div className="mt-10">
                <PersonalPracticeDashboard
                  pubkeyHex={identity.pubkeyHex}
                  npub={identity.npub}
                  identity={identity}
                  readOnly={false}
                />
              </div>

              <p className="mt-10 text-center text-xs text-dojo-mist/45">
                {t("signIn.publicProfile")}{" "}
                <Link
                  href={`/u/${identity.npub}`}
                  className="text-dojo-gold hover:underline"
                >
                  {t("signIn.publicProfileLink")}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
