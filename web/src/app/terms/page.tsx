import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — DojoPop",
  description: "Terms of Service for DojoPop (dojopop.live).",
};

const LAST_UPDATED = "11 June 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of DojoPop at{" "}
        <a href="https://dojopop.live" className="text-dojo-gold hover:underline">
          dojopop.live
        </a>{" "}
        and related services (the &quot;Service&quot;), operated by DojoPop
        (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using the Service,
        you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">1. The Service</h2>
        <p>
          DojoPop is a proof-of-practice platform for martial artists. Members
          may publish short practice sessions to a Nostr relay, appear on
          community leaderboards, and use personal practice logs. Instructors
          may use separate school features for class attendance (where
          available). The Service integrates with third-party payment providers
          and the open Nostr protocol; we do not custody your Nostr private keys.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">2. Eligibility</h2>
        <p>
          You must be at least 16 years old to use the Service, or the age of
          digital consent in your country if higher. If you are under 18, you
          should use the Service only with a parent or guardian&apos;s
          permission. By using the Service, you represent that you meet these
          requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">3. Accounts and identity</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Your Nostr public key (npub) is your primary identity on DojoPop.
            You are responsible for securing your own keys and any browser
            extension or wallet you use (NIP-07).
          </li>
          <li>
            We do not store your Nostr private key (nsec). Loss of your keys may
            mean you cannot prove ownership of past events.
          </li>
          <li>
            Membership links your npub to relay publishing permissions on our
            infrastructure. You must provide an accurate npub when joining.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">4. Membership and payments</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Solo publishing membership is currently offered at{" "}
            <strong className="font-medium text-dojo-mist">$9.99 USD per month</strong>{" "}
            (or equivalent via Lightning), unless we change pricing with notice.
          </li>
          <li>
            Card payments are processed by{" "}
            <a
              href="https://stripe.com"
              className="text-dojo-gold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe
            </a>
            . Lightning payments may be processed via BTCPay or compatible
            providers. We do not store full card numbers.
          </li>
          <li>
            Subscriptions renew automatically until canceled through Stripe or
            by letting a Lightning period expire. Refunds are handled in line
            with applicable law and our payment partners&apos; policies; contact{" "}
            <a
              href="mailto:admin@dojopop.live"
              className="text-dojo-gold hover:underline"
            >
              admin@dojopop.live
            </a>{" "}
            for billing questions.
          </li>
          <li>
            School or instructor pricing may differ and is agreed separately
            during onboarding.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">5. Your content</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Practice videos and related Nostr events you publish are{" "}
            <strong className="font-medium text-dojo-mist">signed by you</strong>{" "}
            and replicated on public or federated relays. Treat published
            practice logs as potentially permanent and publicly visible unless
            described otherwise (e.g. encrypted school attendance).
          </li>
          <li>
            You retain ownership of your content. You grant us a non-exclusive
            licence to display, index, and promote your public practice events
            on dojopop.live and related interfaces.
          </li>
          <li>
            You must not publish unlawful, harassing, infringing, or dangerous
            content, or content that violates others&apos; privacy or intellectual
            property rights.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">6. School and attendance features</h2>
        <p>
          Where offered, school rosters and class attendance may be visible only
          to school members as described on the Service. Instructors are
          responsible for obtaining any consent required from students under
          local law before adding them to a roster or logging attendance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">7. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Abuse, disrupt, or attempt to compromise the Service or relay.</li>
          <li>Scrape or overload our APIs without permission.</li>
          <li>Impersonate another person or use another person&apos;s npub without authorization.</li>
          <li>Use the Service for spam, fraud, or illegal activity.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">8. Health and safety</h2>
        <p>
          Martial arts training carries inherent risk of injury. DojoPop does not
          provide medical, coaching, or safety advice. You are solely responsible
          for training safely, using appropriate equipment, and consulting
          qualified instructors where needed. The Service is a logging and
          community tool, not a substitute for professional instruction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">9. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, to the fullest extent permitted by law.
          We do not guarantee uninterrupted access, accuracy of third-party
          relay data, or that the Service will meet your requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, DojoPop and its
          operators will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for loss of profits, data, or
          goodwill, arising from your use of the Service. Our total liability
          for any claim relating to the Service is limited to the amount you paid
          us in the twelve (12) months before the claim, or EUR 50 if you have
          not paid us, except where liability cannot be limited under mandatory
          consumer law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">11. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          access if you breach these Terms or if required for security or legal
          reasons. Canceling membership stops future billing but does not by
          itself remove content already published to Nostr relays.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">12. Changes</h2>
        <p>
          We may update these Terms. We will post the revised version on this
          page with a new &quot;Last updated&quot; date. Material changes may
          also be communicated by email or notice on the site where appropriate.
          Continued use after changes take effect constitutes acceptance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">13. Governing law</h2>
        <p>
          These Terms are governed by the laws of Poland, without regard to
          conflict-of-law rules. If you are a consumer in the European Union, you
          also benefit from mandatory protections of the laws of your country of
          residence. Disputes may be brought before the courts of Poland or, for
          EU consumers, in your country of residence where required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">14. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:admin@dojopop.live"
            className="text-dojo-gold hover:underline"
          >
            admin@dojopop.live
          </a>
          . See also our{" "}
          <Link href="/privacy" className="text-dojo-gold hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
