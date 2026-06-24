import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TIER_INFO: Record<string, { name: string; price: string }> = {
  gold: { name: "TENSHINRYU ONLINE GOLD", price: "$35/month" },
  royal: { name: "TENSHINRYU ONLINE ROYAL", price: "$85/month" },
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { tier?: string };
}) {
  const tier = searchParams.tier?.toLowerCase();
  const selected = tier && TIER_INFO[tier] ? TIER_INFO[tier] : null;

  return (
    <div className="kiwami-page">
      <div className="kiwami-container flex flex-col min-h-screen">
        <SiteHeader />

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">Join</span>
        </nav>

        <main className="flex-1 section-pad kiwami-container-narrow">
          <div className="text-center mb-8">
            <Image
              src="/logo-tenshinryu.jpg"
              alt="Tenshinryu"
              width={96}
              height={96}
              className="mx-auto mb-4 rounded-full w-24 h-24 object-cover border border-border"
            />
            <h1 className="font-heading text-2xl md:text-3xl mb-2">
              Join TENSHINRYU ONLINE
            </h1>
            {selected ? (
              <p className="text-muted-foreground">
                Selected: <strong className="text-foreground">{selected.name}</strong> —{" "}
                {selected.price}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Choose GOLD or ROYAL on the{" "}
                <Link href="/#plans" className="text-primary hover:underline">
                  plans page
                </Link>
                , then complete payment.
              </p>
            )}
          </div>

          <div className="card space-y-6 mb-6">
            <h2 className="section-heading !mb-0 !text-base">How to subscribe</h2>
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground leading-relaxed pt-4">
              <li>
                Complete your subscription payment via PayPal on the{" "}
                <a
                  href="https://international.tenshinryu.net/tenshinryu-online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  official KIWAMI page
                </a>
                .
              </li>
              <li>
                Within three days, administration will email your login details to your PayPal
                email address.
              </li>
              <li>
                Return here and{" "}
                <Link href="/login" className="text-primary hover:underline">
                  sign in
                </Link>{" "}
                with Google or Apple using that email.
              </li>
            </ol>
          </div>

          <div className="card bg-surface">
            <h2 className="font-heading text-lg mb-2">Already paid?</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              If you received your welcome email, sign in to access the member area and install
              the PWA to your device.
            </p>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
