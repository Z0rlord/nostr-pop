"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDuration, type PracticeSession } from "@/lib/practice-events";
import { practiceVideoSharePath } from "@/lib/media-url";
import { SharePracticeVideo } from "@/components/SharePracticeVideo";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function VideoCard({ video }: { video: PracticeSession }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="card-glow overflow-hidden rounded-2xl border border-white/5 bg-dojo-slate/60">
      <div className="relative aspect-[9/16] max-h-[70vh] bg-black/40 sm:aspect-video sm:max-h-none">
        {playing ? (
          <video
            src={video.videoUrl}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain"
            poster={video.thumbUrl}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative h-full w-full"
            aria-label={`Play ${video.title}`}
          >
            {video.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={video.videoUrl}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover"
                aria-hidden
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dojo-crimson/90 text-2xl text-white shadow-lg">
                ▶
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="p-4">
        <Link
          href={practiceVideoSharePath(video.id)}
          className="line-clamp-2 font-medium text-white hover:text-dojo-gold transition-colors"
        >
          {video.title}
        </Link>
        <p className="mt-1 text-xs text-dojo-mist/60">
          {formatDate(video.publishedAt)} · {formatDuration(video.durationSec)}
        </p>
        <div className="mt-3">
          <SharePracticeVideo eventId={video.id} title={video.title} compact />
        </div>
      </div>
    </article>
  );
}

type Props = {
  sessions: PracticeSession[];
};

export function PracticeFeed({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-center text-dojo-mist/60 py-16">
        No daily practice videos yet.
      </p>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
