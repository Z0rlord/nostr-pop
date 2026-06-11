import { RELAY_URL, YAKIHONNE_FEED } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dojo-slate/50">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-dojo-mist/60">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-lg text-white">DojoPop</p>
            <p className="mt-2 max-w-sm">
              Proof-of-practice on Nostr. Kind 34567 events, Blossom video
              uploads, verifiable sword training logs.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a href={RELAY_URL} className="hover:text-dojo-gold transition-colors">
              {RELAY_URL}
            </a>
            <a
              href={YAKIHONNE_FEED}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dojo-gold transition-colors"
            >
              YakiHonne practice feed
            </a>
            <a
              href="https://github.com/Z0rlord/nostr-pop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dojo-gold transition-colors"
            >
              GitHub — nostr-pop
            </a>
          </div>
        </div>
        <p className="mt-8 text-xs">© {new Date().getFullYear()} DojoPop</p>
      </div>
    </footer>
  );
}
