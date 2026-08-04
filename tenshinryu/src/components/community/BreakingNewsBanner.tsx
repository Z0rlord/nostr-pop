"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

type NewsItem = {
  id: string;
  title: string;
  body: string;
  isBreaking: boolean;
  publishedAt: string;
};

export function BreakingNewsBanner() {
  const { t } = useI18n();
  const [item, setItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetch("/api/news?breaking=1&limit=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const first = data?.items?.[0];
        if (first?.isBreaking) setItem(first);
      })
      .catch(() => {});
  }, []);

  if (!item) return null;

  return (
    <div className="breaking-banner" role="status">
      <div className="breaking-banner-inner">
        <span className="breaking-badge">{t("community.news.breaking")}</span>
        <Link href="/news" className="breaking-link">
          <strong>{item.title}</strong>
          <span className="breaking-body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</span>
        </Link>
      </div>
    </div>
  );
}
