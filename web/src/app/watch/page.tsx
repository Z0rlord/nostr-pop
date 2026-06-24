import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PracticeDashboard } from "@/components/PracticeDashboard";

export const metadata = {
  title: "Watch — DojoPop",
  description: "Daily martial arts practice videos, dojo activity chart, and leaderboard.",
};

export default function WatchPage() {
  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl text-white sm:text-4xl">
                Practice hub
              </h1>
              <p className="mt-2 max-w-xl text-dojo-mist/70">
                One-minute practice sessions from martial artists worldwide,
                dojo-wide activity, and a leaderboard by Nostr identity.
              </p>
            </div>
            <Link
              href="/join"
              className="shrink-0 rounded-full border border-white/15 px-5 py-2 text-sm text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
            >
              Publish your own — $9.99/mo
            </Link>
          </div>
          <PracticeDashboard />
        </div>
      </main>
      <Footer />
    </>
  );
}
