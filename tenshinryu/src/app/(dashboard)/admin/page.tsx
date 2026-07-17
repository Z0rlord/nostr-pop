"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { StaffShell } from "@/components/work/StaffShell";
import { SchoolsOverview } from "@/components/work/SchoolsOverview";
import { PageLoading } from "@/components/ui/PageLoading";

interface DashboardMetrics {
  overview: {
    totalStudents: number;
    activeStudents: number;
    retentionRate: number;
    newThisMonth: number;
    growthRate: number;
    totalClasses: number;
    totalInstructors: number;
  };
  attendance: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    rate: number;
  };
  membership: {
    byTier: { tier: string; count: number }[];
  };
  revenue: {
    estimatedMonthly: number;
    estimatedAnnual: number;
    tierBreakdown: { tier: string; count: number; price: number; revenue: number }[];
  };
  atRisk: {
    id: string;
    name: string;
    email: string | null;
    beltRank: string;
    membershipTier: string;
    lastCheckIn: Date | null;
    joinedAt: Date;
    daysSinceCheckIn: number | null;
  }[];
  recentActivity: {
    id: string;
    studentName: string;
    studentBelt: string;
    membershipTier: string;
    className: string;
    checkedInAt: Date;
    method: string;
  }[];
  upcomingClasses: {
    id: string;
    name: string;
    schedule: string;
    location: string | null;
    maxStudents: number;
    registered: number;
    instructorName: string;
  }[];
}

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "finance" | "classes">("overview");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      
      if (data.success) {
        setMetrics(data.metrics);
      } else {
        setError(data.error || "Failed to load dashboard");
      }
    } catch (err) {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return <PageLoading label="Loading dashboard…" />;
  }

  if (error) {
    return (
      <div className="kiwami-page min-h-screen flex items-center justify-center px-4">
        <div className="kiwami-container w-full text-center max-w-md py-20">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-destructive">{error}</p>
          <Link href="/instructor" className="mt-4 inline-block text-primary hover:underline">
            {t("navigation.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StaffShell
      role="admin"
      title={t("admin.title") || "Business Dashboard"}
      subtitle={locale === "ja" ? "ビジネス管理" : "Business Management"}
      actions={
        <Link
          href="/student"
          className="btn-primary !text-xs !px-3 !py-2 !w-auto"
        >
          {t("instructor.studentMode") || "Training"}
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto">
        <div className="sub-tab-nav mb-6 border-b border-border pb-2">
          {[
            { id: "overview", label: t("admin.tabs.overview") || "Overview" },
            { id: "students", label: t("admin.tabs.students") || "Students" },
            { id: "finance", label: t("admin.tabs.finance") || "Finance" },
            { id: "classes", label: t("admin.tabs.classes") || "Classes" },
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

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "overview" && metrics && (
            <>
              <SchoolsOverview />

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title={t("admin.kpi.totalStudents") || "Total Students"}
                  value={metrics.overview.totalStudents}
                  subtitle={`+${metrics.overview.newThisMonth} this month`}
                  trend={metrics.overview.growthRate}
                  color="blue"
                />
                <KpiCard
                  title={t("admin.kpi.activeStudents") || "Active Students"}
                  value={metrics.overview.activeStudents}
                  subtitle={`${metrics.overview.retentionRate}% retention`}
                  color="green"
                />
                <KpiCard
                  title={t("admin.kpi.attendanceToday") || "Check-ins Today"}
                  value={metrics.attendance.today}
                  subtitle={`${metrics.attendance.thisWeek} this week`}
                  color="purple"
                />
                <KpiCard
                  title={t("admin.kpi.monthlyRevenue") || "Monthly Revenue"}
                  value={formatCurrency(metrics.revenue.estimatedMonthly)}
                  subtitle={`${formatCurrency(metrics.revenue.estimatedAnnual)}/year`}
                  color="amber"
                />
              </div>

              {/* At Risk Students */}
              {metrics.atRisk.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                    ⚠️ {t("admin.atRisk.title") || "At-Risk Students"}
                    <span className="text-sm font-normal">({metrics.atRisk.length} {t("admin.atRisk.noShow14") || "haven't attended in 14+ days"})</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-red-500/20">
                          <th className="pb-2">{t("admin.table.name")}</th>
                          <th className="pb-2">{t("admin.table.tier")}</th>
                          <th className="pb-2">{t("admin.table.lastCheckIn")}</th>
                          <th className="pb-2">{t("admin.table.daysMissed")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.atRisk.map((student) => (
                          <tr key={student.id} className="border-b border-red-500/10">
                            <td className="py-2">{student.name}</td>
                            <td className="py-2">
                              <TierBadge tier={student.membershipTier} />
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {student.lastCheckIn 
                                ? formatDate(student.lastCheckIn)
                                : t("admin.never") || "Never"
                              }
                            </td>
                            <td className="py-2 text-red-400 font-medium">
                              {student.daysSinceCheckIn || "∞"} days
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="dashboard-card">
                <h3 className="card-title mb-4">{t("admin.recentActivity") || "Recent activity"}</h3>
                {metrics.recentActivity.length === 0 ? (
                  <div className="empty-state">
                    No check-ins yet. Activity will appear here when students check in to class.
                  </div>
                ) : (
                <div className="space-y-1">
                  {metrics.recentActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          activity.membershipTier === 'ROYAL' ? 'bg-purple-500' :
                          activity.membershipTier === 'GOLD' ? 'bg-amber-500' :
                          'bg-primary/60'
                        }`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{activity.studentName}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.className}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm">{formatDate(activity.checkedInAt)}</p>
                        <p className="text-xs text-muted-foreground uppercase">{activity.method}</p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </>
          )}

          {activeTab === "finance" && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-6">
                  <p className="text-sm text-muted-foreground mb-1">{t("admin.finance.monthlyRecurring")}</p>
                  <p className="text-3xl font-bold text-green-400">{formatCurrency(metrics.revenue.estimatedMonthly)}</p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-muted-foreground mb-1">{t("admin.finance.annualRecurring")}</p>
                  <p className="text-3xl font-bold text-blue-400">{formatCurrency(metrics.revenue.estimatedAnnual)}</p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-muted-foreground mb-1">{t("admin.finance.avgPerStudent")}</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {formatCurrency(metrics.revenue.estimatedMonthly / (metrics.overview.totalStudents || 1))}
                  </p>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-bold mb-4">{t("admin.finance.revenueByTier")}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-neutral-700">
                        <th className="pb-3">{t("admin.table.tier")}</th>
                        <th className="pb-3">{t("admin.table.count")}</th>
                        <th className="pb-3">{t("admin.table.price")}</th>
                        <th className="pb-3 text-right">{t("admin.table.revenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.revenue.tierBreakdown.map((tier) => (
                        <tr key={tier.tier} className="border-b border-border">
                          <td className="py-3"><TierBadge tier={tier.tier} /></td>
                          <td className="py-3">{tier.count}</td>
                          <td className="py-3">{formatCurrency(tier.price)}</td>
                          <td className="py-3 text-right font-bold">{formatCurrency(tier.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && metrics && (
            <div className="dashboard-card">
              <h3 className="card-title mb-4">{t("admin.membershipDistribution") || "Membership breakdown"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.membership.byTier.map((tier) => (
                  <div key={tier.tier} className="stat-tile">
                    <TierBadge tier={tier.tier} />
                    <p className="stat-tile-value mt-3">{tier.count}</p>
                    <p className="stat-tile-label">
                      {metrics.overview.totalStudents
                        ? `${Math.round((tier.count / metrics.overview.totalStudents) * 100)}%`
                        : "0%"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "classes" && metrics && (
            <div className="card p-6">
              <h3 className="font-bold mb-4">{t("admin.upcomingClasses")}</h3>
              <div className="space-y-3">
                {metrics.upcomingClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(cls.schedule)} • {cls.instructorName}
                      </p>
                      {cls.location && (
                        <p className="text-xs text-gray-500">📍 {cls.location}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className={cls.registered >= cls.maxStudents ? "text-red-400" : "text-green-400"}>
                          {cls.registered}
                        </span>
                        /{cls.maxStudents}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("admin.registered")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </StaffShell>
  );
}

function KpiCard({ title, value, subtitle, trend }: {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  color?: "blue" | "green" | "purple" | "amber";
}) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl lg:text-3xl font-heading font-bold">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {trend !== undefined && (
          <span className={`text-xs ${trend >= 0 ? "text-success" : "text-destructive"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    FREE: "bg-gray-500/20 text-muted-foreground",
    YOUTUBE: "bg-blue-500/20 text-blue-400",
    GOLD: "bg-yellow-500/20 text-yellow-400",
    ROYAL: "bg-purple-500/20 text-purple-400",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[tier] || colors.FREE}`}>
      {tier}
    </span>
  );
}
