"use client";

import { useCallback, useEffect, useState } from "react";
import { CommunityShell } from "@/components/community/CommunityShell";
import { BreakingNewsBanner } from "@/components/community/BreakingNewsBanner";
import { useI18n } from "@/components/I18nProvider";

type ClassItem = {
  id: string;
  name: string;
  schedule: string;
  location: string | null;
  mode: "PHYSICAL" | "ONLINE";
  meetingUrl: string | null;
  instructorName: string;
  isRecurring?: boolean;
  maxStudents?: number;
};

const emptyForm = {
  name: "",
  schedule: "",
  location: "",
  meetingUrl: "",
  mode: "PHYSICAL" as "PHYSICAL" | "ONLINE",
  isRecurring: true,
};

export default function SchedulePage() {
  const { t } = useI18n();
  const [physical, setPhysical] = useState<ClassItem[]>([]);
  const [online, setOnline] = useState<ClassItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPhysical(data.physical || []);
      setOnline(data.online || []);
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

  const startEdit = (c: ClassItem) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      schedule: c.schedule,
      location: c.location || "",
      meetingUrl: c.meetingUrl || "",
      mode: c.mode,
      isRecurring: !!c.isRecurring,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        schedule: form.schedule.trim(),
        location: form.location.trim() || null,
        meetingUrl: form.meetingUrl.trim() || null,
        mode: form.mode,
        isRecurring: form.isRecurring,
      };
      const res = await fetch("/api/schedule", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("community.schedule.confirmDelete"))) return;
    const res = await fetch(`/api/schedule?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const ClassList = ({ items, mode }: { items: ClassItem[]; mode: "PHYSICAL" | "ONLINE" }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="empty-state text-sm">{t("community.schedule.empty")}</div>
      ) : (
        items.map((c) => (
          <div key={c.id} className="p-4 rounded-lg border border-border bg-surface/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      mode === "ONLINE"
                        ? "bg-blue-950/40 text-blue-300 border border-blue-800/40"
                        : "bg-primary-container text-crimson"
                    }`}
                  >
                    {mode === "ONLINE"
                      ? t("community.schedule.online")
                      : t("community.schedule.physical")}
                  </span>
                  <h3 className="font-semibold text-foreground">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{c.schedule}</p>
                {c.location && <p className="text-xs text-muted-foreground mt-1">{c.location}</p>}
                {c.meetingUrl && (
                  <a
                    href={c.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-crimson hover:underline mt-1 inline-block"
                  >
                    {t("community.schedule.joinLink")} →
                  </a>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {t("community.schedule.instructor")}: {c.instructorName}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(c)} className="text-xs text-crimson hover:underline">
                    {t("common.edit")}
                  </button>
                  <button type="button" onClick={() => remove(c.id)} className="text-xs text-muted-foreground hover:underline">
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <CommunityShell
      title={t("community.schedule.title")}
      subtitle={t("community.schedule.subtitle")}
      actions={
        canManage ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            {t("community.schedule.add")}
          </button>
        ) : undefined
      }
    >
      <BreakingNewsBanner />

      {error && <div className="alert-error mb-4">{error}</div>}

      {showForm && canManage && (
        <form onSubmit={save} className="dashboard-card mb-6 space-y-3">
          <h2 className="font-heading font-semibold">
            {editingId ? t("community.schedule.edit") : t("community.schedule.add")}
          </h2>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("community.schedule.namePlaceholder")}
            className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
          />
          <input
            required
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder={t("community.schedule.schedulePlaceholder")}
            className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={form.mode === "PHYSICAL"}
                onChange={() => setForm({ ...form, mode: "PHYSICAL" })}
              />
              {t("community.schedule.physical")}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={form.mode === "ONLINE"}
                onChange={() => setForm({ ...form, mode: "ONLINE" })}
              />
              {t("community.schedule.online")}
            </label>
          </div>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={
              form.mode === "ONLINE"
                ? t("community.schedule.locationOnline")
                : t("community.schedule.locationPhysical")
            }
            className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
          />
          {form.mode === "ONLINE" && (
            <input
              value={form.meetingUrl}
              onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
              placeholder={t("community.schedule.urlPlaceholder")}
              className="w-full px-4 py-3 bg-surface rounded-lg border border-border focus:border-crimson focus:outline-none"
            />
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            />
            {t("community.schedule.recurring")}
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? t("community.schedule.saving") : t("common.save")}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
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
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-heading font-semibold text-lg mb-3">{t("community.schedule.physicalSection")}</h2>
            <ClassList items={physical} mode="PHYSICAL" />
          </section>
          <section>
            <h2 className="font-heading font-semibold text-lg mb-3">{t("community.schedule.onlineSection")}</h2>
            <ClassList items={online} mode="ONLINE" />
          </section>
        </div>
      )}
    </CommunityShell>
  );
}
