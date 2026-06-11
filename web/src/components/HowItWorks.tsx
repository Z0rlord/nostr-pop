import { RELAY_URL, YAKIHONNE_FEED } from "@/lib/constants";

const steps = [
  {
    num: "01",
    title: "Practice",
    body: "Record your sword training session — kata, drills, or free practice. Keep it honest; proof-of-practice is about showing up.",
  },
  {
    num: "02",
    title: "Upload via Blossom",
    body: "Host the video on a Blossom-compatible server. NIP-94 file metadata tags the upload and ties it to your Nostr identity.",
  },
  {
    num: "03",
    title: "Publish kind 34567",
    body: "Sign and broadcast a proof-of-practice event. Your session becomes a permanent, verifiable log on the DojoPop relay.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl text-white sm:text-4xl">
          How DojoPop works
        </h2>
        <p className="mt-4 max-w-2xl text-dojo-mist/70">
          Three steps from mat to Nostr. No central database — your practice
          events live on open relays, starting with{" "}
          <a href={RELAY_URL} className="text-dojo-gold hover:underline">
            relay.dojopop.live
          </a>
          .
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.num}
              className="card-glow rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
            >
              <span className="text-sm font-medium text-dojo-crimson">
                {step.num}
              </span>
              <h3 className="mt-3 font-display text-xl text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-dojo-mist/70">
                {step.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-dojo-gold/20 bg-dojo-gold/5 p-6">
          <p className="text-sm text-dojo-mist/80">
            Browse published practice on{" "}
            <a
              href={YAKIHONNE_FEED}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-dojo-gold hover:underline"
            >
              YakiHonne
            </a>{" "}
            or query kind 34567 directly from the relay.
          </p>
        </div>
      </div>
    </section>
  );
}
