"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthInstance } from "@/lib/firebase";
import { useI18n } from "@/components/I18nProvider";
import QRCode from "qrcode";
import DatePicker from "react-datepicker";
import { ja } from "date-fns/locale";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import AnalyticsTab from "@/components/AnalyticsTab";
import InstructorInviteModal from "@/components/InstructorInviteModal";
import { StaffShell } from "@/components/work/StaffShell";
import "react-datepicker/dist/react-datepicker.css";

interface Student {
  id: string;
  name: string;
  email: string;
  qrCode: string;
  beltRank: string;
  avatarUrl?: string;
  dojoId?: string;
}

interface CheckIn {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  method: "ble" | "qr" | "manual";
  status: "present" | "absent" | "late";
}

interface Class {
  id: string;
  name: string;
  schedule: string;
  location?: string;
  maxStudents: number;
  instructorName: string;
  isRecurring?: boolean;
}

export default function InstructorDashboard() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState<"checkin" | "classes" | "attendance" | "analytics" | "notifications">("checkin");
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<"present" | "absent" | "late">("present");
  const [selectedClass, setSelectedClass] = useState("");

  // Class creation form state
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    schedule: "",
    scheduleDate: new Date(),
    location: "",
    maxStudents: 999,
    isRecurring: false,
  });
  const [createClassLoading, setCreateClassLoading] = useState(false);

  // Class edit form state
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassForm, setEditClassForm] = useState({
    name: "",
    schedule: "",
    scheduleDate: new Date(),
    location: "",
    maxStudents: 999,
    isRecurring: false,
  });
  const [editClassLoading, setEditClassLoading] = useState(false);

  // QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchTodayCheckIns();
    fetchClasses();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || "");
      }
    } catch (err) {
      console.error("Failed to fetch user role:", err);
    }
  };

  const fetchStudents = async () => {
    const response = await fetch("/api/students");
    if (response.ok) {
      const data = await response.json();
      setStudents(data.students);
    }
  };

  const fetchTodayCheckIns = async () => {
    const response = await fetch("/api/checkin/today");
    if (response.ok) {
      const data = await response.json();
      setTodayCheckIns(data.checkIns);
    }
  };

  const fetchClasses = async () => {
    const response = await fetch("/api/classes");
    if (response.ok) {
      const data = await response.json();
      setClasses(data.classes);
    }
  };

  const toggleBeacon = () => {
    setIsBeaconActive(!isBeaconActive);
  };

  const openCorrectionModal = (student: Student) => {
    setSelectedStudent(student);
    setCorrectionStatus("present");
    setShowCorrectionModal(true);
  };

  const submitCorrection = async () => {
    if (!selectedStudent) return;

    const response = await fetch("/api/checkin/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudent.id,
        status: correctionStatus,
        timestamp: new Date().toISOString(),
        method: "manual",
      }),
    });

    if (response.ok) {
      setShowCorrectionModal(false);
      fetchTodayCheckIns();
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClassLoading(true);

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });

      if (response.ok) {
        setShowCreateClassModal(false);
        setClassForm({ name: "", schedule: "", scheduleDate: new Date(), location: "", maxStudents: 20, isRecurring: false });
        fetchClasses();
      } else {
        alert(t("common.error") || "Failed to create class");
      }
    } catch (error) {
      alert(t("common.networkError") || "Network error");
    } finally {
      setCreateClassLoading(false);
    }
  };

  const openEditModal = (cls: Class) => {
    setEditingClass(cls);
    setEditClassForm({
      name: cls.name,
      schedule: cls.schedule,
      scheduleDate: new Date(cls.schedule),
      location: cls.location || "",
      maxStudents: cls.maxStudents,
      isRecurring: cls.isRecurring || false,
    });
    setShowEditClassModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setEditClassLoading(true);

    try {
      const response = await fetch("/api/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingClass.id,
          name: editClassForm.name,
          schedule: editClassForm.schedule,
          location: editClassForm.location,
          maxStudents: editClassForm.maxStudents,
          isRecurring: editClassForm.isRecurring,
        }),
      });

      if (response.ok) {
        setShowEditClassModal(false);
        setEditingClass(null);
        fetchClasses();
      } else {
        alert(t("common.error") || "Failed to update class");
      }
    } catch (error) {
      alert(t("common.networkError") || "Network error");
    } finally {
      setEditClassLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm(t("instructor.classes.deleteConfirm") || "Are you sure you want to delete this class?")) return;

    try {
      const response = await fetch(`/api/classes?id=${classId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchClasses();
        if (selectedClass === classId) {
          setSelectedClass("");
        }
      } else {
        alert(t("common.error") || "Failed to delete class");
      }
    } catch (error) {
      alert(t("common.networkError") || "Network error");
    }
  };

  const generateClassQR = async (classId?: string) => {
    const targetClassId = classId || selectedClass || "default";
    const classQR = `class-${targetClassId}-${Date.now()}`;
    try {
      const dataUrl = await QRCode.toDataURL(classQR, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setShowQRModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert(t("instructor.checkin.qrError") || 'Failed to generate QR code');
    }
  };

  const selectClassAndActivate = (classId: string) => {
    setSelectedClass(classId);
    setActiveTab("checkin");
    // Auto-generate QR and start beacon
    setTimeout(() => {
      generateClassQR(classId);
      setIsBeaconActive(true);
    }, 100);
  };

  const presentCount = todayCheckIns.filter((c) => c.status === "present").length;
  const absentStudents = students.filter(
    (s) => !todayCheckIns.some((c) => c.studentId === s.id && c.status === "present")
  );

  return (
    <StaffShell
      role={userRole === "admin" ? "admin" : "instructor"}
      title={t("instructor.dashboard")}
      subtitle={`${t("instructor.welcome")}, ${user?.displayName || user?.email || t("instructor.instructorTitle")}`}
      actions={
        <>
          {userRole === "admin" && (
            <Link href="/admin" className="btn-secondary !text-xs !px-3 !py-2">
              {t("admin.title") || "Owner dashboard"}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary !text-xs !px-3 !py-2"
          >
            {t("instructor.invite.button")}
          </button>
          <Link href="/student" className="btn-primary !text-xs !px-3 !py-2 !w-auto">
            {t("instructor.studentMode")}
          </Link>
        </>
      }
    >
      <div className="max-w-6xl mx-auto">
        <div className="sub-tab-nav mb-8 border-b border-border pb-2">
          {[
            { id: "checkin", label: t("instructor.tabs.checkin") },
            { id: "classes", label: t("instructor.tabs.classes") },
            { id: "attendance", label: t("instructor.tabs.attendance") },
            { id: "analytics", label: "Analytics" },
            { id: "notifications", label: t("instructor.tabs.notify") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`sub-tab ${activeTab === tab.id ? "sub-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CHECK-IN TAB */}
        {activeTab === "checkin" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="stat-tile">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t("instructor.stats.present")}</p>
                <p className="stat-tile-value">{presentCount}</p>
              </div>
              <div className="stat-tile">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t("instructor.stats.absent")}</p>
                <p className="stat-tile-value">{absentStudents.length}</p>
              </div>
              <div className="stat-tile">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t("instructor.stats.total")}</p>
                <p className="stat-tile-value">{students.length}</p>
              </div>
            </div>

            {/* Check-in Controls */}
            <div className="ui-panel mb-8">
              <h2 className="font-heading text-xl font-bold text-foreground mb-6">{t("instructor.checkin.title")}</h2>
              
              {/* Selected Class Display */}
              <div className="mb-6 p-4 bg-surface border border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("instructor.checkin.selectedClass")}</p>
                {selectedClass ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">
                        {classes.find(c => c.id === selectedClass)?.name || t("common.unknown")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {classes.find(c => c.id === selectedClass)?.schedule}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("classes")}
                      className="text-sm text-accent hover:underline"
                    >
                      {t("common.change")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-accent">{t("instructor.checkin.noClass")}</p>
                    <button
                      onClick={() => setActiveTab("classes")}
                      className="text-sm text-accent hover:underline"
                    >
                      {t("instructor.checkin.selectPrompt")} →
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* BLE Beacon */}
                <div className="border-2 border-border p-6 text-center rounded-lg bg-card">
                  <div className="text-4xl mb-4">📡</div>
                  <h3 className="font-bold text-foreground mb-2">{t("instructor.checkin.beaconTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isBeaconActive
                      ? t("instructor.checkin.beaconActive")
                      : t("instructor.checkin.beaconInactive")}
                  </p>
                  <button
                    onClick={toggleBeacon}
                    disabled={!selectedClass}
                    className={`uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border-2 transition-colors rounded-lg ${
                      isBeaconActive
                        ? "border-accent text-accent hover:bg-accent hover:text-white"
                        : "border-border bg-surface text-foreground hover:bg-accent hover:text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isBeaconActive ? t("instructor.checkin.stopBeacon") : t("instructor.checkin.startBeacon")}
                  </button>
                </div>

                {/* QR Code */}
                <div className="border-2 border-border p-6 text-center rounded-lg bg-card">
                  <div className="text-4xl mb-4">📷</div>
                  <h3 className="font-bold text-foreground mb-2">{t("instructor.checkin.qrTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("instructor.checkin.qrDesc")}</p>
                  <div className="bg-white p-4 inline-block mb-4 rounded-lg">
                    <svg viewBox="0 0 100 100" className="w-32 h-32">
                      {/* QR Code Pattern */}
                      <rect x="0" y="0" width="100" height="100" fill="white"/>
                      {/* Position detection patterns (corners) */}
                      <rect x="5" y="5" width="25" height="25" fill="black"/>
                      <rect x="10" y="10" width="15" height="15" fill="white"/>
                      <rect x="13" y="13" width="9" height="9" fill="black"/>
                      
                      <rect x="70" y="5" width="25" height="25" fill="black"/>
                      <rect x="75" y="10" width="15" height="15" fill="white"/>
                      <rect x="78" y="13" width="9" height="9" fill="black"/>
                      
                      <rect x="5" y="70" width="25" height="25" fill="black"/>
                      <rect x="10" y="75" width="15" height="15" fill="white"/>
                      <rect x="13" y="78" width="9" height="9" fill="black"/>
                      
                      {/* Random data pattern */}
                      <rect x="35" y="5" width="5" height="5" fill="black"/>
                      <rect x="45" y="5" width="5" height="5" fill="black"/>
                      <rect x="55" y="5" width="5" height="5" fill="black"/>
                      <rect x="35" y="15" width="5" height="5" fill="black"/>
                      <rect x="50" y="15" width="5" height="5" fill="black"/>
                      <rect x="60" y="15" width="5" height="5" fill="black"/>
                      
                      <rect x="5" y="35" width="5" height="5" fill="black"/>
                      <rect x="15" y="35" width="5" height="5" fill="black"/>
                      <rect x="25" y="35" width="5" height="5" fill="black"/>
                      <rect x="35" y="35" width="5" height="5" fill="black"/>
                      <rect x="45" y="35" width="5" height="5" fill="black"/>
                      <rect x="55" y="35" width="5" height="5" fill="black"/>
                      <rect x="65" y="35" width="5" height="5" fill="black"/>
                      <rect x="75" y="35" width="5" height="5" fill="black"/>
                      <rect x="85" y="35" width="5" height="5" fill="black"/>
                      <rect x="95" y="35" width="5" height="5" fill="black"/>
                      
                      <rect x="5" y="45" width="5" height="5" fill="black"/>
                      <rect x="20" y="45" width="5" height="5" fill="black"/>
                      <rect x="35" y="45" width="5" height="5" fill="black"/>
                      <rect x="50" y="45" width="5" height="5" fill="black"/>
                      <rect x="65" y="45" width="5" height="5" fill="black"/>
                      <rect x="80" y="45" width="5" height="5" fill="black"/>
                      <rect x="95" y="45" width="5" height="5" fill="black"/>
                      
                      <rect x="10" y="55" width="5" height="5" fill="black"/>
                      <rect x="25" y="55" width="5" height="5" fill="black"/>
                      <rect x="40" y="55" width="5" height="5" fill="black"/>
                      <rect x="55" y="55" width="5" height="5" fill="black"/>
                      <rect x="70" y="55" width="5" height="5" fill="black"/>
                      <rect x="85" y="55" width="5" height="5" fill="black"/>
                      
                      <rect x="35" y="65" width="5" height="5" fill="black"/>
                      <rect x="45" y="65" width="5" height="5" fill="black"/>
                      <rect x="55" y="65" width="5" height="5" fill="black"/>
                      <rect x="65" y="65" width="5" height="5" fill="black"/>
                      <rect x="75" y="65" width="5" height="5" fill="black"/>
                      <rect x="85" y="65" width="5" height="5" fill="black"/>
                      
                      <rect x="5" y="75" width="5" height="5" fill="black"/>
                      <rect x="20" y="75" width="5" height="5" fill="black"/>
                      <rect x="35" y="75" width="5" height="5" fill="black"/>
                      <rect x="50" y="75" width="5" height="5" fill="black"/>
                      <rect x="65" y="75" width="5" height="5" fill="black"/>
                      <rect x="80" y="75" width="5" height="5" fill="black"/>
                      
                      <rect x="35" y="85" width="5" height="5" fill="black"/>
                      <rect x="45" y="85" width="5" height="5" fill="black"/>
                      <rect x="55" y="85" width="5" height="5" fill="black"/>
                      <rect x="70" y="85" width="5" height="5" fill="black"/>
                      <rect x="80" y="85" width="5" height="5" fill="black"/>
                      <rect x="90" y="85" width="5" height="5" fill="black"/>
                      
                      <rect x="5" y="95" width="5" height="5" fill="black"/>
                      <rect x="15" y="95" width="5" height="5" fill="black"/>
                      <rect x="25" y="95" width="5" height="5" fill="black"/>
                      <rect x="40" y="95" width="5" height="5" fill="black"/>
                      <rect x="55" y="95" width="5" height="5" fill="black"/>
                      <rect x="70" y="95" width="5" height="5" fill="black"/>
                      <rect x="85" y="95" width="5" height="5" fill="black"/>
                      <rect x="95" y="95" width="5" height="5" fill="black"/>
                    </svg>
                  </div>
                  <button
                    onClick={() => generateClassQR()}
                    disabled={!selectedClass}
                    className="block w-full uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    {t("instructor.checkin.generateQR")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CLASSES TAB */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-foreground">{t("instructor.classes.schedule")}</h2>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
              >
                + {t("instructor.classes.create")}
              </button>
            </div>

            <div className="grid gap-4">
              {classes.length === 0 ? (
                <div className="border border-border p-8 text-center text-muted-foreground">
                  {t("instructor.classes.noClasses")}
                </div>
              ) : (
                classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    className={`border-2 p-6 ${
                      selectedClass === cls.id 
                        ? "border-accent bg-accent/5" 
                        : "border-neutral-900"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-lg font-bold text-foreground">{cls.name}</h3>
                          {selectedClass === cls.id && (
                            <span className="text-xs bg-accent text-white px-2 py-1 uppercase tracking-wider">
                              {t("common.selected")}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1">{cls.schedule}</p>
                        {cls.location && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cls.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-accent mt-1 inline-flex items-center gap-1 hover:underline"
                          >
                            📍 {cls.location} →
                          </a>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          {t("instructor.classes.instructor")}: {cls.instructorName} • {t("instructor.classes.max")}: {cls.maxStudents} {t("instructor.classes.students")}
                          {cls.isRecurring && ` • 🔄 ${t("instructor.classes.recurring")}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => selectClassAndActivate(cls.id)}
                          className={`text-sm underline transition-colors ${
                            selectedClass === cls.id 
                              ? "text-accent font-bold" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {selectedClass === cls.id ? `✓ ${t("common.selected")}` : t("instructor.classes.selectForCheckin")}
                        </button>
                        <div className="flex gap-3 text-xs">
                          <button
                            onClick={() => openEditModal(cls)}
                            className="text-muted-foreground hover:text-accent underline"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="text-muted-foreground hover:text-accent underline"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="border-2 border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b-2 border-border flex items-center justify-between bg-card">
              <h2 className="font-heading text-xl font-bold text-foreground">{t("instructor.attendance.title")}</h2>
              <button
                onClick={fetchTodayCheckIns}
                className="text-sm text-muted-foreground underline hover:text-accent"
              >
                {t("common.refresh")}
              </button>
            </div>

            <div className="divide-y divide-border">
              {students.map((student) => {
                const checkIn = todayCheckIns.find((c) => c.studentId === student.id);
                return (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-surface/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-12 h-12 rounded-lg object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface border-2 border-border flex items-center justify-center text-xl">
                            🥋
                          </div>
                        )}
                        {/* Status indicator */}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                            checkIn?.status === "present"
                              ? "bg-green-500"
                              : checkIn?.status === "late"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.beltRank} • {checkIn?.method?.toUpperCase() || t("instructor.attendance.notCheckedIn")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {checkIn && (
                        <button
                          onClick={() => handleRemoveCheckIn(student.id, t)}
                          className="text-sm text-accent hover:underline"
                        >
                          {t("instructor.attendance.remove")}
                        </button>
                      )}
                      <button
                        onClick={() => openCorrectionModal(student)}
                        className="text-sm underline text-muted-foreground hover:text-foreground"
                      >
                        {checkIn ? t("common.edit") : t("instructor.attendance.markPresent")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <AnalyticsTab 
            students={students} 
            classes={classes}
            t={t}
            locale={locale}
          />
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <NotificationsTab classes={classes} students={students} t={t} />
        )}

        {/* Support Banner */}
        <div className="mt-8 p-6 bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-500/30 rounded-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <span className="text-xl">❤️</span>
                Support Tenshinryu
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Help preserve the tradition. Your contribution directly supports producing quality instructional content.
              </p>
            </div>
            <a
              href="https://bit.ly/tenshinryupatron"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-red-600 text-white font-medium rounded hover:from-amber-700 hover:to-red-700 transition-all whitespace-nowrap"
            >
              Become a Patron
            </a>
          </div>
        </div>

        {/* Create Class Modal */}
        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-background border border-border p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">{t("instructor.classes.createNew")}</h3>
              
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.name")} *</label>
                  <input
                    type="text"
                    required
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                    placeholder={t("instructor.classes.namePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.schedule")} *</label>
                  <DatePicker
                    selected={classForm.scheduleDate}
                    onChange={(date: Date | null) => date && setClassForm({ ...classForm, scheduleDate: date, schedule: date.toLocaleString() })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat={locale === "ja" ? "yyyy年M月d日 h:mm aa" : "MMMM d, yyyy h:mm aa"}
                    locale={locale === "ja" ? ja : undefined}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                    placeholderText={t("instructor.classes.selectDateTime")}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("instructor.classes.selectWhenStarts")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.location")}</label>
                  <GooglePlacesAutocomplete
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    selectProps={{
                      value: classForm.location ? { label: classForm.location, value: classForm.location } : null,
                      onChange: (place: any) => setClassForm({ ...classForm, location: place?.label || "" }),
                      placeholder: t("instructor.classes.searchLocation"),
                      className: "text-foreground",
                      styles: {
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#1A1D26",
                          borderColor: "#2A2E3A",
                          color: "#ffffff",
                          padding: "0.5rem",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#ffffff",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#6b7280",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#ffffff",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1A1D26",
                          borderColor: "#2A2E3A",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? "#ff3b3b" : "#1A1D26",
                          color: "#ffffff",
                        }),
                      },
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("instructor.classes.searchGoogleMaps")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.maxStudents")}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={classForm.maxStudents}
                    onChange={(e) => setClassForm({ ...classForm, maxStudents: parseInt(e.target.value) || 999 })}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Recurring Checkbox */}
                <div className="flex items-center gap-3 p-3 border border-border">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={classForm.isRecurring}
                    onChange={(e) => setClassForm({ ...classForm, isRecurring: e.target.checked })}
                    className="w-5 h-5 accent-accent"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-foreground cursor-pointer">
                    🔄 {t("instructor.classes.recurringLabel")}
                  </label>
                </div>
                {classForm.isRecurring && (
                  <p className="text-xs text-muted-foreground -mt-2">
                    {t("instructor.classes.recurringDesc")}
                  </p>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateClassModal(false)}
                    className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border text-foreground hover:bg-surface transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createClassLoading}
                    className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-50 transition-colors"
                  >
                    {createClassLoading ? t("common.creating") : t("instructor.classes.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Class Modal */}
        {showEditClassModal && editingClass && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-background border border-border p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">{t("instructor.classes.editClass")}</h3>
              
              <form onSubmit={handleUpdateClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.name")} *</label>
                  <input
                    type="text"
                    required
                    value={editClassForm.name}
                    onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                    placeholder={t("instructor.classes.namePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.schedule")} *</label>
                  <DatePicker
                    selected={editClassForm.scheduleDate}
                    onChange={(date: Date | null) => date && setEditClassForm({ ...editClassForm, scheduleDate: date, schedule: date.toLocaleString() })}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat={locale === "ja" ? "yyyy年M月d日 h:mm aa" : "MMMM d, yyyy h:mm aa"}
                    locale={locale === "ja" ? ja : undefined}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                    placeholderText={t("instructor.classes.selectDateTime")}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("instructor.classes.selectWhenStarts")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.location")}</label>
                  <GooglePlacesAutocomplete
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    selectProps={{
                      value: editClassForm.location ? { label: editClassForm.location, value: editClassForm.location } : null,
                      onChange: (place: any) => setEditClassForm({ ...editClassForm, location: place?.label || "" }),
                      placeholder: t("instructor.classes.searchLocation"),
                      className: "text-foreground",
                      styles: {
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#1A1D26",
                          borderColor: "#2A2E3A",
                          color: "#ffffff",
                          padding: "0.5rem",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#ffffff",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#6b7280",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#ffffff",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#1A1D26",
                          borderColor: "#2A2E3A",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? "#ff3b3b" : "#1A1D26",
                          color: "#ffffff",
                        }),
                      },
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("instructor.classes.searchGoogleMaps")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.classes.maxStudents")}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editClassForm.maxStudents}
                    onChange={(e) => setEditClassForm({ ...editClassForm, maxStudents: parseInt(e.target.value) || 999 })}
                    className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Recurring Checkbox */}
                <div className="flex items-center gap-3 p-3 border border-border">
                  <input
                    type="checkbox"
                    id="editIsRecurring"
                    checked={editClassForm.isRecurring}
                    onChange={(e) => setEditClassForm({ ...editClassForm, isRecurring: e.target.checked })}
                    className="w-5 h-5 accent-accent"
                  />
                  <label htmlFor="editIsRecurring" className="text-sm font-medium text-foreground cursor-pointer">
                    🔄 {t("instructor.classes.recurringLabel")}
                  </label>
                </div>
                {editClassForm.isRecurring && (
                  <p className="text-xs text-muted-foreground -mt-2">
                    {t("instructor.classes.recurringDesc")}
                  </p>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditClassModal(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border text-foreground hover:bg-surface transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editClassLoading}
                    className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-50 transition-colors"
                  >
                    {editClassLoading ? t("common.saving") : t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Correction Modal */}
        {showCorrectionModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-background border border-border p-8 max-w-md w-full">
              <h3 className="font-heading text-xl font-bold text-foreground mb-4">
                {todayCheckIns.find((c) => c.studentId === selectedStudent.id) ? t("instructor.attendance.edit") : t("instructor.attendance.mark")} {t("instructor.attendance.attendance")}
              </h3>
              <p className="text-muted-foreground mb-6">{selectedStudent.name}</p>

              <div className="space-y-3 mb-6">
                {(["present", "absent", "late"] as const).map((status) => (
                  <label
                    key={status}
                    className={`flex items-center justify-center p-4 border-2 cursor-pointer transition-colors ${
                      correctionStatus === status
                        ? "border-accent bg-accent/10"
                        : "border-neutral-900 hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={correctionStatus === status}
                      onChange={(e) => setCorrectionStatus(e.target.value as any)}
                      className="sr-only"
                    />
                    <span className="uppercase tracking-widest font-bold text-foreground">
                      {t(`instructor.attendance.status.${status}`)}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border text-foreground hover:bg-surface transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={submitCorrection}
                  className="flex-1 uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && qrCodeDataUrl && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-background border border-border p-8 max-w-md w-full text-center">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">{t("instructor.checkin.qrTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("instructor.checkin.qrDesc")}</p>
              <div className="bg-white p-4 inline-block mb-6">
                <img src={qrCodeDataUrl} alt={t("instructor.checkin.qrAlt")} className="w-64 h-64" />
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full uppercase tracking-[0.2em] text-xs font-bold px-6 py-3 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}

        {/* Invite Instructor Modal */}
        {showInviteModal && (
          <InstructorInviteModal onClose={() => setShowInviteModal(false)} />
        )}
      </div>
    </StaffShell>
  );
}

// Helper function for removing check-ins
async function handleRemoveCheckIn(studentId: string, t: (key: string) => string) {
  if (!confirm(t("instructor.attendance.removeConfirm") || "Remove this check-in?")) return;
  
  try {
    const response = await fetch("/api/checkin/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    
    if (response.ok) {
      window.location.reload();
    }
  } catch (error) {
    alert(t("instructor.attendance.removeFailed") || "Failed to remove check-in");
  }
}

// Notifications Tab Component
function NotificationsTab({ classes, students, t }: { classes: Class[]; students: Student[]; t: (key: string) => string }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [notificationType, setNotificationType] = useState<"reminder" | "location_change" | "cancellation" | "custom">("reminder");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [channel, setChannel] = useState<"all" | "line">("all");
  const [lineStatus, setLineStatus] = useState<{ withLine: number; total: number } | null>(null);

  // Fetch LINE connection status
  useEffect(() => {
    if (students.length > 0) {
      const dojoId = students[0]?.dojoId || "";
      fetch(`/api/notifications/line?dojoId=${dojoId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setLineStatus({ withLine: data.withLine, total: data.total }))
        .catch(() => {});
    }
  }, [students]);

  const handleSendNotification = async () => {
    if (!selectedClass) {
      setResult({ success: false, message: t("instructor.notifications.selectClass") });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Get students for this class
      const classStudents = students; // In real app, filter by class

      if (channel === "line") {
        // Send via LINE
        const message = customMessage || getDefaultMessage(notificationType);
        const response = await fetch("/api/notifications/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentIds: classStudents.map(s => s.id),
            message,
            classId: selectedClass,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setResult({ success: true, message: `LINE: ${t("instructor.notifications.sentTo")} ${data.sent} ${t("instructor.notifications.students")} (${data.failed} ${t("instructor.notifications.failed")})` });
        } else {
          setResult({ success: false, message: data.error || t("instructor.notifications.sendFailed") });
        }
      } else {
        // Send via all channels (existing API)
        const response = await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: selectedClass,
            type: notificationType,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setResult({ success: true, message: `${t("instructor.notifications.sentTo")} ${data.sent} ${t("instructor.notifications.students")}` });
        } else {
          setResult({ success: false, message: data.error || t("instructor.notifications.sendFailed") });
        }
      }
    } catch (error) {
      setResult({ success: false, message: t("common.networkError") });
    } finally {
      setSending(false);
    }
  };

  const getDefaultMessage = (type: string) => {
    switch (type) {
      case "reminder": return t("instructor.notifications.default.reminder");
      case "location_change": return t("instructor.notifications.default.locationChange");
      case "cancellation": return t("instructor.notifications.default.cancellation");
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">{t("instructor.notifications.title")}</h2>

      {result && (
        <div
          className={`p-4 border-2 ${
            result.success ? "border-green-500 text-green-500" : "border-accent text-accent"
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="border border-border p-6 space-y-6">
        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.notifications.selectClass")}</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">{t("instructor.notifications.chooseClass")}</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} - {cls.schedule}
              </option>
            ))}
          </select>
        </div>

        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.notifications.sendVia")}</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setChannel("all")}
              className={`p-4 border-2 text-center transition-colors ${
                channel === "all"
                  ? "border-accent bg-accent/10"
                  : "border-neutral-900 hover:bg-surface"
              }`}
            >
              <div className="text-2xl mb-2">📧📱</div>
              <span className="text-sm font-bold">{t("instructor.notifications.allChannels")}</span>
              <p className="text-xs text-muted-foreground mt-1">{t("instructor.notifications.emailSms")}</p>
            </button>
            <button
              onClick={() => setChannel("line")}
              className={`p-4 border-2 text-center transition-colors ${
                channel === "line"
                  ? "border-accent bg-accent/10"
                  : "border-neutral-900 hover:bg-surface"
              }`}
            >
              <div className="text-2xl mb-2">💬</div>
              <span className="text-sm font-bold">{t("instructor.notifications.lineApp")}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {lineStatus ? `${lineStatus.withLine}/${lineStatus.total} ${t("instructor.notifications.connected")}` : t("common.loading")}
              </p>
            </button>
          </div>
        </div>

        {/* Notification Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.notifications.type")}</label>
          <div className="grid grid-cols-4 gap-4">
            {[
              { id: "reminder", label: t("instructor.notifications.types.reminder"), icon: "⏰" },
              { id: "location_change", label: t("instructor.notifications.types.locationChange"), icon: "📍" },
              { id: "cancellation", label: t("instructor.notifications.types.cancellation"), icon: "❌" },
              { id: "custom", label: t("instructor.notifications.types.custom"), icon: "✏️" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setNotificationType(type.id as any)}
                className={`p-4 border-2 text-center transition-colors ${
                  notificationType === type.id
                    ? "border-accent bg-accent/10"
                    : "border-neutral-900 hover:bg-surface"
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <span className="text-sm font-bold">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message (for custom type or LINE) */}
        {(notificationType === "custom" || channel === "line") && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("instructor.notifications.message")}</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={getDefaultMessage(notificationType)}
              rows={4}
              className="w-full px-4 py-3 bg-surface border border-border text-foreground focus:border-accent focus:outline-none resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{customMessage.length}/1000 {t("instructor.notifications.characters")}</p>
          </div>
        )}

        {/* Preview */}
        <div className="bg-surface p-4 border border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("instructor.notifications.preview")}</p>
          <p className="text-foreground">
            {customMessage || getDefaultMessage(notificationType)}
          </p>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendNotification}
          disabled={sending || !selectedClass || (channel === "line" && !lineStatus?.withLine)}
          className="w-full uppercase tracking-[0.2em] text-sm font-bold px-8 py-4 border border-border bg-neutral-950 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-50 transition-colors"
        >
          {sending ? t("instructor.notifications.sending") : `${t("instructor.notifications.send")} ${channel === "line" ? "LINE" : t("instructor.notifications.allChannels")}`}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          {channel === "line" 
            ? t("instructor.notifications.lineNote")
            : t("instructor.notifications.allNote")
          }
        </p>
      </div>

      {/* Info Box */}
      <div className="border border-border p-4">
        <h4 className="font-bold text-foreground mb-2">{t("instructor.notifications.lineSetup")}</h4>
        <p className="text-sm text-muted-foreground mb-2">
          {t("instructor.notifications.lineSetupDesc")}
        </p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
          <li>{t("instructor.notifications.lineStep1")}</li>
          <li>{t("instructor.notifications.lineStep2")}</li>
        </ol>
        <p className="text-sm text-muted-foreground mt-2">
          {t("instructor.notifications.studentsConnected")}: <span className="text-foreground font-bold">{lineStatus?.withLine || 0}/{lineStatus?.total || students.length}</span>
        </p>
      </div>
    </div>
  );
}
