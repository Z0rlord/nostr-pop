import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Tenshinryu KIWAMI",
  description:
    "Privacy Policy for TENSHINRYU ONLINE KIWAMI at tenshinryu.xyz.",
};

const LAST_UPDATED = "17 June 2026";
const SITE = "https://tenshinryu.xyz";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how <strong>Japanese Tradition Tenshinryu Hyoho</strong>{" "}
        (&quot;we&quot;, &quot;us&quot;, &quot;Tenshinryu&quot;) collects and uses personal data
        when you use{" "}
        <a href={SITE} className="legal-link">
          tenshinryu.xyz
        </a>{" "}
        and the TENSHINRYU ONLINE KIWAMI member application (the &quot;Service&quot;). We aim to
        comply with applicable data protection laws, including the EU General Data Protection
        Regulation (GDPR) where it applies.
      </p>

      <section>
        <h2>1. Data controller</h2>
        <p>
          The data controller for this Service is Japanese Tradition Tenshinryu Hyoho, operator
          of TENSHINRYU ONLINE KIWAMI.
        </p>
        <p>
          Contact:{" "}
          <a href="mailto:tenshinryu-international@tenshinryu.net" className="legal-link">
            tenshinryu-international@tenshinryu.net
          </a>{" "}
          or via{" "}
          <a
            href="https://international.tenshinryu.net"
            className="legal-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            international.tenshinryu.net
          </a>
          .
        </p>
        <p>
          For privacy requests (access, erasure, etc.), email{" "}
          <a href="mailto:tenshinryu-international@tenshinryu.net?subject=Privacy%20request" className="legal-link">
            tenshinryu-international@tenshinryu.net
          </a>{" "}
          with the subject line &quot;Privacy request&quot;.
        </p>
      </section>

      <section>
        <h2>2. What data we process</h2>
        <p>Depending on how you use the Service, we may process:</p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Examples</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Identity &amp; account</td>
                <td>Name, email, Firebase user ID, role (student/instructor/admin)</td>
                <td>You (Google or Apple sign-in)</td>
              </tr>
              <tr>
                <td>Membership</td>
                <td>Tier (GOLD, ROYAL, etc.), status, expiry, Stripe customer/subscription IDs</td>
                <td>Our servers / payment providers</td>
              </tr>
              <tr>
                <td>Training records</td>
                <td>Class check-ins, solo practice logs, goals, journal entries, belt rank</td>
                <td>You / your instructor</td>
              </tr>
              <tr>
                <td>Media you upload</td>
                <td>Profile photos, practice videos, voice notes for AI features</td>
                <td>You</td>
              </tr>
              <tr>
                <td>Location (optional)</td>
                <td>Approximate coordinates rounded to ~1 km for practice heatmaps</td>
                <td>You (with consent in the app)</td>
              </tr>
              <tr>
                <td>Communications</td>
                <td>LINE user ID if linked; notification preferences</td>
                <td>You (optional integrations)</td>
              </tr>
              <tr>
                <td>Technical</td>
                <td>IP address, browser type, request logs, session cookies</td>
                <td>Automatically</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do <strong>not</strong> collect or store your Google or Apple account password. Sign-in
          is handled by Firebase Authentication.
        </p>
      </section>

      <section>
        <h2>3. Lawful bases (GDPR Art. 6)</h2>
        <ul>
          <li>
            <strong>Contract</strong> — processing needed to provide membership, training dashboards,
            check-in, and support you signed up for.
          </li>
          <li>
            <strong>Consent</strong> — optional location for heatmaps, LINE linking, marketing if
            added later (you may withdraw consent at any time).
          </li>
          <li>
            <strong>Legitimate interests</strong> — security, fraud prevention, improving the Service,
            and operating dojo analytics for instructors, balanced against your rights.
          </li>
          <li>
            <strong>Legal obligation</strong> — tax, accounting, or law-enforcement requests where
            required.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How we use data</h2>
        <ul>
          <li>Authenticate you and maintain your member, instructor, or admin session.</li>
          <li>Manage GOLD and ROYAL subscriptions and access to tiered content.</li>
          <li>Record class attendance, solo practice, badges, and leaderboards.</li>
          <li>Send transactional emails (e.g. invitations, reminders) where enabled.</li>
          <li>Provide optional AI insights or voice features on content you submit.</li>
          <li>Protect the Service from abuse and technical failures.</li>
        </ul>
      </section>

      <section>
        <h2>5. Processors and third parties</h2>
        <p>We use trusted providers who process data on our instructions:</p>
        <ul>
          <li>
            <a
              href="https://firebase.google.com/support/privacy"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Firebase
            </a>{" "}
            — authentication (Google / Apple sign-in)
          </li>
          <li>
            <a
              href="https://stripe.com/privacy"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe
            </a>{" "}
            — card payments and subscriptions (where enabled)
          </li>
          <li>
            <a
              href="https://neon.tech/privacy-policy"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Neon
            </a>{" "}
            — PostgreSQL database hosting
          </li>
          <li>
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare
            </a>{" "}
            — DNS, tunnel, and edge security
          </li>
          <li>Hetzner — application hosting infrastructure</li>
          <li>
            <a
              href="https://resend.com/legal/privacy-policy"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend
            </a>{" "}
            — transactional email (where enabled)
          </li>
          <li>PayPal — subscription payments processed on our official KIWAMI page (external)</li>
        </ul>
        <p>
          We do not sell your personal data. We may disclose data if required by law or to protect
          rights and safety.
        </p>
      </section>

      <section>
        <h2>6. International transfers</h2>
        <p>
          Some processors (e.g. Google, Stripe, Neon, Cloudflare) may process data in the United
          States or other countries outside the European Economic Area (EEA). Where required, we
          rely on appropriate safeguards such as Standard Contractual Clauses or adequacy decisions.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <ul>
          <li>
            <strong>Account and membership records</strong> — while your account is active and for a
            reasonable period after cancellation for billing disputes and legal obligations.
          </li>
          <li>
            <strong>Training logs</strong> — for the duration of your membership and as needed for
            dojo records you or your instructor request us to keep.
          </li>
          <li>
            <strong>Server logs</strong> — typically rolling retention unless needed for security
            investigations.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>
          If you are in the EEA, UK, or another jurisdiction with similar laws, you may have the
          right to access, rectify, erase, restrict, or object to certain processing, and to data
          portability. You may lodge a complaint with your local supervisory authority.
        </p>
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:tenshinryu-international@tenshinryu.net?subject=Privacy%20request" className="legal-link">
            tenshinryu-international@tenshinryu.net
          </a>
          . We respond within one month where GDPR applies.
        </p>
      </section>

      <section>
        <h2>9. Cookies and local storage</h2>
        <p>We use essential technical storage only:</p>
        <ul>
          <li>
            <strong>Session cookies</strong> — to keep you signed in after Firebase authentication.
          </li>
          <li>
            <strong>Local storage</strong> — PWA preferences and client-side app state where needed.
          </li>
          <li>
            <strong>Payment sessions</strong> — Stripe Checkout uses its own cookies on Stripe&apos;s
            domain when you pay.
          </li>
        </ul>
        <p>
          We do not use third-party advertising cookies. If we introduce analytics cookies, we will
          update this policy and ask for consent where required.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          The Service is intended for martial arts students aged 16 and older, or with a parent or
          guardian&apos;s permission where local law requires. We do not knowingly collect personal
          data from children under 16 without appropriate consent. Contact us if you believe a child
          has provided data without consent.
        </p>
      </section>

      <section>
        <h2>11. Security</h2>
        <p>
          We use reasonable technical and organizational measures (encryption in transit, access
          controls, secrets management). No method of transmission or storage is 100% secure.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may update this Privacy Policy. The &quot;Last updated&quot; date will change when we
          do. Material changes may be communicated on the site or by email where appropriate.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:tenshinryu-international@tenshinryu.net" className="legal-link">
            tenshinryu-international@tenshinryu.net
          </a>
          . See also our{" "}
          <Link href="/terms" className="legal-link">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
