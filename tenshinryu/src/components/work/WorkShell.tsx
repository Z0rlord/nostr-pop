"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { StaffToolbar } from "@/components/app/StaffToolbar";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { signOutUser } from "@/lib/firebase";
import { WorkNav } from "./WorkNav";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export function WorkShell({ children, title }: Props) {
  const pathname = usePathname();
  const [staffRole, setStaffRole] = useState<"admin" | "instructor" | null>(null);
  const showBottomNav =
    pathname.startsWith("/student") || pathname.startsWith("/member");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === "admin" || data?.role === "instructor") {
          setStaffRole(data.role);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* continue */
    }
    window.location.href = "/login";
  };

  return (
    <div className="kiwami-page min-h-screen flex flex-col">
      <div className="kiwami-container flex flex-col flex-1 max-w-kiwami w-full">
        <AppHeader
          badge={title || "KIWAMI -極-"}
          trailing={
            <>
              <LocaleSwitcher />
              <button type="button" onClick={handleSignOut} className="app-sign-out">
                Sign out
              </button>
            </>
          }
        >
          {staffRole && <StaffToolbar role={staffRole} />}
        </AppHeader>

        <main className={`flex-1 work-main ${showBottomNav ? "work-main-padded" : ""}`}>
          {children}
        </main>

        {showBottomNav && (
          <Suspense fallback={null}>
            <WorkNav />
          </Suspense>
        )}
      </div>
    </div>
  );
}
