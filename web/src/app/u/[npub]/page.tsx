import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PersonalPracticeDashboard } from "@/components/PersonalPracticeDashboard";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import { defaultOgImageUrl, profileShareUrl } from "@/lib/media-url";

export function generateMetadata({ params }: { params: { npub: string } }) {
  const npub = decodeURIComponent(params.npub);
  const label = isValidNpub(npub) ? `${npub.slice(0, 12)}…` : "Practitioner";
  const pageUrl = isValidNpub(npub) ? profileShareUrl(npub) : "https://dojopop.live";
  const description =
    "Public martial arts practice log on DojoPop — verifiable training on Nostr.";
  return {
    title: `${label} — DojoPop`,
    description,
    openGraph: {
      title: `${label} — DojoPop practice log`,
      description,
      url: pageUrl,
      siteName: "DojoPop",
      type: "website",
      images: [
        {
          url: defaultOgImageUrl(),
          width: 1024,
          height: 576,
          alt: "DojoPop practice log",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} — DojoPop`,
      description,
      images: [defaultOgImageUrl()],
    },
  };
}

export default function PublicPracticePage({
  params,
}: {
  params: { npub: string };
}) {
  const npub = decodeURIComponent(params.npub);
  if (!isValidNpub(npub)) {
    notFound();
  }

  const pubkeyHex = decodeNpubToHex(npub);
  if (!pubkeyHex) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <Link
              href="/watch"
              className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
            >
              ← Practice hub
            </Link>
            <h1 className="mt-4 font-display text-3xl text-white sm:text-4xl">
              Practice log
            </h1>
            <p className="mt-2 text-sm text-dojo-mist/60">
              Public proof-of-practice for this Nostr identity.
            </p>
          </div>
          <PersonalPracticeDashboard
            pubkeyHex={pubkeyHex}
            npub={npub}
            readOnly
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
