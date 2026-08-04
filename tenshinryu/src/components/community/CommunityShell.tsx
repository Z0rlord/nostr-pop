"use client";

import { useEffect, useState } from "react";
import { StaffShell } from "@/components/work/StaffShell";
import { WorkShell } from "@/components/work/WorkShell";
import { PageLoading } from "@/components/ui/PageLoading";

type Role = "admin" | "instructor" | "student" | null;

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Picks StaffShell (dojo switcher) for instructors/admins, WorkShell for students.
 */
export function CommunityShell({ title, subtitle, actions, children }: Props) {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === "admin" || data?.role === "instructor") {
          setRole(data.role);
        } else if (data?.role === "student") {
          setRole("student");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  if (role === "admin" || role === "instructor") {
    return (
      <StaffShell role={role} title={title} subtitle={subtitle} actions={actions}>
        {children}
      </StaffShell>
    );
  }

  return (
    <WorkShell title={title}>
      <header className="page-intro mb-4">
        <div className="page-intro-text">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-intro-actions">{actions}</div>}
      </header>
      {children}
    </WorkShell>
  );
}
