"use client";

import { AppHeader } from "@/components/app/AppHeader";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { signOutUser } from "@/lib/firebase";
import { DojoSwitcher } from "./DojoSwitcher";
import { StaffNav } from "./StaffNav";

type StaffRole = "admin" | "instructor";

type Props = {
  children: React.ReactNode;
  role: StaffRole;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function StaffShell({ children, role, title, subtitle, actions }: Props) {
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
          trailing={
            <>
              <DojoSwitcher />
              <LocaleSwitcher />
              <button type="button" onClick={handleSignOut} className="app-sign-out">
                Sign out
              </button>
            </>
          }
        >
          <StaffNav role={role} />
        </AppHeader>

        <div className="staff-main flex-1">
          <header className="page-intro">
            <div className="page-intro-text">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-intro-actions">{actions}</div>}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
