import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SharePracticeVideo } from "@/components/SharePracticeVideo";
import { PracticeViewTracker } from "@/components/PracticeViewTracker";
import {
  fetchPracticeSessionById,
  formatDuration,
} from "@/lib/practice-events";
import {
  ogImageForPracticeVideo,
  ogSafeTitle,
  practiceVideoShareUrl,
} from "@/lib/media-url";
import { MEMBERSHIP_PRICE_USD } from "@/lib/constants";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const session = await fetchPracticeSessionById(params.id);
  if (!session) {
    return {
      title: "Practice video — DojoPop",
      description: "Daily martial arts practice on the open web.",
    };
  }

  const pageUrl = practiceVideoShareUrl(session.id);
  const ogTitle = `${ogSafeTitle(session.title) || "Practice video"} — DojoPop`;
  const description =
    "Daily martial arts practice on DojoPop — verifiable training logs on Nostr. Film your reps, share your progress, join the dojo.";
  const image = ogImageForPracticeVideo(session.id, session.thumbUrl);

  return {
    title: ogTitle,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: ogTitle,
      description,
      url: pageUrl,
      siteName: "DojoPop",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: image.url,
          secureUrl: image.url.startsWith("https://") ? image.url : undefined,
          alt: ogSafeTitle(session.title) || session.title,
          type: "image/jpeg",
          ...(image.width ? { width: image.width, height: image.height } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image.url],
    },
  };
}

export default async function PracticeVideoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await fetchPracticeSessionById(params.id);
  if (!session) {
    notFound();
  }

  return (
    <>
      <PracticeViewTracker eventId={session.id} />
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/watch"
            className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
          >
            ← Practice hub
          </Link>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <video
              src={session.videoUrl}
              controls
              playsInline
              preload="metadata"
              poster={session.thumbUrl}
              className="mx-auto max-h-[75vh] w-full object-contain"
            />
          </div>

          <div className="mt-8">
            <h1 className="font-display text-3xl text-white">{session.title}</h1>
            <p className="mt-2 text-sm text-dojo-mist/60">
              {formatDate(session.publishedAt)} · {formatDuration(session.durationSec)}
              {session.roughLocation ? ` · ${session.roughLocation}` : ""}
              {" · "}
              <Link
                href={`/u/${session.npub}`}
                className="text-dojo-gold hover:underline"
              >
                View full log
              </Link>
            </p>
          </div>

          <div className="mt-6">
            <SharePracticeVideo eventId={session.id} title={session.title} />
          </div>

          <aside className="card-glow mt-10 rounded-2xl border border-dojo-gold/25 bg-dojo-gold/5 p-6 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-dojo-gold">
              Proof of practice
            </p>
            <h2 className="mt-2 font-display text-2xl text-white">
              Film your training. Own the record.
            </h2>
            <p className="mt-3 text-sm text-dojo-mist/75">
              DojoPop is a verifiable martial arts log on Nostr — one short clip per day,
              permanent and yours. Kenjutsu, aikido, HEMA, 52vtk, and more.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-block rounded-full bg-dojo-crimson px-8 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Join DojoPop — ${MEMBERSHIP_PRICE_USD}/mo
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
