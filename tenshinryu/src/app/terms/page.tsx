import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Tenshinryu KIWAMI",
  description: "Terms of Service for TENSHINRYU ONLINE KIWAMI at tenshinryu.xyz.",
};

const LAST_UPDATED = "17 June 2026";
const SITE = "https://tenshinryu.xyz";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of TENSHINRYU
        ONLINE KIWAMI at{" "}
        <a href={SITE} className="legal-link">
          tenshinryu.xyz
        </a>{" "}
        and related member services (the &quot;Service&quot;), operated by{" "}
        <strong>Japanese Tradition Tenshinryu Hyoho</strong> (&quot;we&quot;, &quot;us&quot;,
        &quot;Tenshinryu&quot;). By using the Service, you agree to these Terms. If you do not
        agree, do not use the Service.
      </p>

      <section>
        <h2>1. The Service</h2>
        <p>
          TENSHINRYU ONLINE KIWAMI is a progressive web application for Tenshinryu Hyoho members.
          It provides training content access, class check-in, solo practice tracking, instructor
          tools, and member dashboards. The Service complements — but does not replace — in-person
          instruction under a qualified Tenshinryu instructor.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 16 years old, or the age of digital consent in your country if
          higher. If you are under 18, you should use the Service only with a parent or
          guardian&apos;s permission. By using the Service, you represent that you meet these
          requirements and that any subscription was purchased in accordance with our enrollment
          process.
        </p>
      </section>

      <section>
        <h2>3. Accounts and sign-in</h2>
        <ul>
          <li>
            Access is provided to members who have completed enrollment (e.g. via PayPal on our
            official KIWAMI page) and received login instructions.
          </li>
          <li>
            You sign in with Google or Apple through Firebase Authentication. You are responsible for
            securing your Google/Apple account.
          </li>
          <li>
            Your email address must match the address used for enrollment. We may refuse access if
            no matching membership record exists.
          </li>
          <li>
            Instructor and admin accounts are created by dojo administration. Do not share
            credentials or impersonate another user.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Membership tiers and payments</h2>
        <ul>
          <li>
            Membership tiers (e.g. <strong>GOLD</strong> and <strong>ROYAL</strong>) are described on
            the Service and on{" "}
            <a
              href="https://international.tenshinryu.net/tenshinryu-online"
              className="legal-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              international.tenshinryu.net
            </a>
            . Pricing may change with notice on those pages.
          </li>
          <li>
            Initial subscriptions may be processed via PayPal on our official site. In-app card
            payments, where offered, are processed by Stripe. We do not store full card numbers.
          </li>
          <li>
            Subscriptions renew according to the plan you purchased until canceled. Refunds are
            handled in line with applicable law and our payment partners&apos; policies. Contact{" "}
            <a href="mailto:tenshinryu-international@tenshinryu.net" className="legal-link">
              tenshinryu-international@tenshinryu.net
            </a>{" "}
            for billing questions.
          </li>
          <li>
            Tier features (videos, live streams, instructor tools, etc.) are subject to the access
            level of your active membership.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Your content</h2>
        <ul>
          <li>
            You may upload practice videos, photos, journal entries, and other training-related
            content. You retain ownership of your content.
          </li>
          <li>
            You grant us a non-exclusive licence to store, display, and process your content solely
            to operate the Service (e.g. instructor review, badges, analytics).
          </li>
          <li>
            You must not upload unlawful, harassing, infringing, or dangerous content, or content
            that violates others&apos; privacy or intellectual property rights.
          </li>
          <li>
            Instructors may view student training data within their dojo as part of the Service.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Instructor and dojo features</h2>
        <p>
          Instructors may log class attendance, invite other instructors, and view aggregated
          analytics. Instructors are responsible for obtaining any consent required from students
          under local law before adding them to a roster or recording attendance. Admin accounts may
          access platform-wide metrics for authorized dojo operations.
        </p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Abuse, disrupt, or attempt to compromise the Service or other members&apos; accounts.</li>
          <li>Scrape or overload our APIs without permission.</li>
          <li>Share member-only video or stream content outside the Service without authorization.</li>
          <li>Use the Service for spam, fraud, or illegal activity.</li>
          <li>Circumvent membership tier restrictions.</li>
        </ul>
      </section>

      <section>
        <h2>8. Health and safety</h2>
        <p>
          Martial arts training carries inherent risk of injury. Tenshinryu does not provide
          medical advice. You are solely responsible for training safely, using appropriate
          equipment, and following qualified instruction. Online content is supplementary to — not a
          substitute for — proper dojo training under a licensed instructor.
        </p>
      </section>

      <section>
        <h2>9. Intellectual property</h2>
        <p>
          The Tenshinryu name, logos, curriculum, and official video content are the property of
          Japanese Tradition Tenshinryu Hyoho and its licensors. You may not copy, redistribute, or
          commercially exploit member content or official materials except as expressly permitted
          within the Service.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
          of any kind, to the fullest extent permitted by law. We do not guarantee uninterrupted
          access or that the Service will meet every training need.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Tenshinryu and its operators will not
          be liable for indirect, incidental, special, consequential, or punitive damages arising
          from your use of the Service. Our total liability for any claim relating to the Service
          is limited to the amount you paid us in the twelve (12) months before the claim, or EUR 50
          if you have not paid us, except where liability cannot be limited under mandatory
          consumer law.
        </p>
      </section>

      <section>
        <h2>12. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          breach these Terms, if your membership expires, or if required for security or legal
          reasons. Canceling membership stops future billing but does not automatically delete
          historical training records retained for dojo administration.
        </p>
      </section>

      <section>
        <h2>13. Changes</h2>
        <p>
          We may update these Terms. We will post the revised version on this page with a new
          &quot;Last updated&quot; date. Continued use after changes take effect constitutes
          acceptance where permitted by law.
        </p>
      </section>

      <section>
        <h2>14. Governing law</h2>
        <p>
          These Terms are governed by the laws of Japan, without regard to conflict-of-law rules. If
          you are a consumer in the European Union, you also benefit from mandatory protections of
          the laws of your country of residence. Disputes may be brought before competent courts in
          Japan or, for EU consumers, in your country of residence where required by law.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:tenshinryu-international@tenshinryu.net" className="legal-link">
            tenshinryu-international@tenshinryu.net
          </a>
          . See also our{" "}
          <Link href="/privacy" className="legal-link">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
