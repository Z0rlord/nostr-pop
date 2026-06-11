const benefits = [
  {
    title: "Relay write access",
    body: "Your npub is queued for the DojoPop relay pubkey whitelist so you can publish proof-of-practice events.",
  },
  {
    title: "Members tag",
    body: "Future kind 34567 events can carry a #dojopop-member tag for filtered feeds and leaderboards.",
  },
  {
    title: "Early protocol access",
    body: "First access to CLI tools, verification flows, and dojo-specific Nostr clients as they ship.",
  },
];

export function MembershipBenefits() {
  return (
    <section className="border-t border-white/5 bg-dojo-slate/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl text-white">What members get</h2>
        <p className="mt-4 max-w-2xl text-dojo-mist/70">
          v1 membership is intentionally minimal: pay, register your npub, and
          you are on the list for relay access and upcoming proof-of-practice
          features.
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <li
              key={b.title}
              className="rounded-xl border border-white/5 bg-dojo-ink/50 p-6"
            >
              <h3 className="font-medium text-dojo-gold">{b.title}</h3>
              <p className="mt-2 text-sm text-dojo-mist/70">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
