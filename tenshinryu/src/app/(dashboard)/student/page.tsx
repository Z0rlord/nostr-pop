"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import VoiceAI from "@/components/VoiceAI";
import { WorkShell } from "@/components/work/WorkShell";
import { PageLoading } from "@/components/ui/PageLoading";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { formatBeltRank } from "@/lib/utils";
import { useI18n } from "@/components/I18nProvider";
import { AwardIcon } from "lucide-react";
import { SoloPracticeModal } from "@/components/SoloPracticeModal";
import { JournalModal } from "@/components/JournalModal";
import PracticeHeatmap from "@/components/PracticeHeatmap";
import { AIInsights } from "@/components/AIInsights";
import BadgesView from "@/components/BadgesView";
import { 
  CameraIcon, 
  CheckIcon, 
  SpinnerIcon,
  LocationIcon,
  FlameIcon,
  VideoIcon,
  ComputerIcon,
  BeltIcon,
  LogoutIcon,
  CrownIcon,
  BellIcon,
  FilmIcon,
  BookIcon,
  TargetIcon,
  MicrophoneIcon,
  GlobeIcon,
  CalendarIcon,
  SparklesIcon,

} from "@/components/icons";

// Toggle this to enable/disable Voice AI feature
const VOICE_AI_ENABLED = true;

// Social media and resource links
const RESOURCES = {
  youtube: {
    main: "https://www.youtube.com/@tenshinryu",
    subscribe: "https://www.youtube.com/user/tenshinryuhyouho",
    membership: "https://www.youtube.com/channel/UCXPuOeySFeoYG7wrJROThBg/join",
    playlists: {
      techniques: "https://www.youtube.com/playlist?list=PLZNAC659qG4fDgm1Ky7w-hQDbOhUP6NAE",
      enbu: "https://www.youtube.com/playlist?list=PLZNAC659qG4c_xCuCHibIyK_jPVGlKIZz",
    }
  },
  website: "https://international.tenshinryu.net",
  social: {
    instagram: "https://www.instagram.com/tenshinryu/",
    facebook: "https://www.facebook.com/Tenshinryuhyohoenglish/",
    twitter: "https://twitter.com/TENSHINRYUeng",
    tumblr: "http://tenshinryu.tumblr.com",
  },
  online: {
    royal: {
      url: "https://international.tenshinryu.net/tenshinryu-online",
      price: "$85/month"
    },
    gold: {
      url: "https://international.tenshinryu.net/tenshinryu-online",
      price: "$35/month"
    }
  }
};

type WorkSection = "today" | "practice" | "progress" | "learn";
type TabId = "overview" | "history" | "resources" | "solo" | "journal" | "heatmap" | "insights" | "badges";

const PRACTICE_TABS: TabId[] = ["solo", "journal"];
const PROGRESS_TABS: TabId[] = ["badges", "heatmap", "history", "insights"];

function sectionForTab(tab: TabId): WorkSection {
  if (PRACTICE_TABS.includes(tab)) return "practice";
  if (PROGRESS_TABS.includes(tab)) return "progress";
  if (tab === "resources") return "learn";
  return "today";
}

function defaultTabForSection(section: WorkSection): TabId {
  switch (section) {
    case "practice":
      return "solo";
    case "progress":
      return "badges";
    case "learn":
      return "resources";
    default:
      return "overview";
  }
}

function StudentDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User state from auth
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Smart check-in state
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<"idle" | "finding" | "found" | "success" | "error">("idle");
  const [currentClass, setCurrentClass] = useState<any>(null);
  const [checkInMessage, setCheckInMessage] = useState("");
  
  // Solo Practice state
  const [soloLogs, setSoloLogs] = useState<any[]>([]);
  const [soloStats, setSoloStats] = useState({ totalSessions: 0, totalMinutes: 0, averageIntensity: 0, streakDays: 0 });
  const [showSoloModal, setShowSoloModal] = useState(false);
  const [editingSoloLog, setEditingSoloLog] = useState<any>(null);
  
  // Journal state
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<any>(null);
  
  // Global Heatmap state
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [heatmapStats, setHeatmapStats] = useState({ totalLocations: 0, totalSessions: 0, totalMinutes: 0 });
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  
  const [beltRank, setBeltRank] = useState("White Belt");
  const [stripes, setStripes] = useState(0);
  const [role, setRole] = useState("student");

  const section = (searchParams.get("section") as WorkSection | null) || "today";
  const validSection =
    section === "practice" || section === "progress" || section === "learn"
      ? section
      : "today";

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId | null;
    if (tabParam && ["overview", "history", "resources", "solo", "journal", "heatmap", "insights", "badges"].includes(tabParam)) {
      setActiveTab(tabParam);
      return;
    }
    setActiveTab(defaultTabForSection(validSection));
  }, [searchParams, validSection]);

  const setSubTab = (tab: TabId) => {
    setActiveTab(tab);
    const sec = sectionForTab(tab);
    const params = new URLSearchParams();
    if (sec !== "today") params.set("section", sec);
    if (tab !== defaultTabForSection(sec)) params.set("tab", tab);
    const q = params.toString();
    router.replace(q ? `/student?${q}` : "/student", { scroll: false });
  };

  const pageTitle =
    validSection === "today"
      ? "Today"
      : validSection === "practice"
        ? "Practice"
        : validSection === "progress"
          ? "Progress"
          : "Learn";

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.userId) {
          setStudentId(data.userId);
          setStudentName(data.name || data.email || "Student");
          if (data.beltRank) setBeltRank(formatBeltRank(data.beltRank));
          if (data.stripes != null) setStripes(data.stripes);
          if (data.avatar) setAvatar(data.avatar);
          if (data.role) setRole(data.role);
        }
      })
      .catch(err => console.error("Failed to get user info:", err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch solo practice logs when studentId changes or solo tab is active
  useEffect(() => {
    if (!studentId) return;
    
    fetch(`/api/solo-practice?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.logs) setSoloLogs(data.logs);
        if (data.stats) setSoloStats(data.stats);
      })
      .catch(err => console.error("Failed to fetch solo practice logs:", err));
  }, [studentId]);

  // Fetch journal entries when studentId changes or journal tab is active
  useEffect(() => {
    if (!studentId) return;
    
    fetch(`/api/journal?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.entries) setJournalEntries(data.entries);
      })
      .catch(err => console.error("Failed to fetch journal entries:", err));
  }, [studentId]);

  // Fetch upcoming classes
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  
  useEffect(() => {
    setLoadingClasses(true);
    fetch("/api/classes?upcoming=true&limit=5")
      .then(res => res.json())
      .then(data => {
        console.log("[Upcoming Classes] API response:", data);
        if (data.classes) {
          setUpcomingClasses(data.classes);
          console.log("[Upcoming Classes] Set classes:", data.classes.length);
        } else {
          console.log("[Upcoming Classes] No classes array in response");
        }
      })
      .catch(err => console.error("[Upcoming Classes] Failed to fetch:", err))
      .finally(() => setLoadingClasses(false));
  }, []);

  // Fetch global heatmap data when heatmap tab is active
  useEffect(() => {
    if (activeTab !== "heatmap") return;
    
    setLoadingHeatmap(true);
    fetch("/api/solo-practice/heatmap?days=30")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHeatmapData(data.data);
          setHeatmapStats({
            totalLocations: data.totalLocations,
            totalSessions: data.totalSessions,
            totalMinutes: data.totalMinutes,
          });
        }
      })
      .catch(err => console.error("Failed to fetch heatmap data:", err))
      .finally(() => setLoadingHeatmap(false));
  }, [activeTab]);

  const handleSmartCheckIn = async () => {
    setCheckingIn(true);
    setCheckInStatus("finding");
    setCheckInMessage(t("student.checkIn.finding"));

    try {
      // Get current location
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (locError) {
          console.log("Location not available, continuing without it");
        }
      }

      // Find current class
      const response = await fetch("/api/classes/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location || {}),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckInStatus("error");
        setCheckInMessage(data.error || t("student.checkIn.noClassFound"));
        setCheckingIn(false);
        return;
      }

      setCurrentClass(data.class);
      setCheckInStatus("found");
      setCheckInMessage(`${t("student.checkIn.found")}: ${data.class.name}`);

      // Perform check-in
      const checkInResponse = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId: data.class.id,
          method: "auto",
          location: location,
        }),
      });

      const checkInData = await checkInResponse.json();

      if (checkInResponse.ok) {
        setCheckInStatus("success");
        setCheckInMessage(`✓ ${t("student.checkIn.success")}: ${data.class.name}!`);
        // Refresh after 2 seconds
        setTimeout(() => {
          setCheckInStatus("idle");
          setCurrentClass(null);
        }, 3000);
      } else {
        setCheckInStatus("error");
        setCheckInMessage(checkInData.error || t("student.checkIn.failed"));
      }
    } catch (error) {
      console.error("Check-in error:", error);
      setCheckInStatus("error");
      setCheckInMessage(t("student.checkIn.error"));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[Avatar] No file selected");
      return;
    }

    console.log("[Avatar] File selected:", file.name, file.type, file.size);
    console.log("[Avatar] Current studentId:", studentId);

    if (!studentId) {
      console.log("[Avatar] No studentId available");
      setUploadError("User not loaded. Please refresh the page.");
      setTimeout(() => setUploadError(""), 5000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Max 5MB.");
      setTimeout(() => setUploadError(""), 3000);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      setTimeout(() => setUploadError(""), 3000);
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("avatar", file);

      console.log("[Avatar] Sending request to /api/student/avatar");
      console.log("[Avatar] FormData:", { studentId, fileName: file.name });
      
      const response = await fetch("/api/student/avatar", {
        method: "POST",
        body: formData,
      });

      console.log("[Avatar] Response status:", response.status);
      
      const data = await response.json();
      console.log("[Avatar] Response data:", data);
      
      if (response.ok && data.success) {
        console.log("[Avatar] Upload successful:", data.avatar);
        setAvatar(data.avatar);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        console.log("[Avatar] Upload failed:", data.error);
        setUploadError(data.error || `Upload failed (${response.status})`);
        setTimeout(() => setUploadError(""), 5000);
      }
    } catch (error: any) {
      console.error("[Avatar] Network error:", error);
      let errorMsg = "Upload failed: ";
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg += "Network error. Check connection or try disabling ad blockers.";
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += "Unknown error";
      }
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(""), 5000);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <PageLoading label="Loading your training…" />;
  }

  return (
    <WorkShell title={pageTitle}>
      <div className="dashboard-page">
        {validSection === "today" && (
          <div className="page-hero">
            <p className="page-hero-eyebrow">Today</p>
            <h1 className="page-hero-title">{studentName}</h1>
            <p className="page-hero-meta">
              {beltRank} · {stripes} {stripes === 1 ? t("student.stripe") : t("student.stripes")}
            </p>
          </div>
        )}

        {validSection === "practice" && (
          <nav className="sub-tab-nav" aria-label="Practice">
            {PRACTICE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSubTab(tab)}
                className={`sub-tab ${activeTab === tab ? "sub-tab-active" : ""}`}
              >
                {t(`student.tabs.${tab}`)}
              </button>
            ))}
          </nav>
        )}

        {validSection === "progress" && (
          <nav className="sub-tab-nav" aria-label="Progress">
            {PROGRESS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSubTab(tab)}
                className={`sub-tab ${activeTab === tab ? "sub-tab-active" : ""}`}
              >
                {t(`student.tabs.${tab}`)}
              </button>
            ))}
          </nav>
        )}

        {validSection === "today" && activeTab === "overview" && (
          <div className="space-y-4">
            {/* Check-in first — primary daily action */}
            <DashboardCard
              title={t("student.ready")}
              description={t("student.checkIn.description")}
            >
              {checkInStatus !== "idle" && (
                <div
                  className={`mb-4 ${
                    checkInStatus === "success"
                      ? "alert-success"
                      : checkInStatus === "error"
                        ? "alert-error"
                        : "alert-muted"
                  }`}
                >
                  <p className="text-sm font-medium">{checkInMessage}</p>
                  {currentClass && checkInStatus === "found" && currentClass.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentClass.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-crimson mt-1 inline-flex items-center gap-1 hover:underline"
                    >
                      <LocationIcon size={12} /> {currentClass.location} →
                    </a>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSmartCheckIn}
                disabled={checkingIn || checkInStatus === "success"}
                className="btn-primary w-full !tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <SpinnerIcon size={16} />
                    {checkInStatus === "finding" ? t("student.checkIn.finding") : t("student.checkIn.checkingIn")}
                  </span>
                ) : checkInStatus === "success" ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckIcon size={16} />
                    {t("student.checkIn.success")}!
                  </span>
                ) : (
                  t("student.checkIn.button")
                )}
              </button>
            </DashboardCard>

            <DashboardCard
              title={t("student.upcomingClasses.title")}
              action={
                <span className="text-xs font-medium text-crimson bg-primary-container px-3 py-1 rounded-full">
                  {t("student.upcomingClasses.next")}
                </span>
              }
            >
              {loadingClasses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : upcomingClasses.length > 0 ? (
                <div className="space-y-3">
                  {upcomingClasses.map((cls) => {
                    const scheduleText = cls.schedule || "TBD";
                    return (
                      <div
                        key={cls.id}
                        className="p-4 rounded-lg border border-border bg-surface/80"
                      >
                        <h3 className="font-semibold text-foreground">{cls.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mt-2">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={14} />
                            {scheduleText}
                          </span>
                          {cls.location && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cls.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-crimson hover:underline"
                            >
                              <LocationIcon size={14} />
                              {cls.location.length > 30 ? cls.location.substring(0, 30) + "..." : cls.location}
                            </a>
                          )}
                        </div>
                        {cls.instructorName && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("student.upcomingClasses.instructor")}: {cls.instructorName}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">{t("student.upcomingClasses.noClasses")}</div>
              )}
            </DashboardCard>

            <div className="grid grid-cols-2 gap-3">
              <div className="stat-tile">
                <p className="stat-tile-value">12</p>
                <p className="stat-tile-label">{t("student.checkIn.thisMonth")}</p>
              </div>
              <div className="stat-tile">
                <p className="stat-tile-value flex items-center justify-center gap-1">
                  5 <FlameIcon size={20} className="text-primary" />
                </p>
                <p className="stat-tile-label">{t("student.checkIn.streak")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/student?section=practice")}
                className="action-tile"
              >
                <p className="action-tile-title">Log practice</p>
                <p className="action-tile-desc">Solo session or journal</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/student?section=progress")}
                className="action-tile"
              >
                <p className="action-tile-title">View progress</p>
                <p className="action-tile-desc">Badges, heatmap, history</p>
              </button>
            </div>

            {VOICE_AI_ENABLED && <VoiceAI studentId={studentId} enabled={VOICE_AI_ENABLED} locale={locale} />}

            <DashboardCard
              title={t("student.videos.title")}
              description={t("student.videos.subtitle")}
              action={
                <button
                  type="button"
                  onClick={() => router.push("/student?section=learn")}
                  className="text-sm font-medium text-crimson hover:underline"
                >
                  {t("common.viewAll")} →
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={RESOURCES.youtube.main}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center p-4 rounded-lg border border-border bg-surface hover:border-crimson/40 transition-colors"
                >
                  <p className="text-sm font-semibold">YouTube</p>
                </a>
                <a
                  href={RESOURCES.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center p-4 rounded-lg border border-border bg-surface hover:border-crimson/40 transition-colors"
                >
                  <p className="text-sm font-semibold">Instagram</p>
                </a>
              </div>
            </DashboardCard>
          </div>
        )}

        {validSection === "progress" && activeTab === "history" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">{t("student.history.title")}</h2>
            {[
              { date: "2026-02-19", class: "Adult BJJ" },
              { date: "2026-02-17", class: "Adult BJJ" },
              { date: "2026-02-15", class: "Muay Thai" },
            ].map((checkIn, i) => (
              <div key={i} className="p-3 bg-surface rounded-xl flex justify-between border border-surface-border">
                <span className="text-foreground">{checkIn.class}</span>
                <span className="text-muted-foreground">{checkIn.date}</span>
              </div>
            ))}
          </div>
        )}

        {validSection === "learn" && activeTab === "resources" && (
          <div className="space-y-6">
            {/* About Tenshinryu */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BeltIcon size={24} className="text-primary" />
                {t("student.resources.about.title")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {t("student.resources.about.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                {["#侍", "#武士", "#古武道", "#古武術", "#日本刀", "#天心流", "#Samurai", "#Bushi", "#martialarts"].map(tag => (
                  <span key={tag} className="text-xs bg-surface px-2 py-1 rounded text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Online Training */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <ComputerIcon size={24} className="text-primary" />
                {t("student.resources.online.title")}
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                {t("student.resources.online.description")}
              </p>
              <div className="space-y-3">
                <a 
                  href={RESOURCES.online.royal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">{t("student.resources.online.royal")}</p>
                    <p className="text-sm text-muted-foreground">{t("student.resources.online.royalDesc")}</p>
                  </div>
                  <span className="text-accent font-bold">{RESOURCES.online.royal.price}</span>
                </a>
                <a 
                  href={RESOURCES.online.gold.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">{t("student.resources.online.gold")}</p>
                    <p className="text-sm text-muted-foreground">{t("student.resources.online.goldDesc")}</p>
                  </div>
                  <span className="text-accent font-bold">{RESOURCES.online.gold.price}</span>
                </a>
              </div>
            </div>

            {/* YouTube Membership */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <VideoIcon size={24} className="text-primary" />
                {t("student.resources.youtube.title")}
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                {t("student.resources.youtube.description")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={RESOURCES.youtube.membership}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <div className="flex justify-center mb-1">
                    <CrownIcon size={20} />
                  </div>
                  <p className="text-xs font-medium">{t("student.resources.youtube.join")}</p>
                </a>
                <a 
                  href={RESOURCES.youtube.subscribe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center p-3 bg-surface rounded-lg hover:bg-accent hover:text-white transition-colors"
                >
                  <div className="flex justify-center mb-1">
                    <BellIcon size={20} />
                  </div>
                  <p className="text-xs">{t("student.resources.youtube.subscribe")}</p>
                </a>
              </div>
            </div>

            {/* Support / Donation */}
            <div className="p-6 bg-gradient-to-br from-amber-900/20 to-red-900/20 rounded-xl border-2 border-amber-500/30">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">❤️</span>
                Support Tenshinryu
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Help preserve and share the tradition of Tenshinryu Hyoho. Your support directly contributes to producing high-quality instructional content.
              </p>
              <a 
                href="https://bit.ly/tenshinryupatron"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center p-4 bg-gradient-to-r from-amber-600 to-red-600 text-white rounded-lg hover:from-amber-700 hover:to-red-700 transition-all font-medium"
              >
                Become a Patron
              </a>
            </div>

            {/* Video Playlists */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FilmIcon size={24} className="text-primary" />
                {t("student.resources.playlists.title")}
              </h2>
              <div className="space-y-3">
                <a 
                  href={RESOURCES.youtube.playlists.techniques}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-2xl">🎥</span>
                  <div>
                    <p className="font-bold text-foreground">{t("student.resources.playlists.techniques")}</p>
                    <p className="text-sm text-muted-foreground">{t("student.resources.playlists.techniquesDesc")}</p>
                  </div>
                </a>
                <a 
                  href={RESOURCES.youtube.playlists.enbu}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-2xl">🎭</span>
                  <div>
                    <p className="font-bold text-foreground">{t("student.resources.playlists.enbu")}</p>
                    <p className="text-sm text-muted-foreground">{t("student.resources.playlists.enbuDesc")}</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">🌐 {t("student.resources.social.title")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={RESOURCES.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-xl">📸</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">Instagram</p>
                    <p className="text-xs text-muted-foreground">@tenshinryu</p>
                  </div>
                </a>
                <a 
                  href={RESOURCES.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-xl">📘</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">Facebook</p>
                    <p className="text-xs text-muted-foreground">Tenshinryu English</p>
                  </div>
                </a>
                <a 
                  href={RESOURCES.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-xl">🐦</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">Twitter / X</p>
                    <p className="text-xs text-muted-foreground">@TENSHINRYUeng</p>
                  </div>
                </a>
                <a 
                  href={RESOURCES.social.tumblr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surface-border hover:border-accent transition-colors"
                >
                  <span className="text-xl">📝</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">Tumblr</p>
                    <p className="text-xs text-muted-foreground">{t("student.resources.social.blog")}</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Official Website */}
            <a 
              href={RESOURCES.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-accent text-white rounded-xl text-center hover:bg-accent/90 transition-colors"
            >
              <h2 className="text-xl font-bold mb-2">🌐 {t("student.resources.website.title")}</h2>
              <p className="text-sm opacity-90">international.tenshinryu.net →</p>
            </a>
          </div>
        )}

        {validSection === "practice" && activeTab === "solo" && (
          <div className="space-y-4">
            {/* Stats Card */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TargetIcon size={24} className="text-primary" />
                Solo Practice Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                  <p className="text-3xl font-bold text-primary">{soloStats.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
                <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                  <p className="text-3xl font-bold text-accent">{Math.round(soloStats.totalMinutes / 60)}</p>
                  <p className="text-sm text-muted-foreground">Hours Practiced</p>
                </div>
                <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                  <p className="text-3xl font-bold text-green-400">{soloStats.streakDays}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    Day Streak <FlameIcon size={14} className="text-orange-400" />
                  </p>
                </div>
                <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                  <p className="text-3xl font-bold text-yellow-400">{soloStats.averageIntensity.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Avg Energy</p>
                </div>
              </div>
            </div>

            {/* Log Practice Button */}
            <button
              onClick={() => setShowSoloModal(true)}
              className="w-full p-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
            >
              <FlameIcon size={20} />
              Log Practice Session
            </button>

            {/* Recent Practice Logs */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Recent Sessions</h3>
              {soloLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No practice sessions logged yet. Start tracking your solo training!
                </p>
              ) : (
                soloLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-4 bg-surface rounded-xl border border-surface-border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-foreground capitalize">{log.practiceType}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {log.durationMinutes} min
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{log.notes}</p>
                    )}
                    
                    {/* Photos */}
                    {log.photos && log.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {log.photos.map((photo: string, idx: number) => (
                          <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-surface-border">
                            <img
                              src={photo}
                              alt={`Practice photo ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                              onClick={() => window.open(photo, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.intensity === 'light' ? 'bg-green-500/20 text-green-400' :
                        log.intensity === 'hard' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {log.intensity}
                      </span>
                      {log.tags?.map((tag: string) => (
                        <span key={tag} className="text-xs bg-surface-border px-2 py-1 rounded text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {log.voiceNoteUrl && (
                      <audio controls className="w-full mt-2 h-8" src={log.voiceNoteUrl} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {validSection === "practice" && activeTab === "journal" && (
          <div className="space-y-4">
            {/* New Entry Button */}
            <button
              onClick={() => setShowJournalModal(true)}
              className="w-full p-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
            >
              <BookIcon size={20} />
              New Journal Entry
            </button>

            {/* Journal Entries */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Entries</h3>
              {journalEntries.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No journal entries yet. Start documenting your journey!
                </p>
              ) : (
                journalEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-surface rounded-xl border border-surface-border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.entryDate).toLocaleDateString()} • {entry.entryType.replace('_', ' ')}
                        </p>
                      </div>
                      {entry.isPrivate && (
                        <span className="text-xs bg-surface-border px-2 py-1 rounded text-muted-foreground">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{entry.content}</p>
                    {entry.voiceNoteUrl && (
                      <div className="flex items-center gap-2 mb-2">
                        <MicrophoneIcon size={14} className="text-primary" />
                        <audio controls className="flex-1 h-8" src={entry.voiceNoteUrl} />
                      </div>
                    )}
                    {entry.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {entry.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {validSection === "progress" && activeTab === "heatmap" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <div className="flex items-center gap-3 mb-4">
                <GlobeIcon size={28} className="text-primary" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Global Practice Heatmap</h2>
                  <p className="text-sm text-muted-foreground">Anonymous practice locations worldwide</p>
                </div>
              </div>
              
              {/* Stats */}
              {loadingHeatmap ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                    <p className="text-2xl font-bold text-primary">{heatmapStats.totalLocations}</p>
                    <p className="text-xs text-muted-foreground">Cities</p>
                  </div>
                  <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                    <p className="text-2xl font-bold text-accent">{heatmapStats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessions (30d)</p>
                  </div>
                  <div className="p-4 bg-surface rounded-xl text-center border border-surface-border">
                    <p className="text-2xl font-bold text-yellow-400">{Math.round(heatmapStats.totalMinutes / 60)}</p>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </div>
                </div>
              )}
            </div>

            {/* Heatmap */}
            <div className="bg-card rounded-xl border-2 border-border overflow-hidden" style={{ height: '500px' }}>
              {heatmapData.length > 0 ? (
                <PracticeHeatmap data={heatmapData} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <GlobeIcon size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {loadingHeatmap ? "Loading practice data..." : "No practice data yet. Start logging your solo sessions to see the heatmap!"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Note */}
            <div className="p-4 bg-surface rounded-lg border border-surface-border">
              <p className="text-xs text-muted-foreground text-center">
                🔒 Locations are anonymized and rounded to ~1km for privacy. Your exact location is never shared.
              </p>
            </div>
          </div>
        )}

        {validSection === "progress" && activeTab === "insights" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="p-6 bg-card rounded-xl border-2 border-border">
              <div className="flex items-center gap-3 mb-4">
                <SparklesIcon size={28} className="text-accent" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {t("aiInsights.title") || "Practice Insights"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("aiInsights.subtitle") || "Analyze your training data and patterns"}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Insights Component */}
            <AIInsights studentId={studentId} />
          </div>
        )}
      {validSection === "progress" && activeTab === "badges" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="p-6 bg-card rounded-xl border-2 border-border">
            <div className="flex items-center gap-3 mb-4">
              <AwardIcon size={28} className="text-accent" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("badges.title") || "My Badges"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("badges.subtitle") || "Earn badges for your training achievements"}
                </p>
              </div>
            </div>
          </div>

          {/* Badges Component */}
          <BadgesView studentId={studentId} />
        </div>
      )}
      </div>

      {/* Modals */}
      <SoloPracticeModal
        isOpen={showSoloModal}
        onClose={() => {
          setShowSoloModal(false);
          setEditingSoloLog(null);
        }}
        onSave={(data) => {
          if (editingSoloLog) {
            setSoloLogs(soloLogs.map(l => l.id === data.log.id ? data.log : l));
          } else {
            setSoloLogs([data.log, ...soloLogs]);
          }
          setEditingSoloLog(null);
        }}
        studentId={studentId}
        editingLog={editingSoloLog}
      />

      <JournalModal
        isOpen={showJournalModal}
        onClose={() => {
          setShowJournalModal(false);
          setEditingJournalEntry(null);
        }}
        onSave={(data) => {
          if (editingJournalEntry) {
            setJournalEntries(journalEntries.map(e => e.id === data.entry.id ? data.entry : e));
          } else {
            setJournalEntries([data.entry, ...journalEntries]);
          }
          setEditingJournalEntry(null);
        }}
        studentId={studentId}
        editingEntry={editingJournalEntry}
      />
    </WorkShell>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    }>
      <StudentDashboardInner />
    </Suspense>
  );
}
