"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

export default function EmployeeDashboard() {
  const { darkMode } = useTheme();
  const dm = darkMode;

  // ── Page-level design tokens ──────────────────────────────────────────────
  const bg = dm ? "#000000" : "#f0f4f9";
  const panel = dm ? "#0a0a0a" : "#ffffff";
  const surface2 = dm ? "#141414" : "#f1f5f9";
  const border = dm ? "#222222" : "#e2e8f0";
  const text = dm ? "#dde5f0" : "#0f172a";
  const textSoft = dm ? "#6e7a8a" : "#64748b";
  const textFaint = dm ? "#3a3a3a" : "#94a3b8";

  // ── Dark-mode-aware semantic colors (matches leaves page pattern) ─────────
  const C = {
    accent: "#f97316",
    green: dm ? "#34d399" : "#16a34a",   // emerald-400 / green-700
    amber: dm ? "#fbbf24" : "#d97706",   // amber-400  / amber-600
    red: dm ? "#f87171" : "#dc2626",   // red-400    / red-600
    indigo: dm ? "#818cf8" : "#4f46e5",   // indigo-400 / indigo-600
    purple: dm ? "#c084fc" : "#9333ea",   // purple-400 / purple-600
    gold: dm ? "#fcd34d" : "#b45309",   // amber-300  / amber-700 (incentive)
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [employeeName, setEmployeeName] = useState("Team Member");
  const [docsPending, setDocsPending] = useState<number>(0);
  const [docsTotal, setDocsTotal] = useState<number>(0);
  const [presentDays, setPresentDays] = useState<number | null>(null);
  const [absentDays, setAbsentDays] = useState<number | null>(null);
  const [underHoursDays, setUnderHoursDays] = useState<number | null>(null);
  const [upcomingHoliday, setUpcomingHoliday] = useState<any>(null);
  const [latestIncentive, setLatestIncentive] = useState<any>(null);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) setEmployeeName(storedName);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoadingData(true);

    let empId = localStorage.getItem("user_id");
    if (empId) empId = empId.replace(/['"]+/g, "");
    if (!empId) { setIsLoadingData(false); return; }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // 1. Docs
    try {
      const REQUIRED_STEPS = 2;
      let completedSteps = 0;
      const [bankRes, docsRes] = await Promise.all([
        supabase.from("employee_bank_details").select("employee_id").eq("employee_id", empId).limit(1),
        supabase.from("employee_documents").select("employee_id").eq("employee_id", empId).limit(1),
      ]);
      if (bankRes.data && bankRes.data.length > 0) completedSteps++;
      if (docsRes.data && docsRes.data.length > 0) completedSteps++;
      setDocsTotal(REQUIRED_STEPS);
      setDocsPending(REQUIRED_STEPS - completedSteps);
    } catch { setDocsTotal(2); setDocsPending(2); }

    // 2. Attendance
    try {
      const { data: holidayData } = await supabase
        .from("company_holidays").select("holiday_date")
        .gte("holiday_date", monthStart).lte("holiday_date", today);
      const holidaySet = new Set((holidayData || []).map((h: any) => h.holiday_date));
      const { data: attendanceData } = await supabase
        .from("attendance").select("date,total_work_seconds,status")
        .eq("employee_id", empId).gte("date", monthStart).lte("date", today);
      const recordMap = new Map<string, any>();
      (attendanceData || []).forEach((row: any) => recordMap.set(row.date, row));
      let present = 0, underHours = 0, absent = 0;
      for (let d = 1; d <= now.getDate(); d++) {
        const date = new Date(now.getFullYear(), now.getMonth(), d);
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (date.getDay() === 0 || holidaySet.has(dateStr)) continue;
        const record = recordMap.get(dateStr);
        if (dateStr === today && record && (record.status === "active" || record.status === "paused")) continue;
        if (!record) absent++;
        else if (record.total_work_seconds >= 28800) present++;
        else underHours++;
      }
      setPresentDays(present); setAbsentDays(absent); setUnderHoursDays(underHours);
    } catch { /* silent */ }

    // 3. Holiday
    try {
      const { data } = await supabase.from("company_holidays").select("*")
        .gte("holiday_date", today).order("holiday_date", { ascending: true }).limit(1);
      if (data && data.length > 0) setUpcomingHoliday(data[0]);
    } catch { /* silent */ }

    // 4. Incentive
    try {
      const { data } = await supabase.from("payroll_incidents").select("*")
        .eq("employee_id", empId).order("created_at", { ascending: false }).limit(1);
      if (data && data.length > 0) setLatestIncentive(data[0]);
    } catch { /* silent */ }

    // 5. Projects
    try {
      const { data } = await supabase.from("project_assignments")
        .select("project_id, company_projects(id,project_name,client_name,status)")
        .eq("employee_id", empId);
      if (data) {
        setActiveProjects(
          data.map((a: any) => a.company_projects)
            .filter((p: any) => p && ["planning", "in progress", "review", "completed"].includes(p.status?.toLowerCase()))
        );
      }
    } catch { /* silent */ }

    setIsLoadingData(false);
  };

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  // ── Sub-components ────────────────────────────────────────────────────────

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 12px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 99, background: C.accent }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: textFaint, textTransform: "uppercase", letterSpacing: "1.4px" }}>{label}</span>
    </div>
  );

  const Skeleton = ({ w = "100%", h = 12 }: { w?: string | number; h?: number }) => (
    <div style={{ height: h, borderRadius: 4, background: surface2, width: w, animation: "shimmer 1.5s ease-in-out infinite" }} />
  );

  const StatCard = ({
    label, children, accent, span2,
  }: { label: string; children: React.ReactNode; accent?: string; span2?: boolean }) => (
    <div style={{
      background: panel, borderRadius: 16, border: `1px solid ${border}`,
      padding: "20px 24px",
      boxShadow: dm ? "none" : "0 1px 3px 0 rgba(0,0,0,0.05)",
      transition: "all 0.3s ease", position: "relative", overflow: "hidden",
      gridColumn: span2 ? "span 2" : undefined,
    }}>
      {accent && (
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          width: 56, height: 56, borderRadius: "0 56px 0 0",
          background: accent + "0A", pointerEvents: "none",
        }} />
      )}
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: textFaint, margin: "0 0 10px" }}>
        {label}
      </p>
      {children}
    </div>
  );

  const SummaryCard = ({
    iconBg, iconColor, icon, title, children,
  }: { iconBg: string; iconColor: string; icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div style={{
      background: panel, padding: "20px 22px", borderRadius: 20,
      border: `1px solid ${border}`,
      boxShadow: dm ? "none" : "0 1px 3px 0 rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      transition: "all 0.3s ease", minHeight: 144,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: text, lineHeight: 1.3 }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const StatusBadge = ({ label, color }: { label: string; color: string }) => (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
      color, background: color + "18", border: `1px solid ${color}30`,
    }}>{label}</span>
  );

  // ── Derived icon colors (dark-mode aware) ─────────────────────────────────
  const docsGreen = docsPending === 0 && docsTotal > 0;
  const docIconColor = docsGreen ? C.green : C.amber;
  const docIconBg = docIconColor + "20";

  return (
    <div
      style={{ minHeight: "100vh", padding: "32px 40px", transition: "background 0.3s, color 0.3s", background: bg, color: text }}
      className="antialiased"
    >

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
        gap: 16, padding: "20px 24px", borderRadius: 16,
        border: `1px solid ${border}`, background: panel,
        boxShadow: dm ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
        marginBottom: 28,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>
            Employee Portal
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: text, margin: "0 0 4px", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            Hello, <span style={{ color: textSoft }}>{employeeName}</span>!
          </h1>
          <p style={{ fontSize: 12, fontWeight: 600, color: textFaint, margin: 0 }}>
            Welcome to your Rakvih workstation.
          </p>
        </div>
      </div>

      {/* ── TOP STATS ROW ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>

        {/* Active Projects */}
        <StatCard label="Active Allocations" accent={C.indigo}>
          {isLoadingData ? <Skeleton w="55%" h={28} /> : (
            <>
              <p style={{ margin: "0 0 4px", fontSize: "1.75rem", fontWeight: 900, color: C.indigo, letterSpacing: "-0.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {activeProjects.length} {activeProjects.length === 1 ? "Project" : "Projects"}
              </p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: textSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeProjects.length > 0
                  ? activeProjects.map(p => p.project_name).join(", ")
                  : "No active projects right now"}
              </p>
            </>
          )}
        </StatCard>

        {/* Attendance — 3 micro-stats */}
        <StatCard label="This Month's Attendance" accent={C.green}>
          {isLoadingData ? <Skeleton w="75%" h={28} /> : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 4 }}>
              {[
                { val: presentDays ?? 0, label: "Present", color: C.green },
                { val: underHoursDays ?? 0, label: "Under 8h", color: C.amber },
                { val: absentDays ?? 0, label: "Absent", color: C.red },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, color: s.color, letterSpacing: "-0.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                      {s.val}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      {s.label}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 1, height: 40, background: border, alignSelf: "center" }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </StatCard>
      </div>

      {/* ── SUMMARY CARDS (4-up) ───────────────────────────────────────────── */}
      <SectionLabel label="Overview" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)", // Forces exactly 4 columns
        gap: 16
      }}>
        {/* 1 — Document Process */}
        <SummaryCard
          iconBg={docIconBg}
          iconColor={docIconColor}
          title="Document Process"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          {isLoadingData ? <Skeleton h={40} /> : docsTotal === 0 ? (
            <div>
              <StatusBadge label="Action Required" color={C.red} />
              <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: "8px 0 0" }}>Complete your onboarding docs.</p>
            </div>
          ) : docsPending === 0 ? (
            <div>
              <StatusBadge label="All Completed" color={C.green} />
              <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: "8px 0 0" }}>{docsTotal} of {docsTotal} submitted.</p>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: "1.5rem", fontWeight: 900, color: C.amber, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                {docsPending} <span style={{ fontSize: 12, fontWeight: 700, color: textFaint }}>/ {docsTotal}</span>
              </p>
              <StatusBadge label="Pending" color={C.amber} />
              <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: "8px 0 0" }}>{docsPending} doc{docsPending > 1 ? "s" : ""} outstanding.</p>
            </div>
          )}
        </SummaryCard>

        {/* 2 — Recent Absences */}
        <SummaryCard
          iconBg={C.red + "20"} iconColor={C.red}
          title="Recent Absences"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {isLoadingData ? <Skeleton h={40} /> : absentDays !== null && absentDays > 0 ? (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: "1.5rem", fontWeight: 900, color: C.red, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                {absentDays} {absentDays === 1 ? "Day" : "Days"}
              </p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: 0 }}>Zero hours logged on these days.</p>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: "1.5rem", fontWeight: 900, color: text }}>Zero</p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: 0 }}>No absences this month. Great work!</p>
            </div>
          )}
        </SummaryCard>

        {/* 3 — Upcoming Holiday */}
        <SummaryCard
          iconBg={C.indigo + "20"} iconColor={C.indigo}
          title="Upcoming Holiday"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        >
          {isLoadingData ? <Skeleton h={40} /> : upcomingHoliday ? (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 900, color: C.indigo, letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={upcomingHoliday.title}>
                {upcomingHoliday.title}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: textSoft }}>{formatDate(upcomingHoliday.holiday_date)}</p>
              {upcomingHoliday.category && <StatusBadge label={upcomingHoliday.category} color={C.indigo} />}
            </div>
          ) : (
            <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: 0 }}>No company holidays scheduled nearby.</p>
          )}
        </SummaryCard>

        {/* 4 — Latest Incentive */}
        <SummaryCard
          iconBg={C.gold + "20"} iconColor={C.gold}
          title="Latest Incentive"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {isLoadingData ? <Skeleton h={40} /> : latestIncentive ? (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 900, color: text, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                ₹{latestIncentive.amount || 0}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 600, color: textSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={latestIncentive.reason || latestIncentive.description}>
                {latestIncentive.reason || latestIncentive.description || latestIncentive.incident_type || "Payroll Reward"}
              </p>
              <StatusBadge
                label={latestIncentive.payment_status?.toLowerCase() === "paid" ? "Paid" : "Unpaid"}
                color={latestIncentive.payment_status?.toLowerCase() === "paid" ? C.green : C.red}
              />
            </div>
          ) : (
            <p style={{ fontSize: 11.5, fontWeight: 600, color: textSoft, margin: 0 }}>No recent incentives yet.</p>
          )}
        </SummaryCard>

      </div>

      {/* ── GLOBAL ANIMATIONS ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>

    </div>
  );
}