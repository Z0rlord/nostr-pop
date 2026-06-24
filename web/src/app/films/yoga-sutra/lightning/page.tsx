import { Suspense } from "react";
import YogaSutraLightningPage from "./YogaSutraLightningPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="gradient-hero min-h-[70vh] px-6 py-16 text-center text-dojo-mist/60">
          Loading…
        </div>
      }
    >
      <YogaSutraLightningPage />
    </Suspense>
  );
}
