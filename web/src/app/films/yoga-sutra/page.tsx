import { Suspense } from "react";
import { YogaSutraFilmPage } from "./YogaSutraFilmPage";
import {
  YOGA_SUTRA_SYNOPSIS,
  yogaSutraTiers,
  yogaSutraTrailer,
} from "@/lib/films/yoga-sutra";

export const metadata = {
  title: "Yoga Sutra — DojoPop Films",
  description:
    "Stream Yoga Sutra — own + download or 48-hour rental via Lightning or Stripe on DojoPop.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="gradient-hero min-h-[70vh] px-6 py-16 text-center text-dojo-mist/60">
          Loading…
        </div>
      }
    >
      <YogaSutraFilmPage
        trailer={yogaSutraTrailer()}
        synopsis={YOGA_SUTRA_SYNOPSIS}
        tiers={yogaSutraTiers()}
      />
    </Suspense>
  );
}
