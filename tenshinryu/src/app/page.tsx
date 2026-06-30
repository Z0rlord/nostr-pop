import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingTier } from "@/components/PricingTier";

const CURRICULUM = [
  "Kihon (Basic Movements)",
  "Giho (Techniques)",
  "Keikoho (Practical Method)",
  "Shosa To Reiho (Samurai Behavior And Etiquette)",
  "Tenshinryu And Samurai Philosophy (Text)",
  "Kurai (Miden)",
];

const REVIEWS = [
  {
    quote:
      "TENSHINRYU ONLINE is exactly the best learning platform for those who are looking for an authentic battoujutsu art.",
    author: "Hapsoro Renaldy",
  },
  {
    quote:
      "TENSHINRYU ONLINE is such breakthrough method in martial art's training system.",
    author: "Malik Firdausi",
  },
  {
    quote:
      "The sensei make their best effort to transmit not only the techniques, but the philosophy behind Tenshinryu, Battoujutsu, and martial arts as a way of life.",
    author: "Oscar Pacheco",
  },
  {
    quote:
      "Tenshinryu does not just focus on physical but also mental exercise. Learn and live the manners, gain strength and control body and mind.",
    author: "From Germany",
  },
  {
    quote:
      "TENSHINRYU ONLINE is an amazing opportunity. I feel welcomed into a very special group of people dedicated to learning, teaching and preserving this art.",
    author: "David Hughes",
  },
];

