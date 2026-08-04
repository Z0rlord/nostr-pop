"use client";

import { useCallback, useEffect, useState } from "react";
import { CommunityShell } from "@/components/community/CommunityShell";
import { BreakingNewsBanner } from "@/components/community/BreakingNewsBanner";
import { useI18n } from "@/components/I18nProvider";

type NewsItem = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  isBreaking: boolean;
  publishedAt: string;
  expiresAt: string | null;
  isHidden?: boolean;
};

export default function NewsPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isBreaking, setIsBreaking] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setItems(data.items || []);
      setCanManage(!!data.canManage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          isBreaking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTitle("");
      setBody("");
      setIsBreaking(false);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const toggleBreaking = async (item: NewsItem) => {
    await fetch("/api/news", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isBreaking: !item.isBreaking }),
    });
    await load();
  };

  const hide = async (id: string) => {
    await fetch("/api/news", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isHidden: true }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("community.news.confirmDelete"))) return;
    await fetch(`/api/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <CommunityShell
      title={t("community.news.title")}
      subtitle={t("community.news.subtitle")}
      actions={
        canManage ? (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            {t("community.news.publish")}
          </button>
        ) : undefined
      }
    >
      <BreakingNewsBanner />

      {error && <div className="alert-error mb-4">{error}</div>}

      {showForm && canManage && (
        <form onSubmit={publish} className="dashboard-card mb-6 space-y-3">
          <h2 className="font-heading font-semibold">{t("community.news.publish")}</h2>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("community.news.titlePlaceholder")}
            className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
            maxLength={200}
          />
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("community.news.bodyPlaceholder")}
            className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none min-h-[120px]"
            maxLength={10000}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} />
            {t("community.news.markBreaking")}
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? t("community.news.publishing") : t("community.news.publish")}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setShowForm(false)}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">{t("community.news.empty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`p-4 rounded-lg border bg-surface/80 ${
                item.isBreaking ? "border-crimson/60" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.isBreaking && (
                      <span className="text-xs font-medium text-crimson bg-primary-container px-2 py-0.5 rounded">
                        {t("community.news.breaking")}
                      </span>
                    )}
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {item.authorName} · {formatDate(item.publishedAt)}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleBreaking(item)}
                      className="text-xs text-crimson hover:underline"
                    >
                      {item.isBreaking
                        ? t("community.news.clearBreaking")
                        : t("community.news.markBreaking")}
                    </button>
                    <button
                      type="button"
                      onClick={() => hide(item.id)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("community.news.hide")}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </CommunityShell>
  );
}
