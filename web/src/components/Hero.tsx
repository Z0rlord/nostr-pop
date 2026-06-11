import Link from "next/link";
import { RELAY_URL } from "@/lib/constants";

export function Hero() {
  return (
    <section className="gradient-hero px-6 pb-24 pt-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-dojo-gold">
          Nostr-native proof of practice
        </p>
        <h1 className="font-display text-4xl font-normal leading-tight text-white sm:text-6xl">
          Your sword practice,
          <br />
          <span className="text-dojo-crimson">on the open web.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-dojo-mist/80">
          DojoPop records verifiable training sessions as Nostr events. Film your
          practice, upload the video through Blossom, and publish a kind{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-dojo-gold">
            34567
          </code>{" "}
          proof-of-practice event to the DojoPop relay.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/join"
            className="rounded-full bg-dojo-crimson px-8 py-3 text-lg font-medium text-white shadow-lg shadow-dojo-crimson/20 hover:bg-red-700 transition-colors"
          >
            Join for $0.99/month
          </Link>
          <a
            href={RELAY_URL}
            className="rounded-full border border-white/15 px-8 py-3 text-lg text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            Connect to relay
          </a>
        </div>
      </div>
    </section>
  );
}
