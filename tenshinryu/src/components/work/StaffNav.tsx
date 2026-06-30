"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type StaffRole = "admin" | "instructor";

type NavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  roles: StaffRole[];
};

const ITEMS: NavItem[] = [
  {
    href: "/student",
    label: "Training",
    match: (path) => path.startsWith("/student"),
    roles: ["admin", "instructor"],
  },
  {
    href: "/instructor",
    label: "Instructor",
    match: (path) => path.startsWith("/instructor"),
    roles: ["admin", "instructor"],
  },
  {
    href: "/admin",
    label: "Owner",
    match: (path) => path.startsWith("/admin"),
    roles: ["admin"],
  },
  {
    href: "/member",
    label: "Account",
    match: (path) => path.startsWith("/member"),
    roles: ["admin", "instructor"],
  },
];

export function StaffNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="staff-nav" aria-label="App sections">
      <div className="staff-nav-inner">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`staff-nav-item ${active ? "staff-nav-item-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
