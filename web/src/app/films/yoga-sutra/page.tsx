import { Suspense } from "react";
import { YogaSutraFilmPage } from "./YogaSutraFilmPage";
import {
  yogaSutraPriceSats,
  yogaSutraPriceUsd,
  yogaSutraTrailerUrl,
} from "@/lib/films/yoga-sutra";

export const metadata = {
  title: "Yoga Sutra — DojoPop Films",
  description:
    "Stream Yoga Sutra — one-time purchase via Lightning or Stripe on DojoPop.",
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
        trailerUrl={yogaSutraTrailerUrl()}
        priceSats={yogaSutraPriceSats()}
        priceUsd={yogaSutraPriceUsd()}
      />
    </Suspense>
  );
}
