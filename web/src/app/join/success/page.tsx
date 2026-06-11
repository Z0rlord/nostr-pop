import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; lightning?: string };
}) {
  const viaLightning = searchParams.lightning === "1";

  return (
    <>
      <Header />
      <main className="gradient-hero min-h-[60vh] px-6 py-20 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-dojo-gold/20 text-2xl">
            ✓
          </div>
          <h1 className="font-display text-3xl text-white">Welcome to DojoPop</h1>
          <p className="mt-4 text-dojo-mist/70">
            {viaLightning
              ? "Lightning payment received. Your npub is registered as an active member."
              : "Payment confirmed. Your npub is registered and queued for relay whitelist access."}
          </p>
          {searchParams.session_id && (
            <p className="mt-4 text-xs text-dojo-mist/40">
              Reference: {searchParams.session_id.slice(0, 20)}…
            </p>
          )}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="wss://relay.dojopop.live"
              className="rounded-full bg-dojo-crimson px-6 py-3 text-white hover:bg-red-700 transition-colors"
            >
              Connect to relay
            </a>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-dojo-mist hover:text-white transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
