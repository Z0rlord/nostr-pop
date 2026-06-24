"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  TrendingUp,
  User,
} from "lucide-react";

const ITEMS = [
  {
    id: "today",
    label: "Today",
    href: "/student",
    icon: CalendarDays,
    match: (path: string, section: string | null) =>
      path.startsWith("/student") && (!section || section === "today"),
  },
  {
    id: "practice",
    label: "Practice",
    href: "/student?section=practice",
    icon: Dumbbell,
    match: (path: string, section: string | null) =>
      path.startsWith("/student") && section === "practice",
  },
  {
    id: "progress",
    label: "Progress",
    href: "/student?section=progress",
    icon: TrendingUp,
    match: (path: string, section: string | null) =>
      path.startsWith("/student") && section === "progress",
  },
  {
    id: "account",
    label: "Account",
    href: "/member",
    icon: User,
    match: (path: string) => path.startsWith("/member"),
  },
] as const;

export function WorkNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  return (
    <nav
      className="work-nav"
      aria-label="Main navigation"
    >
      <div className="work-nav-inner">
        {ITEMS.map((item) => {
          const active = item.match(pathname, section);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`work-nav-item ${active ? "work-nav-item-active" : ""}`}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
