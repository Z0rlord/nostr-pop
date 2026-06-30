"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { QuickLinkCard } from "@/components/dashboard/QuickLinkCard";
import { useI18n } from "@/components/I18nProvider";

interface User {
  role: "instructor" | "student" | "admin";
  userId: string;
  name?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/");
          return null;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.role) {
          setUser({ role: data.role, userId: data.userId, name: data.name });
          if (data.role === "student") {
            router.replace("/student");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to get user info:", err);
        setError("Failed to load user info: " + err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  if (!user) return null;

  const isInstructor = user.role === "instructor" || user.role === "admin";
  const isAdmin = user.role === "admin";

  return (
    <AppShell
      role={user.role}
      title={user.name ? `${t("home.welcomeBack")}, ${user.name.split(" ")[0]}` : t("home.welcomeBack")}
      subtitle={t("home.quickAccess")}
    >
      <div className="dashboard-page max-w-6xl">
        {isAdmin && (
          <div className="alert-muted mb-8 flex items-center justify-between gap-4">
            <span className="text-sm">Owner tools</span>
            <Link href="/admin" className="text-sm font-semibold text-crimson hover:underline">
              Open dashboard →
            </Link>
          </div>
        )}

        {isInstructor ? (
          <InstructorQuickLinks t={t} />
        ) : (
          <StudentQuickLinks t={t} />
        )}
      </div>
    </AppShell>
  );
}

function InstructorQuickLinks({ t }: { t: (key: string) => string }) {
  const links = [
    {
      href: "/student",
      title: t("home.student.progress") || "Training",
      description: "Check in, practice, and track your progress.",
      icon: <span className="text-lg font-bold">道</span>,
    },
    {
      href: "/wiki",
      title: t("home.wiki.title"),
      description: t("home.wiki.desc"),
      icon: <span className="text-lg font-bold">書</span>,
    },
    {
      href: "/instructor",
      title: t("home.instructor.checkIn"),
      description: t("home.instructor.checkInDesc"),
      icon: <span className="text-lg font-bold">◎</span>,
    },
    {
      href: "/instructor?tab=classes",
      title: t("home.instructor.classes"),
      description: t("home.instructor.classesDesc"),
      icon: <span className="text-lg font-bold">▣</span>,
    },
    {
      href: "/instructor?tab=attendance",
      title: t("home.instructor.attendance"),
      description: t("home.instructor.attendanceDesc"),
      icon: <span className="text-lg font-bold">☰</span>,
    },
    {
      href: "/instructor?tab=notifications",
      title: t("home.instructor.notifications"),
      description: t("home.instructor.notificationsDesc"),
      icon: <span className="text-lg font-bold">✉</span>,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
      {links.map((link) => (
        <QuickLinkCard key={link.href} {...link} />
      ))}
    </div>
  );
}

function StudentQuickLinks({ t }: { t: (key: string) => string }) {
  const links = [
    {
      href: "/student",
      title: t("home.student.progress"),
      description: t("home.student.progressDesc"),
      icon: <span className="text-lg font-bold">道</span>,
    },
    {
      href: "/wiki",
      title: t("home.wiki.title"),
      description: t("home.wiki.desc"),
      icon: <span className="text-lg font-bold">書</span>,
    },
    {
      href: "/student?section=progress&tab=history",
      title: t("home.student.history"),
      description: t("home.student.historyDesc"),
      icon: <span className="text-lg font-bold">史</span>,
    },
    {
      href: "/member",
      title: "Account",
      description: "Membership, profile, and settings.",
      icon: <span className="text-lg font-bold">票</span>,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {links.map((link) => (
        <QuickLinkCard key={link.href} {...link} />
      ))}
    </div>
  );
}
