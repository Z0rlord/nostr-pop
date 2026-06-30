"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  homeHref?: string;
  badge?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
};

export function AppHeader({
  homeHref = "/student",
  badge = "KIWAMI -極-",
  trailing,
  children,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <Link href={homeHref} className="app-brand">
          <Image
            src="/logo-icon.png"
            alt="Tenshinryu"
            width={36}
            height={36}
            className="shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <span className="app-brand-eyebrow">JAPANESE TRADITION</span>
            <span className="app-brand-title">TENSHINRYU</span>
            <span className="app-brand-badge">{badge}</span>
          </div>
        </Link>
        {trailing && <div className="app-header-actions">{trailing}</div>}
      </div>
      {children}
    </header>
  );
}
