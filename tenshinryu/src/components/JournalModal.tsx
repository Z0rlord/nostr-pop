"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import { CheckIcon, SpinnerIcon, MicrophoneIcon } from "@/components/icons";

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  studentId: string;
  editingEntry?: any;
}

const ENTRY_TYPES = [
  { id: "general", icon: "📝" },
  { id: "class_notes", icon: "🥋" },
  { id: "technique_reflection", icon: "⚔️" },
  { id: "goal", icon: "🎯" },
  { id: "insight", icon: "💡" },
];

export function JournalModal({
  isOpen,
  onClose,
  onSave,
  studentId,
  editingEntry,
}: JournalModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    entryType: "general",
    isPrivate: true,
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        title: editingEntry.title || "",
        content: editingEntry.content || "",
        entryType: editingEntry.entryType || "general",
        isPrivate: editingEntry.isPrivate !== false,
        tags: editingEntry.tags || [],
      });
    }
  }, [editingEntry]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceNoteBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadVoiceNote = async (): Promise<{ url: string; duration?: number } | null> => {
    if (!voiceNoteBlob) return null;

    const formData = new FormData();
    formData.append("audio", voiceNoteBlob, "journal-voice.webm");
    formData.append("studentId", studentId);
    formData.append("type", "journal");

    const res = await fetch("/api/upload/voice", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { url: data.voiceNoteUrl, duration: undefined };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setLoading(true);
    setError("");

    try {
      let voiceNoteData = null;
      if (voiceNoteBlob) {
        voiceNoteData = await uploadVoiceNote();
      }

      const payload = {
        ...formData,
        studentId,
        voiceNoteUrl: voiceNoteData?.url,
        voiceNoteDuration: voiceNoteData?.duration,
      };

      const url = "/api/journal";
      const method = editingEntry ? "PUT" : "POST";

      console.log("[Journal] Saving entry:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEntry ? { ...payload, id: editingEntry.id } : payload),
      });

      const data = await res.json();
      console.log("[Journal] Response:", data);

      if (res.ok && data.success) {
        onSave(data);
        onClose();
        setFormData({
          title: "",
          content: "",
          entryType: "general",
          isPrivate: true,
          tags: [],
        });
        setVoiceNoteBlob(null);
      } else {
        setError(data.error || "Failed to save entry");
      }
    } catch (err: any) {
      console.error("[Journal] Failed to save journal entry:", err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              📝 {editingEntry ? t("student.journal.editTitle") : t("student.journal.title")}
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.journal.entryType")}
              </label>
              <div className="flex flex-wrap gap-2">
                {ENTRY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, entryType: type.id })}
                    className={`px-3 py-2 rounded-lg border text-sm transition ${
                      formData.entryType === type.id
                        ? "border-primary bg-primary/10"
                        : "border-surface-border hover:border-primary/50"
                    }`}
                  >
                    <span className="mr-1">{type.icon}</span>
                    {t(`student.journal.types.${type.id}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.journal.titleLabel")}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("student.journal.titlePlaceholder")}
                className="w-full p-3 bg-surface border border-surface-border rounded-lg text-text placeholder:text-text-secondary/50"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.journal.content")}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t("student.journal.contentPlaceholder")}
                rows={6}
                className="w-full p-3 bg-surface border border-surface-border rounded-lg text-text placeholder:text-text-secondary/50 resize-none"
                required
              />
            </div>

            {/* Voice Note */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.journal.voiceNote")}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    recording
                      ? "bg-red-500/20 text-red-400 animate-pulse"
                      : "bg-surface border border-surface-border hover:border-primary/50"
                  }`}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                  {recording ? t("student.journal.stopRecording") : voiceNoteBlob ? t("student.journal.recordVoice") : t("student.journal.recordVoice")}
                </button>
                {voiceNoteBlob && (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" />
                    {t("student.checkIn.success")}
                  </span>
                )}
              </div>
              {recording && (
                <p className="text-xs text-text-secondary mt-2">
                  {t("student.journal.recording")}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.journal.tags")}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder={t("student.journal.tagsPlaceholder")}
                  className="flex-1 p-2 bg-surface border border-surface-border rounded-lg text-text placeholder:text-text-secondary/50"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-surface border border-surface-border rounded-lg hover:border-primary/50"
                >
                  {t("common.add")}
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="isPrivate" className="text-sm text-text-secondary">
                {t("student.journal.isPrivateDesc")}
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t border-surface-border">
              <button
                type="submit"
                disabled={loading || !formData.content.trim()}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                    {t("student.journal.saving")}
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    {editingEntry ? t("student.journal.save") : t("student.journal.save")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
