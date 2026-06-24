"use client";

import {
  PRIMAL_ANDROID_URL,
  PRIMAL_DOWNLOAD_URL,
  PRIMAL_IOS_URL,
} from "@/lib/constants";
import { useI18n } from "@/i18n/context";

type Props = {
  variant?: "compact" | "card";
};

export function PrimalDownloadLinks({ variant = "compact" }: Props) {
  const { t } = useI18n();

  const links = (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={PRIMAL_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
      >
        {t("primal.downloads")}
      </a>
      <a
        href={PRIMAL_IOS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
      >
        {t("primal.ios")}
      </a>
      <a
        href={PRIMAL_ANDROID_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
      >
        {t("primal.android")}
      </a>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-dojo-mist/55">{t("primal.hint")}</p>
        {links}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-dojo-ink/40 p-4">
      <p className="text-sm font-medium text-white">{t("primal.title")}</p>
      <p className="mt-1 text-xs text-dojo-mist/55">{t("primal.hint")}</p>
      <div className="mt-3">{links}</div>
    </div>
  );
}
