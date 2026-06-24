"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { role: "admin" | "instructor" };

export function StaffToolbar({ role }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/instructor") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="staff-toolbar">
      <span className="staff-toolbar-label">Staff tools</span>
      <Link
        href="/instructor"
        className={`staff-toolbar-link ${pathname.startsWith("/instructor") ? "staff-toolbar-link-active" : ""}`}
      >
        Instructor
      </Link>
      {role === "admin" && (
        <Link
          href="/admin"
          className={`staff-toolbar-link ${pathname.startsWith("/admin") ? "staff-toolbar-link-active" : ""}`}
        >
          Owner
        </Link>
      )}
    </div>
  );
}
