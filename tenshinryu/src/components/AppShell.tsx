"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/SiteFooter";
import { signOutUser } from "@/lib/firebase";

type NavItem = { href: string; label: string };

type Props = {
  children: React.ReactNode;
  role?: string;
  title?: string;
  subtitle?: string;
  /** Skip the large page hero — use when the page has its own header (e.g. training dashboard). */
  compact?: boolean;
};

const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Training" },
  { href: "/member", label: "Account" },
  { href: "/home", label: "Home" },
];

const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/student", label: "Training" },
  { href: "/instructor", label: "Instructor" },
  { href: "/home", label: "Home" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/student", label: "Training" },
  { href: "/instructor", label: "Instructor" },
  { href: "/admin", label: "Owner" },
  { href: "/home", label: "Home" },
];

function navForRole(role?: string): NavItem[] {
  if (role === "admin") return ADMIN_NAV;
  if (role === "instructor") return INSTRUCTOR_NAV;
  return STUDENT_NAV;
}

export function AppShell({
  children,
  role,
  title,
  subtitle,
  compact = false,
}: Props) {
  const pathname = usePathname();
  const nav = navForRole(role);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* continue */
    }
    window.location.href = "/login";
  };

  const showHero = !compact && (title || subtitle);

  return (
    <div className="kiwami-page min-h-screen flex flex-col">
      <div className="kiwami-container flex flex-col flex-1 max-w-kiwami w-full">
      <header className="sticky top-0 z-50 border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/home" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Tenshinryu"
              width={36}
              height={36}
              className="rounded-md"
            />
            <div className="hidden xs:block sm:block">
              <span className="font-heading font-bold text-base tracking-tight leading-none block">
                Tenshinryu
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-crimson font-semibold">
                Kiwami
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}?`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                    active
                      ? "text-crimson"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-crimson rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-crimson transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav
          className="md:hidden border-t border-border px-3 py-2 flex gap-1.5 overflow-x-auto"
          aria-label="Main mobile"
        >
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-full ${
                  active
                    ? "bg-crimson text-white"
                    : "bg-white text-muted-foreground border border-border"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {showHero && (
        <div className="border-b border-border bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12">
            {title && (
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-2 text-base text-muted-foreground max-w-xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 bg-white">{children}</main>
      <SiteFooter />
      </div>
    </div>
  );
}
