import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-white/5 bg-dojo-ink/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-tight text-white">
          Dojo<span className="text-dojo-crimson">Pop</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-dojo-mist/80">
          <a
            href="#how-it-works"
            className="hidden sm:inline hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="wss://relay.dojopop.live"
            className="hidden sm:inline hover:text-white transition-colors"
          >
            Relay
          </a>
          <Link
            href="/join"
            className="rounded-full bg-dojo-crimson px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors"
          >
            Join $0.99/mo
          </Link>
        </nav>
      </div>
    </header>
  );
}
