"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface AnalyticsTabProps {
  students: any[];
  classes: any[];
  t: (key: string) => string;
  locale: string;
}

interface AnalyticsData {
  summary: {
    totalCheckIns: number;
    uniqueStudents: number;
    uniqueClasses: number;
    totalStudents: number;
    totalClasses: number;
    mostAttendedClass: string | null;
    topStudent: string | null;
    averageTokensPerCheckIn: number;
    totalTokensAwarded: number;
  };
  byClass: Array<{
    id: string;
    name: string;
    count: number;
    totalTokens: number;
  }>;
  byStudent: Array<{
    id: string;
    name: string;
    beltRank: string;
    avatar: string | null;
    count: number;
    totalTokens: number;
    lastCheckIn: string | null;
    streak: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    tokens: number;
  }>;
  recentCheckIns: any[];
}

export default function AnalyticsTab({ students, classes, t, locale }: AnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [viewMode, setViewMode] = useState<"overview" | "students" | "classes" | "timeline">("overview");

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, selectedClass]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (selectedClass) params.append("classId", selectedClass);

      const res = await fetch(`/api/attendance/analytics?${params}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        console.error("Analytics API error:", res.status, res.statusText);
        setAnalytics(null);
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        console.error("Analytics error:", data.error);
        setAnalytics(null);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "ja" ? "ja-JP" : undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatLastCheckIn = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load analytics
      </div>
    );
  }

  const { summary, byClass, byStudent, byDate } = analytics;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="border-2 border-neutral-900 p-4 bg-card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={new Date()}
              className="px-3 py-2 bg-surface border-2 border-neutral-900 text-foreground text-sm"
              placeholderText="Select start"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              className="px-3 py-2 bg-surface border-2 border-neutral-900 text-foreground text-sm"
              placeholderText="Select end"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-surface border-2 border-neutral-900 text-foreground text-sm min-w-[150px]"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1"></div>
          <button
            onClick={() => { setStartDate(null); setEndDate(null); setSelectedClass(""); }}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        {[
          { id: "overview", label: "Overview", icon: "📊" },
          { id: "students", label: "Students", icon: "👥" },
          { id: "classes", label: "Classes", icon: "📅" },
          { id: "timeline", label: "Timeline", icon: "📈" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`px-4 py-2 font-bold text-sm transition-colors ${
              viewMode === tab.id
                ? "bg-accent text-white"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW VIEW */}
      {viewMode === "overview" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-2 border-neutral-900 p-4 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Check-ins</p>
              <p className="font-heading text-3xl font-black text-foreground">{summary.totalCheckIns}</p>
            </div>
            <div className="border-2 border-neutral-900 p-4 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Active Students</p>
              <p className="font-heading text-3xl font-black text-foreground">{summary.uniqueStudents}/{summary.totalStudents}</p>
            </div>
            <div className="border-2 border-neutral-900 p-4 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Classes Held</p>
              <p className="font-heading text-3xl font-black text-foreground">{summary.uniqueClasses}</p>
            </div>
            <div className="border-2 border-neutral-900 p-4 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Tokens Awarded</p>
              <p className="font-heading text-3xl font-black text-accent">{summary.totalTokensAwarded}</p>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-2 border-neutral-900 p-6 bg-card">
              <h3 className="font-heading text-lg font-bold mb-4">Highlights</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Top Student</p>
                    <p className="font-bold">{summary.topStudent || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Most Popular Class</p>
                    <p className="font-bold">{summary.mostAttendedClass || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-neutral-900 p-6 bg-card">
              <h3 className="font-heading text-lg font-bold mb-4">Token Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tokens</span>
                  <span className="font-bold">{summary.totalTokensAwarded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg per Check-in</span>
                  <span className="font-bold">{summary.averageTokensPerCheckIn}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* STUDENTS VIEW */}
      {viewMode === "students" && (
        <div className="border-2 border-neutral-900 bg-card">
          <div className="p-4 border-b-2 border-neutral-900">
            <h3 className="font-heading text-lg font-bold">Student Attendance</h3>
          </div>
          <div className="divide-y divide-neutral-900">
            {byStudent.slice(0, 20).map((student) => (
              <div key={student.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-surface flex items-center justify-center text-lg">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full rounded object-cover" />
                  ) : (
                    "🥋"
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.beltRank} • Last: {formatLastCheckIn(student.lastCheckIn)}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl font-black">{student.count}</p>
                  <p className="text-xs text-muted-foreground">{student.totalTokens} tokens • 🔥 {student.streak} streak</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLASSES VIEW */}
      {viewMode === "classes" && (
        <div className="border-2 border-neutral-900 bg-card">
          <div className="p-4 border-b-2 border-neutral-900">
            <h3 className="font-heading text-lg font-bold">Class Attendance</h3>
          </div>
          <div className="divide-y divide-neutral-900">
            {byClass.map((cls) => (
              <div key={cls.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">{cls.count} check-ins</p>
                  </div>
                  <p className="font-heading text-2xl font-black">{cls.totalTokens}</p>
                </div>
                <p className="text-xs text-muted-foreground">tokens awarded</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewMode === "timeline" && (
        <div className="border-2 border-neutral-900 bg-card p-6">
          <h3 className="font-heading text-lg font-bold mb-6">Check-ins Over Time</h3>
          <div className="space-y-3">
            {byDate.slice(-30).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <p className="w-16 text-sm text-muted-foreground">{formatDate(day.date)}</p>
                <div className="flex-1">
                  <div className="h-6 bg-accent rounded" style={{ width: `${Math.min(day.count * 10, 100)}%` }} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{day.count}</p>
                  <p className="text-xs text-muted-foreground">{day.tokens} tokens</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
