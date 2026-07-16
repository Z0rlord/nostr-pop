"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/ui/PageLoading";

type InviteInfo = {
  email?: string;
  name?: string;
  dojoName?: string;
  inviteRole?: string;
};

function OwnerInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<"admin" | "instructor">("admin");

  useEffect(() => {
    if (!token) {
      setError("This invitation link is invalid or incomplete.");
      setLoading(false);
      return;
    }

    fetch(`/api/instructor/invite/validate?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.invite.inviteRole && data.invite.inviteRole !== "owner") {
            window.location.replace(`/invite/instructor?token=${token}`);
            return;
          }
          setInvite(data.invite);
          setName(data.invite.name || "");
        } else {
          setError(data.error || "This invitation is invalid or has expired.");
        }
      })
      .catch(() => setError("Could not verify this invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/instructor/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (data.success) {
        setRole(data.role === "admin" ? "admin" : "instructor");
        setSuccess(true);
      } else {
        setError(data.error || "Could not create your account.");
      }
    } catch {
      setError("Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading label="Verifying your invitation…" />;
  }

  if (success) {
    return (
      <div className="kiwami-page min-h-screen flex flex-col">
        <div className="kiwami-container flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <Image src="/logo-icon.png" alt="" width={64} height={64} className="mb-6" />
          <h1 className="font-heading text-2xl md:text-3xl mb-3">Welcome to Tenshinryu KIWAMI</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            Your owner account is ready. You can open your dashboard now, or sign in anytime
            with Google using the same email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Link href={role === "admin" ? "/admin" : "/instructor"} className="btn-primary">
              Open dashboard
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in later
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="kiwami-page min-h-screen flex flex-col">
        <div className="kiwami-container flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="font-heading text-2xl mb-3">Invitation unavailable</h1>
          <p className="text-muted-foreground max-w-md mb-6">{error}</p>
          <Link href="/login" className="btn-secondary">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="kiwami-page min-h-screen flex flex-col">
      <div className="kiwami-container flex-1 px-4 sm:px-6 py-10 md:py-14">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Image src="/logo-icon.png" alt="Tenshinryu" width={56} height={56} className="mx-auto mb-4" />
            <p className="text-xs uppercase tracking-[0.14em] text-primary mb-2">Owner onboarding</p>
            <h1 className="font-heading text-2xl md:text-3xl mb-2">Set up your school</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;re joining <strong className="text-foreground">{invite?.dojoName}</strong> as
              the school leader.
            </p>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="text-label block mb-1.5">Email</label>
              <input
                type="email"
                value={invite?.email || ""}
                disabled
                className="ui-input bg-surface text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-label block mb-1.5">Your name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="ui-input"
              />
            </div>

            <div>
              <label className="text-label block mb-1.5">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="ui-input"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-label block mb-1.5">Confirm password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="ui-input"
                autoComplete="new-password"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>

            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "Creating account…" : "Create owner account"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
            After setup you can also use <strong>Continue with Google</strong> on the login page
            with this same email address.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OwnerInvitePage() {
  return (
    <Suspense fallback={<PageLoading label="Loading…" />}>
      <OwnerInviteContent />
    </Suspense>
  );
}
