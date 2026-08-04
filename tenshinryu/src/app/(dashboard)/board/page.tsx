"use client";

import { useCallback, useEffect, useState } from "react";
import { CommunityShell } from "@/components/community/CommunityShell";
import { BreakingNewsBanner } from "@/components/community/BreakingNewsBanner";
import { useI18n } from "@/components/I18nProvider";

type Reply = {
  id: string;
  body: string;
  authorName: string;
  authorRole: string;
  isStaffReply: boolean;
  createdAt: string;
};

type Post = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  isHidden?: boolean;
  createdAt: string;
  replyCount: number;
  previewReplies?: Reply[];
};

export default function BoardPage() {
  const { t, locale } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ post: Post & { replies: Reply[] } } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bulletin");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPosts(data.posts || []);
      setCanModerate(!!data.canModerate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulletin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setThread(null);
      return;
    }
    setExpandedId(id);
    setReplyText("");
    const res = await fetch(`/api/bulletin/${id}`);
    const data = await res.json();
    if (res.ok) setThread(data);
  };

  const submitReply = async (postId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/bulletin/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReplyText("");
      await openThread(postId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reply");
    } finally {
      setReplying(false);
    }
  };

  const moderate = async (id: string, patch: { isPinned?: boolean; isHidden?: boolean }) => {
    const res = await fetch(`/api/bulletin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <CommunityShell title={t("community.board.title")} subtitle={t("community.board.subtitle")}>
      <BreakingNewsBanner />

      <form onSubmit={submitQuestion} className="dashboard-card mb-6 space-y-3">
        <h2 className="font-heading font-semibold text-foreground">{t("community.board.ask")}</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("community.board.questionTitle")}
          className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
          maxLength={200}
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("community.board.questionBody")}
          className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none min-h-[100px]"
          maxLength={5000}
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? t("community.board.posting") : t("community.board.post")}
        </button>
      </form>

      {error && <div className="alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">{t("community.board.empty")}</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`p-4 rounded-lg border bg-surface/80 ${
                post.isPinned ? "border-crimson/50" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => openThread(post.id)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.isPinned && (
                      <span className="text-xs font-medium text-crimson bg-primary-container px-2 py-0.5 rounded">
                        {t("community.board.pinned")}
                      </span>
                    )}
                    <h3 className="font-semibold text-foreground">{post.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {post.authorName} · {formatDate(post.createdAt)} · {post.replyCount}{" "}
                    {t("community.board.replies")}
                  </p>
                </button>
                {canModerate && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moderate(post.id, { isPinned: !post.isPinned })}
                      className="text-xs text-crimson hover:underline"
                    >
                      {post.isPinned ? t("community.board.unpin") : t("community.board.pin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => moderate(post.id, { isHidden: true })}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("community.board.hide")}
                    </button>
                  </div>
                )}
              </div>

              {expandedId === post.id && thread?.post?.id === post.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{thread.post.body}</p>
                  {thread.post.replies.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3 rounded-lg text-sm ${
                        r.isStaffReply
                          ? "bg-primary-container/40 border border-crimson/30"
                          : "bg-background border border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{r.authorName}</span>
                        {r.isStaffReply && (
                          <span className="text-xs text-crimson font-medium">
                            {t("community.board.staffReply")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t("community.board.replyPlaceholder")}
                      className="flex-1 px-3 py-2 bg-background rounded-lg border border-border focus:border-crimson focus:outline-none text-sm min-h-[60px]"
                    />
                    <button
                      type="button"
                      disabled={replying || !replyText.trim()}
                      onClick={() => submitReply(post.id)}
                      className="btn-primary self-end disabled:opacity-50"
                    >
                      {t("community.board.reply")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CommunityShell>
  );
}
