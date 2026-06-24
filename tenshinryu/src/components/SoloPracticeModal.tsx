"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import { FlameIcon, LocationIcon, CheckIcon, SpinnerIcon, MicrophoneIcon, CalendarIcon } from "@/components/icons";
import { PracticeTimer } from "./PracticeTimer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface SoloPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  studentId: string;
  editingLog?: any;
}

const PRACTICE_TYPES = [
  { id: "kihon", emoji: "⚔️" },
  { id: "kata", emoji: "🥋" },
  { id: "sparring", emoji: "🤼" },
  { id: "meditation", emoji: "🧘" },
  { id: "fitness", emoji: "💪" },
  { id: "weapons", emoji: "⚔️" },
  { id: "footwork", emoji: "👣" },
  { id: "other", emoji: "📋" },
];

const INTENSITIES = [
  { id: "light", color: "#4ade80" },
  { id: "medium", color: "#facc15" },
  { id: "hard", color: "#f87171" },
];

const MOODS = [
  { id: "great", emoji: "😄" },
  { id: "good", emoji: "🙂" },
  { id: "neutral", emoji: "😐" },
  { id: "tired", emoji: "😴" },
  { id: "exhausted", emoji: "😫" },
];

export function SoloPracticeModal({
  isOpen,
  onClose,
  onSave,
  studentId,
  editingLog,
}: SoloPracticeModalProps) {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState({
    practiceDate: new Date(),
    durationMinutes: 30,
    practiceType: "kihon",
    location: "",
    intensity: "medium",
    notes: "",
    mood: "neutral",
    energyLevel: 5,
    tags: [] as string[],
    photos: [] as string[],
  });

  const [tagInput, setTagInput] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLog) {
      setFormData({
        practiceDate: editingLog.date ? new Date(editingLog.date) : new Date(),
        durationMinutes: editingLog.durationMinutes,
        practiceType: editingLog.practiceType,
        location: editingLog.location || "",
        intensity: editingLog.intensity || "medium",
        notes: editingLog.notes || "",
        mood: editingLog.mood || "neutral",
        energyLevel: editingLog.energyLevel || 5,
        tags: editingLog.tags || [],
        photos: editingLog.photos || [],
      });
      setPhotoPreviewUrls(editingLog.photos || []);
    }
  }, [editingLog]);

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

  const uploadVoiceNote = async (): Promise<string | null> => {
    if (!voiceNoteBlob) return null;

    const formData = new FormData();
    formData.append("audio", voiceNoteBlob, "voice-note.webm");
    formData.append("studentId", studentId);
    formData.append("type", "practice");

    const res = await fetch("/api/upload/voice", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.voiceNoteUrl;
  };

  // Photo upload functions
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_PHOTOS = 3;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check total photos
    if (photoFiles.length + files.length > MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    // Validate sizes
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_PHOTO_SIZE) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image.`);
        continue;
      }
      validFiles.push(file);
    }

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    setPhotoFiles([...photoFiles, ...validFiles]);
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    // Revoke object URL to prevent memory leak
    if (photoPreviewUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrls[index]);
    }
    
    setPhotoFiles(photoFiles.filter((_, i) => i !== index));
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("studentId", studentId);
      formData.append("type", "practice");

      const res = await fetch("/api/upload/photo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        urls.push(data.photoUrl);
      }
    }
    
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let voiceNoteUrl = null;
      if (voiceNoteBlob) {
        voiceNoteUrl = await uploadVoiceNote();
      }

      // Upload photos if any
      let photoUrls = formData.photos;
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        const uploadedUrls = await uploadPhotos();
        photoUrls = [...photoUrls, ...uploadedUrls];
        setUploadingPhotos(false);
      }

      const payload = {
        ...formData,
        studentId,
        voiceNoteUrl,
        photos: photoUrls,
      };

      const url = editingLog ? "/api/solo-practice" : "/api/solo-practice";
      const method = editingLog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLog ? { ...payload, id: editingLog.id } : payload),
      });

      if (res.ok) {
        onSave(await res.json());
        onClose();
        setFormData({
          practiceDate: new Date(),
          durationMinutes: 30,
          practiceType: "kihon",
          location: "",
          intensity: "medium",
          notes: "",
          mood: "neutral",
          energyLevel: 5,
          tags: [],
          photos: [],
        });
        setVoiceNoteBlob(null);
        setPhotoFiles([]);
        setPhotoPreviewUrls([]);
      }
    } catch (err) {
      console.error("Failed to save practice:", err);
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
              <FlameIcon className="w-6 h-6" />
              {editingLog ? t("student.solo.editTitle") : t("student.solo.title")}
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Practice Timer */}
            {!editingLog && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                  ⏱️ {t("student.solo.timer")}
                </label>
                <PracticeTimer
                  onDurationUpdate={(minutes) =>
                    setFormData((prev) => ({ ...prev, durationMinutes: minutes }))
                  }
                  voiceEnabled={true}
                />
              </div>
            )}

            {/* Practice Date & Time */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                <CalendarIcon size={16} />
                {t("student.solo.practiceDate")}
              </label>
              <DatePicker
                selected={formData.practiceDate}
                onChange={(date) => date && setFormData({ ...formData, practiceDate: date })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                maxDate={new Date()}
                className="w-full p-3 bg-surface border border-surface-border rounded-lg text-text"
                wrapperClassName="w-full"
              />
            </div>

            {/* Practice Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.solo.practiceType")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRACTICE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, practiceType: type.id })}
                    className={`p-3 rounded-lg border text-left transition ${
                      formData.practiceType === type.id
                        ? "border-primary bg-primary/10"
                        : "border-surface-border hover:border-primary/50"
                    }`}
                  >
                    <span className="mr-2">{type.emoji}</span>
                    {t(`student.solo.types.${type.id}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Duration: {formData.durationMinutes} minutes
                {!editingLog && (
                  <span className="text-xs font-normal ml-2 text-text-secondary/60">
                    (auto-updated from timer)
                  </span>
                )}
              </label>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>5 min</span>
                <span>180 min</span>
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Intensity
              </label>
              <div className="flex gap-2">
                {INTENSITIES.map((int) => (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, intensity: int.id })}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      formData.intensity === int.id
                        ? "border-primary bg-primary/10"
                        : "border-surface-border"
                    }`}
                    style={{
                      borderColor: formData.intensity === int.id ? int.color : undefined,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: int.color }}
                    />
                    {int.label && t(`student.solo.intensities.${int.id}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood & Energy */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t("student.solo.mood")}
                </label>
                <select
                  value={formData.mood}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  className="w-full p-2 bg-surface border border-surface-border rounded-lg text-text"
                >
                  {MOODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {t(`student.solo.moods.${m.id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t("student.solo.energyLevel")}: {formData.energyLevel}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.energyLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, energyLevel: parseInt(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.solo.location")}
              </label>
              <div className="relative">
                <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={t("student.solo.locationPlaceholder")}
                  className="w-full pl-10 p-3 bg-surface border border-surface-border rounded-lg text-text placeholder:text-text-secondary/50"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.solo.notes")}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("student.solo.notesPlaceholder")}
                rows={3}
                className="w-full p-3 bg-surface border border-surface-border rounded-lg text-text placeholder:text-text-secondary/50 resize-none"
              />
            </div>

            {/* Voice Note */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.solo.voiceNote")}
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
                  {recording ? t("student.solo.stopRecording") : voiceNoteBlob ? t("student.solo.recordVoice") : t("student.solo.recordVoice")}
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
                  {t("student.solo.recording")}
                </p>
              )}
            </div>

            {/* Photos - Proof of Practice */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                📸 {t("student.solo.photos")}
                <span className="text-xs font-normal text-text-secondary/60">
                  {t("student.solo.photoLimit")}
                </span>
              </label>
              
              {/* Photo Previews */}
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-surface-border">
                      <img
                        src={url}
                        alt={`Practice photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              {photoPreviewUrls.length < MAX_PHOTOS && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-border rounded-lg hover:border-primary/50 transition w-full justify-center"
                  >
                    📷 {t("student.solo.addPhotos")}
                  </button>
                  <p className="text-xs text-text-secondary/60 text-center mt-1">
                    {t("student.solo.photoLimit")}
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("student.solo.tags")}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder={t("student.solo.tagsPlaceholder")}
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

            {/* Submit */}
            <div className="pt-4 border-t border-surface-border">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                    {t("student.solo.saving")}
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    {editingLog ? t("student.solo.save") : t("student.solo.save")}
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
