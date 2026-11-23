"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

const BELT_RANKS = [
  "WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE",
  "BROWN", "BLACK", "RED_BLACK", "RED_WHITE", "RED",
];
const MEMBERSHIP_TIERS = ["NONE", "YOUTUBE", "GOLD", "ROYAL"];

type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  beltRank: string;
  stripes: number;
  isActive: boolean;
  membershipTier: string;
  membershipStatus: string;
  lastCheckIn: string | null;
  dojoName?: string;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  beltRank: string;
  stripes: number;
  membershipTier: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  beltRank: "WHITE",
  stripes: 0,
  membershipTier: "NONE",
  isActive: true,
};

export function StudentManager({
  dojoId,
  superadminKey,
}: {
  dojoId?: string;
  superadminKey?: string;
}) {
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const headers: Record<string, string> = superadminKey
    ? { "x-superadmin-key": superadminKey, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = superadminKey && dojoId ? `/api/students?dojoId=${dojoId}` : "/api/students";
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      setStudents(data.students || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dojoId, superadminKey]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(s: Student) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      beltRank: s.beltRank,
      stripes: s.stripes,
      membershipTier: s.membershipTier,
      isActive: s.isActive,
    });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (superadminKey && dojoId) payload.dojoId = dojoId;
      const res = editingId
        ? await fetch(`/api/students/${editingId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
          })
        : await fetch("/api/students", {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Student) {
    const confirmed = window.confirm(
      t("admin.students.confirmDelete", { name: s.name }) ||
        `Delete ${s.name}? This also removes their check-ins, journal and progress. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/students/${s.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="card-title">{t("admin.students.manageTitle") || "Manage Students"}</h3>
        <button onClick={startAdd} className="btn-primary !text-xs !px-3 !py-2 !w-auto">
          + {t("admin.students.add") || "Add Student"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <div className="border border-border rounded-lg p-4 mb-4 space-y-3">
          <p className="font-medium text-sm">
            {editingId
              ? t("admin.students.editTitle") || "Edit Student"
              : t("admin.students.addTitle") || "New Student"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="ui-input"
              placeholder={t("admin.students.name") || "Name *"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="ui-input"
              placeholder={t("admin.students.email") || "Email"}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="ui-input"
              placeholder={t("admin.students.phone") || "Phone"}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className="ui-input"
              value={form.beltRank}
              onChange={(e) => setForm({ ...form, beltRank: e.target.value })}
            >
              {BELT_RANKS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              className="ui-input"
              type="number"
              min={0}
              max={10}
              placeholder={t("admin.students.stripes") || "Stripes"}
              value={form.stripes}
              onChange={(e) => setForm({ ...form, stripes: parseInt(e.target.value || "0", 10) })}
            />
            <select
              className="ui-input"
              value={form.membershipTier}
              onChange={(e) => setForm({ ...form, membershipTier: e.target.value })}
            >
              {MEMBERSHIP_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            {t("admin.students.active") || "Active"}
          </label>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="btn-primary !text-xs !px-3 !py-2 !w-auto"
            >
              {saving ? "…" : t("admin.students.save") || "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="btn-secondary !text-xs !px-3 !py-2 !w-auto"
            >
              {t("admin.students.cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading") || "Loading…"}</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("admin.students.empty") || "No students yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2">{t("admin.table.name") || "Name"}</th>
                <th className="pb-2">{t("admin.students.contact") || "Contact"}</th>
                <th className="pb-2">{t("admin.students.belt") || "Belt"}</th>
                <th className="pb-2">{t("admin.table.tier") || "Tier"}</th>
                <th className="pb-2">{t("admin.students.status") || "Status"}</th>
                <th className="pb-2">{t("admin.table.lastCheckIn") || "Last check-in"}</th>
                <th className="pb-2 text-right">{t("admin.students.actions") || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-muted-foreground">
                    {s.email || "—"}
                    {s.phone ? <span className="block text-xs">{s.phone}</span> : null}
                  </td>
                  <td className="py-2">
                    {s.beltRank.replace(/_/g, " ")}
                    {s.stripes > 0 ? ` · ${s.stripes}` : ""}
                  </td>
                  <td className="py-2">{s.membershipTier}</td>
                  <td className="py-2">
                    <span className={s.isActive ? "text-green-400" : "text-muted-foreground"}>
                      {s.isActive
                        ? t("admin.students.active") || "Active"
                        : t("admin.students.inactive") || "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {s.lastCheckIn ? new Date(s.lastCheckIn).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(s)}
                      className="btn-secondary !text-xs !px-2 !py-1 !w-auto mr-2"
                    >
                      {t("admin.students.edit") || "Edit"}
                    </button>
                    <button
                      onClick={() => remove(s)}
                      disabled={deletingId === s.id}
                      className="btn-secondary !text-xs !px-2 !py-1 !w-auto !text-red-400"
                    >
                      {deletingId === s.id ? "…" : t("admin.students.delete") || "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
