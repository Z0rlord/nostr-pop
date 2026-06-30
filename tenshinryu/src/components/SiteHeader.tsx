import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-kiwami mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-4 min-w-0">
          <Image
            src="/logo-icon.png"
            alt="Tenshinryu"
            width={48}
            height={48}
            className="shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <span className="block text-[10px] sm:text-xs text-muted-foreground tracking-wide">
              JAPANESE TRADITION
            </span>
            <span className="block font-heading text-xl sm:text-2xl text-foreground">
              TENSHINRYU
            </span>
            <span className="block font-heading text-xl sm:text-2xl text-foreground -mt-0.5">
              HYOHO
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5 shrink-0">
          <Link
            href="/wiki"
            className="hidden sm:inline text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Hyoho Wiki
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link href="/signup" className="btn-primary !px-5 !py-2.5 !text-sm">
            Join
          </Link>
        </nav>
      </div>
    </header>
  );
}
