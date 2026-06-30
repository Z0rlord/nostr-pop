import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — DojoPop",
  description:
    "Privacy Policy and GDPR information for DojoPop (dojopop.live).",
};

const LAST_UPDATED = "11 June 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how DojoPop (&quot;we&quot;, &quot;us&quot;)
        collects and uses personal data when you use{" "}
        <a href="https://dojopop.live" className="text-dojo-gold hover:underline">
          dojopop.live
        </a>{" "}
        and related services (the &quot;Service&quot;). We aim to comply with the
        EU General Data Protection Regulation (GDPR) and other applicable data
        protection laws.
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">1. Data controller</h2>
        <p>
          The data controller responsible for your personal data is DojoPop,
          operator of dojopop.live.
        </p>
        <p>
          Contact:{" "}
          <a
            href="mailto:admin@dojopop.live"
            className="text-dojo-gold hover:underline"
          >
            admin@dojopop.live
          </a>
        </p>
        <p>
          For privacy-specific requests (access, erasure, etc.), email the same
          address with the subject line &quot;Privacy request&quot;.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">2. What data we process</h2>
        <p>Depending on how you use the Service, we may process:</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-dojo-mist/60">
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Examples</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="text-dojo-mist/80">
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">Identity (Nostr)</td>
                <td className="py-3 pr-4 align-top">npub, public key (hex)</td>
                <td className="py-3 align-top">You (join, NIP-07 connect)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">Contact</td>
                <td className="py-3 pr-4 align-top">Email address</td>
                <td className="py-3 align-top">You (optional at join; school onboarding form)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">Payment</td>
                <td className="py-3 pr-4 align-top">
                  Stripe customer/subscription IDs; Lightning invoice references
                </td>
                <td className="py-3 align-top">Payment providers</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">Membership</td>
                <td className="py-3 pr-4 align-top">
                  Member status, payment method, dates
                </td>
                <td className="py-3 align-top">Our servers</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">School roster</td>
                <td className="py-3 pr-4 align-top">
                  Student/instructor npubs, school name, disciplines
                </td>
                <td className="py-3 align-top">You / your instructor</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4 align-top">Technical</td>
                <td className="py-3 pr-4 align-top">
                  IP address, request logs, browser type (via host/CDN)
                </td>
                <td className="py-3 align-top">Automatically</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top">Public practice content</td>
                <td className="py-3 pr-4 align-top">
                  Video URLs, titles, timestamps, tags on Nostr events
                </td>
                <td className="py-3 align-top">You (published to relay)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do <strong className="font-medium text-dojo-mist">not</strong>{" "}
          collect or store your Nostr private key (nsec).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">3. Lawful bases (GDPR Art. 6)</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-dojo-mist">Contract</strong> —
            processing needed to provide membership, relay publishing access,
            school features you sign up for, and support.
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Consent</strong> —
            optional email at checkout; school onboarding form; marketing if we
            add it later (you may withdraw consent at any time).
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Legitimate interests</strong>{" "}
            — security, fraud prevention, improving the Service, and displaying
            public Nostr practice events on our site, balanced against your
            rights.
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Legal obligation</strong>{" "}
            — tax, accounting, or law-enforcement requests where required.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">4. How we use data</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Activate and manage your membership and relay publish whitelist.</li>
          <li>Process payments and send transactional emails (e.g. onboarding confirmations via Resend).</li>
          <li>Operate school rosters and decrypt school attendance for authorized members.</li>
          <li>Show practice feeds, leaderboards, and personal practice logs.</li>
          <li>Respond to support and legal requests.</li>
          <li>Protect the Service from abuse and technical failures.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">5. Nostr and public data</h2>
        <p>
          Solo practice events you publish are designed to be{" "}
          <strong className="font-medium text-dojo-mist">public</strong> on the
          Nostr network. They may be copied to other relays and clients beyond
          DojoPop. Deleting data from our site does not remove copies on the
          wider network. School class attendance content is encrypted on the
          relay; decryption keys are held for authorized school members only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">6. Processors and third parties</h2>
        <p>We use trusted providers who process data on our instructions:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a
              href="https://stripe.com/privacy"
              className="text-dojo-gold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe
            </a>{" "}
            — card payments and subscriptions
          </li>
          <li>
            <a
              href="https://resend.com/legal/privacy-policy"
              className="text-dojo-gold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend
            </a>{" "}
            — transactional email
          </li>
          <li>
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              className="text-dojo-gold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare
            </a>{" "}
            — DNS, tunnel, and edge security
          </li>
          <li>
            Hosting infrastructure (e.g. Hetzner) — application and data storage
          </li>
          <li>
            BTCPay or compatible providers — Lightning payments (when enabled)
          </li>
        </ul>
        <p>
          We do not sell your personal data. We may disclose data if required by
          law or to protect rights and safety.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">7. International transfers</h2>
        <p>
          Some processors (e.g. Stripe, Resend, Cloudflare) may process data in
          the United States or other countries outside the European Economic
          Area (EEA). Where required, we rely on appropriate safeguards such as
          Standard Contractual Clauses or adequacy decisions. You may request
          more information about transfers by contacting us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">8. Retention</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-dojo-mist">Membership records</strong>{" "}
            — while your account is active and for a reasonable period after
            cancellation (e.g. for billing disputes and legal obligations).
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">School roster data</strong>{" "}
            — for the life of the school partnership and as needed afterward for
            records you request us to keep.
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Server logs</strong>{" "}
            — typically rolling retention (e.g. weeks to months) unless needed
            for security investigations.
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Nostr public events</strong>{" "}
            — not controlled by us after publication; retention on relays is
            independent of DojoPop.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">9. Your rights (GDPR)</h2>
        <p>
          If you are in the EEA, UK, or another jurisdiction with similar laws,
          you may have the right to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access a copy of your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Erase data (&quot;right to be forgotten&quot;) where applicable</li>
          <li>Restrict or object to certain processing</li>
          <li>Data portability for data you provided, in a structured format</li>
          <li>Withdraw consent at any time (without affecting prior lawful processing)</li>
          <li>
            Lodge a complaint with a supervisory authority — e.g. in Poland, the
            President of the Personal Data Protection Office (UODO), or your
            local authority in the EU
          </li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a
            href="mailto:admin@dojopop.live?subject=Privacy%20request"
            className="text-dojo-gold hover:underline"
          >
            admin@dojopop.live
          </a>
          . We respond within one month, as required by GDPR, unless an extension
          applies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">10. Cookies and local storage</h2>
        <p>
          We do not use third-party advertising or analytics cookies on the
          current Service. We may use:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-dojo-mist">Essential technical storage</strong>{" "}
            — e.g. browser session storage to remember your Nostr connection on
            the &quot;My practice&quot; page for the current session.
          </li>
          <li>
            <strong className="font-medium text-dojo-mist">Payment session</strong>{" "}
            — Stripe Checkout runs on Stripe&apos;s domain with its own cookies
            when you pay.
          </li>
        </ul>
        <p>
          If we introduce non-essential cookies (e.g. analytics), we will update
          this policy and, where required, ask for consent before setting them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">11. Children</h2>
        <p>
          The Service is not directed at children under 16. We do not knowingly
          collect personal data from children under 16. If you believe a child
          has provided us data, contact us and we will take appropriate steps to
          delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">12. Security</h2>
        <p>
          We use reasonable technical and organizational measures (encryption in
          transit, access controls, encrypted school attendance payloads, secrets
          management). No method of transmission or storage is 100% secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">13. Changes</h2>
        <p>
          We may update this Privacy Policy. The &quot;Last updated&quot; date
          will change when we do. Material changes may be communicated on the
          site or by email where appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">14. Contact</h2>
        <p>
          Privacy questions:{" "}
          <a
            href="mailto:admin@dojopop.live"
            className="text-dojo-gold hover:underline"
          >
            admin@dojopop.live
          </a>
          . See also our{" "}
          <Link href="/terms" className="text-dojo-gold hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
