"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkShell } from "@/components/work/WorkShell";
import { PageLoading } from "@/components/ui/PageLoading";
import { getTierInfo, hasActiveMembership } from "@/lib/tiers";
import { formatBeltRank, normalizeMembershipTier } from "@/lib/utils";
import { CameraIcon } from "@/components/icons";

type Profile = {
  role: string;
  userId: string;
  name: string;
  email: string;
  beltRank?: string;
  stripes?: number;
  membershipTier?: string;
  membershipStatus?: string | null;
  avatar?: string | null;
};

const PILLARS = [
  { title: "Kata", desc: "Forms and foundational movement" },
  { title: "Kihon", desc: "Striking, blocking, and footwork" },
  { title: "Kumite", desc: "Partner drills and sparring" },
  { title: "Buki", desc: "Weapons training" },
  { title: "Taiso", desc: "Conditioning and flexibility" },
  { title: "Reigi", desc: "Etiquette and dojo culture" },
];

const UPGRADE_URL = "https://international.tenshinryu.net/tenshinryu-online";

export default function MemberPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.role) return;
        setProfile(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const openPayPalManage = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/paypal/manage", { method: "POST" });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    } finally {
      setPortalLoading(false);
    }
  };

  const startPayPalSubscribe = async (tier: "GOLD" | "ROYAL") => {
    setSubscribeLoading(tier);
    try {
      const res = await fetch("/api/paypal/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
        return;
      }
      window.open(data.fallbackUrl || UPGRADE_URL, "_blank", "noopener,noreferrer");
    } catch {
      window.open(UPGRADE_URL, "_blank", "noopener,noreferrer");
    } finally {
      setSubscribeLoading(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.userId) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Max 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("studentId", profile.userId);
      formData.append("avatar", file);
      const response = await fetch("/api/student/avatar", { method: "POST", body: formData });
      const data = await response.json();
      if (response.ok && data.success) {
        setProfile((p) => (p ? { ...p, avatar: data.avatar } : p));
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return <PageLoading label="Loading account…" />;
  }

  if (!profile) return null;

  const tierId = normalizeMembershipTier(profile.membershipTier);
  const tier = getTierInfo(tierId);
  const isPaid = tierId !== "FREE";
  const active = hasActiveMembership(profile.membershipStatus ?? null);

  return (
    <WorkShell title="Account">
      <div className="dashboard-page space-y-6">
        <section className="dashboard-card">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative shrink-0 group"
              aria-label="Change profile photo"
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface border-2 border-border flex items-center justify-center text-xl font-heading font-bold text-crimson">
                  {(profile.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <CameraIcon size={20} className="text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-heading text-xl font-bold truncate">{profile.name}</h1>
              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              {profile.beltRank && (
                <p className="text-sm mt-1">
                  {formatBeltRank(profile.beltRank)}
                  {profile.stripes != null
                    ? ` · ${profile.stripes} stripe${profile.stripes === 1 ? "" : "s"}`
                    : ""}
                </p>
              )}
              {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
              {uploadSuccess && <p className="text-sm text-green-700 mt-2">Photo updated</p>}
            </div>
            <span
              className={`shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${
                tierId === "ROYAL"
                  ? "bg-crimson text-white"
                  : tierId === "GOLD"
                    ? "bg-primary-container text-primary-container-foreground"
                    : "bg-surface border border-border"
              }`}
            >
              {tier.name}
            </span>
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-heading text-lg font-bold">Membership</h2>
            {isPaid && active && (
              <button
                type="button"
                onClick={openPayPalManage}
                disabled={portalLoading}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {portalLoading ? "Opening…" : "Manage in PayPal"}
              </button>
            )}
          </div>

          <div className="dashboard-card mb-4">
            <p className="text-muted-foreground text-sm mb-3">{tier.description}</p>
            <ul className="space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-crimson mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {isPaid && (
              <p className="text-xs text-muted-foreground mt-3 capitalize">
                Status: {active ? profile.membershipStatus : "inactive"}
              </p>
            )}
          </div>

          {(tierId === "FREE" || tierId === "YOUTUBE") && (
            <div className="border border-crimson/30 bg-primary-container/30 p-5 rounded-lg">
              <p className="font-semibold mb-1">Upgrade for live classes</p>
              <p className="text-sm text-muted-foreground mb-4">
                GOLD and ROYAL include Zoom lessons, forum access, and instructor feedback.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startPayPalSubscribe("GOLD")}
                  disabled={subscribeLoading !== null}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {subscribeLoading === "GOLD" ? "Redirecting…" : "GOLD — $35/mo"}
                </button>
                <button
                  type="button"
                  onClick={() => startPayPalSubscribe("ROYAL")}
                  disabled={subscribeLoading !== null}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {subscribeLoading === "ROYAL" ? "Redirecting…" : "ROYAL — $85/mo"}
                </button>
                <a
                  href={UPGRADE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm"
                >
                  Pay on tenshinryu.net
                </a>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold mb-3">Curriculum pillars</h2>
          <div className="grid grid-cols-2 gap-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="border border-border p-3 rounded-lg bg-white">
                <h3 className="font-heading font-bold text-crimson text-sm">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
          {(tierId === "FREE" || tierId === "YOUTUBE") && (
            <p className="text-sm text-muted-foreground mt-3">
              Full pillar content unlocks with GOLD or ROYAL.
            </p>
          )}
        </section>

        <section className="pb-4">
          <h2 className="font-heading text-lg font-bold mb-3">Links</h2>
          <div className="space-y-2">
            <a
              href="https://www.youtube.com/@tenshinryu"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 border border-border rounded-lg bg-white text-sm hover:border-crimson transition-colors"
            >
              YouTube channel →
            </a>
            <a
              href="https://international.tenshinryu.net"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 border border-border rounded-lg bg-white text-sm hover:border-crimson transition-colors"
            >
              International HQ →
            </a>
            <Link
              href="/student?section=learn"
              className="block p-3 border border-border rounded-lg bg-white text-sm hover:border-crimson transition-colors"
            >
              Training resources in app →
            </Link>
          </div>
        </section>
      </div>
    </WorkShell>
  );
}
