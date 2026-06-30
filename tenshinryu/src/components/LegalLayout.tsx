import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

type Props = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 section-pad">
        <article className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-[var(--muted-foreground)] hover:text-crimson">
            ← Back to home
          </Link>

          <div className="mt-8 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
            <Image
              src="/logo-icon.png"
              alt="Tenshinryu KIWAMI"
              width={96}
              height={96}
              className="rounded-lg"
              priority
            />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                TENSHINRYU ONLINE KIWAMI -極-
              </p>
              <h1 className="font-heading text-3xl font-bold mt-1 sm:text-4xl">{title}</h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="legal-prose mt-10">{children}</div>

          <nav className="mt-12 flex flex-wrap gap-4 border-t border-[var(--border)] pt-8 text-sm">
            <Link href="/terms" className="text-crimson hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-crimson hover:underline">
              Privacy Policy
            </Link>
            <a
              href="mailto:tenshinryu-international@tenshinryu.net"
              className="text-crimson hover:underline"
            >
              Contact
            </a>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