export default function HomePage() {
  return (
    <div className="kiwami-page">
      <div className="kiwami-container flex flex-col">
        <SiteHeader />

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">
            HOME
          </Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">TENSHINRYU ONLINE KIWAMI -極-</span>
        </nav>

        <main>
          {/* Hero */}
          <section className="section-pad border-b border-border">
            <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-3">
                  Online martial arts training
                </p>
                <h1 className="font-heading text-3xl md:text-4xl mb-5 leading-tight">
                  TENSHINRYU ONLINE KIWAMI -極-
                </h1>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    TENSHINRYU ONLINE is an online service that allows people to learn
                    Tenshinryu from anywhere in the world. Through the internet, the name of
                    Tenshinryu has now become known all over the world. However, although the
                    school&apos;s recognition has increased over the past decade, the
                    opportunities to learn it have not kept pace with its growing reputation.
                  </p>
                  <p>
                    Therefore, to meet the rising demand, we launched the service called
                    TENSHINRYU ONLINE. We have been proud of this excellent system, but in
                    order to further improve the service, we have revamped it and rebooted it
                    as <strong className="text-foreground">TENSHINRYU ONLINE KIWAMI -極-</strong>.
                  </p>
                  <p>
                    KIWAMI -極- is a Japanese word meaning &ldquo;to master&rdquo; or
                    &ldquo;ultimate.&rdquo; You can train in the ultimate wisdom through an
                    ultimate system online and master the ultimate path. This is truly the
                    triumph of traditional wisdom and modern technology.
                  </p>
                  <p>
                    The gate to the path that the samurai walked 400 years ago has been
                    opened. Please believe in your own potential. Let&apos;s walk this path
                    together.
                  </p>
                  <p className="text-primary font-medium pt-2">
                    Tradition is immutable, growth is infinite.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link href="/signup" className="btn-primary !text-sm">
                    View membership plans
                  </Link>
                  <Link href="/login" className="btn-secondary !text-sm">
                    Member login
                  </Link>
                </div>
              </div>
              <div className="shrink-0 mx-auto lg:mx-0">
                <Image
                  src="/logo-tenshinryu.jpg"
                  alt="Tenshinryu KIWAMI"
                  width={320}
                  height={320}
                  className="rounded-full w-64 h-64 md:w-80 md:h-80 object-cover border border-border shadow-card"
                  priority
                />
              </div>
            </div>
          </section>

          {/* Promo */}
          <div className="promo-notice">
            <p>
              <strong>Limited-time pricing:</strong> TENSHINRYU ONLINE GOLD is reduced from{" "}
              <strong>$50 to $35</strong> per month, and ROYAL from <strong>$100 to $85</strong>{" "}
              until we reach our subscriber goal.
            </p>
            <p className="mt-3">
              Within three days of registration, we will set up your account and send your
              login information to your email. Please understand that there may be a delay due
              to the manual nature of our system.
            </p>
          </div>

          {/* Pricing */}
          <section id="plans" className="section-pad border-b border-border">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <PricingTier
                name="YouTube Member"
                price="4.99"
                features={[
                  "Access to exclusive live training streams on YouTube",
                  "Early access to YouTube videos",
                  "You can view Member only posts in the YouTube Community section.",
                ]}
                ctaHref="https://www.youtube.com/@tenshinryu"
                ctaLabel="Proceed to payment"
                external
              />
              <PricingTier
                name="TENSHINRYU ONLINE GOLD"
                price="35"
                originalPrice="50"
                features={[
                  "Access to exclusive live training streams on YouTube",
                  "Access to the member site (English version)",
                  "Access to Tenshin Sensei's Direct Lesson streaming",
                  "Eligibility to take the rank examination (additional fee required)",
                  "Launching a training group (after participating for a certain period of time)",
                ]}
                ctaHref="/signup?tier=gold"
                ctaLabel="Proceed to payment"
              />
              <PricingTier
                name="TENSHINRYU ONLINE ROYAL"
                price="85"
                originalPrice="100"
                features={[
                  "Access to exclusive live training streams on YouTube",
                  "Access to the member site (English version)",
                  "Access to Tenshin Sensei's Direct Lesson streaming",
                  "Eligibility to take the rank examination",
                  "Launching a training group (after participating for a certain period of time)",
                  "Direct feedback comments on your recorded performance from our instructors",
                  "Access to Zoom Lessons",
                ]}
                ctaHref="/signup?tier=royal"
                ctaLabel="Proceed to payment"
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We have three courses available. Choose the course that best suits your needs.
              YouTube membership is a community where you can support Tenshinryu and practice
              together as a casual Tenshinryu family. TENSHINRYU ONLINE ROYAL has a complete
              support system, making it a must-have for anyone aspiring to become a leader.
            </p>
          </section>

          {/* How to study */}
          <section className="section-pad border-b border-border bg-surface">
            <h2 className="section-heading">How do you study Tenshinryu?</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              TENSHINRYU ONLINE&apos;s main content consists of videos (with English
              subtitles). Additionally, there is supplementary English text. Learning
              progresses step by step starting from Stage 1. Each stage is divided into six
              categories with 5 to 10 programs each.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-foreground mb-8">
              {CURRICULUM.map((item) => (
                <li key={item} className="pl-1">
                  {item}
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              The &ldquo;Tenshinryu and Samurai Philosophy&rdquo; category is primarily
              comprised of text (and photos). All videos are generally transcribed with
              English subtitles.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "YouTube Streaming",
                  body: "Livestream lessons on YouTube about four times a week — public streams and private family sessions with secret techniques for members.",
                },
                {
                  title: "Bu(武)-log",
                  body: "A blog where the master's texts and photos are shared as regular columns.",
                },
                {
                  title: "Direct lessons via Zoom",
                  body: "Receive direct lessons from the master via Zoom — submit video for comments and answer videos (ROYAL tier).",
                },
                {
                  title: "Rank examination",
                  body: "When a Master determines your level is sufficient, you become eligible to take the rank exam.",
                },
              ].map((item) => (
                <div key={item.title} className="card">
                  <h3 className="font-heading text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Subscription */}
          <section className="section-pad border-b border-border">
            <h2 className="section-heading-plain">Subscription procedure</h2>
            <div className="space-y-8">
              {[
                {
                  step: "1. You decide which course to enroll in",
                  body: "You will make the payment from the button of the course you selected. YouTube Members should pay according to YouTube's system. GOLD and ROYAL use PayPal.",
                },
                {
                  step: "2. Carry out the subscription payment via PayPal",
                  body: "If you click the PayPal button, you will directly get to the subscription payment page. Please follow the instructions there to proceed.",
                },
                {
                  step: "3. Receive an e-mail from the administration",
                  body: "We will send an e-mail to your PayPal e-mail address confirming your subscription. If the e-mail hasn't arrived, please check your spam folder.",
                },
              ].map((s) => (
                <div key={s.step}>
                  <h3 className="font-body text-xl font-bold mb-2">{s.step}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Heritage */}
          <section className="section-pad border-b border-border">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="relative aspect-[3/4] max-w-sm mx-auto md:mx-0 w-full">
                <Image
                  src="/logo-enso.png"
                  alt="Tenshinryu heritage"
                  fill
                  className="object-cover border border-border shadow-card"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
              <div>
                <h2 className="section-heading-plain">Heritage</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Ten years ago, Tenshinryu was hardly known. And for decades, there were
                    very few students. Tenshin Sensei always said at that time: &ldquo;Tenshinryu
                    is already over.&rdquo; We thought it was the mission of the students to
                    leave this traditional culture.
                  </p>
                  <p>
                    Tenshinryu gradually gained popularity on social media and the number of
                    students increased. Now Tenshinryu has become well-known in many foreign
                    countries, and many people worldwide wish to learn Tenshinryu.
                  </p>
                  <p>
                    Instead, we want to introduce TENSHINRYU ONLINE to cater to those willing
                    to accept and learn our ways. Everyone knows that receiving direct
                    guidance is most crucial — yet constant practice with a clear goal is what
                    matters most. Let us start this journey together.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="section-pad border-b border-border bg-surface">
            <h2 className="section-heading-plain mb-8">Members reviews</h2>
            <div className="space-y-8">
              {REVIEWS.map((r) => (
                <blockquote key={r.author} className="border-b border-border pb-8 last:border-0">
                  <p className="text-foreground leading-relaxed mb-3">{r.quote}</p>
                  <footer className="text-sm text-muted-foreground">{r.author}</footer>
                </blockquote>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="section-pad text-center">
            <h2 className="font-heading text-2xl md:text-3xl mb-4">
              Begin your journey
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Sign in after registration, or install the app to your home screen for the
              full PWA experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary">
                Join TENSHINRYU ONLINE
              </Link>
              <Link href="/login" className="btn-secondary">
                Member Login
              </Link>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
