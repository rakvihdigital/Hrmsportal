"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Dark mode: deep navy slate base with coral-amber accent
// Light mode: clean cool-white with the same accent
const DT = {
  // Accent — the ONE bold color, used sparingly
  accent: "#f97316",   // coral-amber
  accentSoft: "#f9731618",
  accentBorder: "#f9731630",

  // Status palette
  green: "#22c55e",
  amber: "#f59e0b",
  orange: "#f97316",
  blue: "#3b82f6",
  purple: "#a855f7",
  red: "#ef4444",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  zinc: "#71717a",
};

const HORIZON_LABELS: Record<string, string> = {
  "1m": "1 Month", "3m": "3 Months", "6m": "6 Months",
  "9m": "9 Months", "1y": "1 Year",
};

const STATUS_COLORS: Record<string, string> = {
  Active: DT.green, Planning: DT.amber, Completed: DT.indigo, "On Hold": DT.red,
};

const INCIDENT_COLORS: Record<string, string> = {
  bonus: DT.green, deduction: DT.red, allowance: DT.blue, incentive: DT.purple,
};

const TEMPLATE_TYPES = [
  { id: "onboarding", label: "Onboarding" },
  { id: "commencement", label: "Commencement" },
  { id: "confirmation", label: "Confirmation" },
  { id: "offer_letter", label: "Offer Letter" },
  { id: "bank_details", label: "Bank Details" },
  { id: "appointment", label: "Appointment" },
  { id: "policy_document", label: "Policy Doc" },
];
const TEMPLATE_LABEL_MAP = Object.fromEntries(TEMPLATE_TYPES.map(t => [t.id, t.label]));

const TEMPLATE_COLORS: Record<string, string> = {
  onboarding: DT.blue, commencement: DT.purple, confirmation: DT.green,
  offer_letter: DT.amber, bank_details: DT.cyan, appointment: DT.indigo,
  policy_document: DT.rose, general: DT.zinc,
};

const MONTHLY_SALARY = 18500;
const TARGET_SECONDS = 28800;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAttendanceStatus(record: any): "absent" | "ongoing" | "below6h" | "below8h" | "present" {
  if (!record) return "absent";
  const secs = record.total_work_seconds || 0;
  if (record.start_time && !record.end_time) return "ongoing";
  if (secs > 0 && secs < 21600) return "below6h";
  if (secs >= 21600 && secs < TARGET_SECONDS) return "below8h";
  if (secs >= TARGET_SECONDS) return "present";
  return "absent";
}

async function getMonthWorkingDays(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const { data: holidays } = await supabase
    .from("company_holidays").select("holiday_date")
    .gte("holiday_date", start.toISOString().slice(0, 10))
    .lte("holiday_date", end.toISOString().slice(0, 10));
  const holidaySet = new Set((holidays || []).map((h: any) => h.holiday_date));
  let sundays = 0, holidayCount = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getDay() === 0) sundays++;
    else if (holidaySet.has(iso)) holidayCount++;
  }
  const totalDays = end.getDate();
  const workingDays = totalDays - sundays - holidayCount;
  const perDay = workingDays > 0 ? Math.round(MONTHLY_SALARY / workingDays) : 0;
  return { totalDays, sundays, holidayCount, workingDays, perDay };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name = "", size = 40 }: { name?: string; size?: number }) {
  const initials = name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue},45%,42%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.36,
      flexShrink: 0, letterSpacing: "-0.5px",
      boxShadow: `0 0 0 2px hsl(${hue},45%,42%)28`,
    }}>{initials}</div>
  );
}

// ─── Badge Pill ───────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      color, background: color + "18", border: `1px solid ${color}30`,
      whiteSpace: "nowrap", textTransform: "uppercase",
    }}>{label}</span>
  );
}

// ─── Employee Drawer ──────────────────────────────────────────────────────────
function EmployeeDrawer({ employeeBase, onClose, darkMode }: {
  employeeBase: any; onClose: () => void; darkMode: boolean;
}) {
  const [tab, setTab] = useState("info");
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [payMonth, setPayMonth] = useState(today.getMonth() + 1);
  const [payYear, setPayYear] = useState(today.getFullYear());
  const [monthInfo, setMonthInfo] = useState<any>(null);
  const [monthRecords, setMonthRecords] = useState<any[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const dm = darkMode;
  // Navy-dark drawer tokens
  const bg = dm ? "#0d1520" : "#ffffff";
  const surface = dm ? "#141e2e" : "#f8fafc";
  const surface2 = dm ? "#1a2640" : "#f1f5f9";
  const border = dm ? "#1e2d42" : "#e2e8f0";
  const text = dm ? "#e8edf5" : "#0f172a";
  const textSoft = dm ? "#7a8fa8" : "#64748b";
  const textFaint = dm ? "#3d5068" : "#94a3b8";

  useEffect(() => {
    if (!employeeBase) return;
    setTab("info"); setLoading(true); setDetails(null);
    async function fetchAll() {
      const empId = employeeBase.id;
      const empTextId = employeeBase.employee_id;
      const [bankRes, docsRes, attRes, payRes, projAssignRes] = await Promise.all([
        supabase.from("employee_bank_details").select("*").eq("employee_id", empTextId).maybeSingle(),
        supabase.from("employee_documents").select("*").eq("employee_id", empTextId).order("created_at", { ascending: false }),
        supabase.from("attendance").select("date,total_work_seconds,status,break_seconds,working_on,start_time,end_time")
          .eq("employee_id", empId).order("date", { ascending: false }),
        supabase.from("payroll_incidents").select("id,date,type,amount,description,payment_status,project_id")
          .eq("employee_id", empId).order("date", { ascending: false }),
        supabase.from("project_assignments")
          .select("project_id, company_projects(id,project_name,client_name,status,sector,budget,start_date,end_date)")
          .eq("employee_id", empId),
      ]);
      const attRows = attRes.data || [];
      let present = 0, below8h = 0, below6h = 0, ongoing = 0, absent = 0, totalWorkSec = 0;

      // Build record map and fetch holidays to count absent correctly
      const recMap: Record<string, any> = {};
      attRows.forEach((r: any) => { recMap[r.date] = r; });

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();
      const todayIso = now.toISOString().slice(0, 10);

      const { data: holidayRows } = await supabase
        .from("company_holidays")
        .select("holiday_date")
        .gte("holiday_date", `${year}-${String(month + 1).padStart(2, "0")}-01`)
        .lte("holiday_date", todayIso);

      const holidaySet = new Set((holidayRows || []).map((h: any) => h.holiday_date));

      for (let d = 1; d <= todayDate; d++) {
        const date = new Date(year, month, d);
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (date.getDay() === 0 || holidaySet.has(dateStr)) continue;

        const r = recMap[dateStr];
        if (!r) { absent++; continue; }

        const st = getAttendanceStatus(r);
        if (st === "present") present++;
        else if (st === "below8h") below8h++;
        else if (st === "below6h") below6h++;
        else if (st === "ongoing") ongoing++;
        // below6h rows still exist in DB so they don't count as absent
        totalWorkSec += r.total_work_seconds || 0;
      }

      const countedDays = present + below8h + below6h + ongoing;
      const avgHours = countedDays > 0 ? Math.round((totalWorkSec / countedDays / 3600) * 10) / 10 : 0;
      setDetails({
        bank: bankRes.data || null,
        documents: docsRes.data || [],
        attendance: { rows: attRows, total_days: attRows.length, present, below8h, below6h, ongoing, absent, avg_hours: avgHours },
        payroll: payRes.data || [],
        projects: (projAssignRes.data || []).map((a: any) => a.company_projects).filter(Boolean),
      });
      setLoading(false);
    }
    fetchAll();
  }, [employeeBase?.id]);

  useEffect(() => {
    if (!employeeBase || tab !== "payroll") return;
    async function loadMonth() {
      setMonthLoading(true);
      const start = `${payYear}-${String(payMonth).padStart(2, "0")}-01`;
      const endDate = new Date(payYear, payMonth, 0);
      const end = endDate.toISOString().slice(0, 10);
      const [{ data: att }, mi] = await Promise.all([
        supabase.from("attendance").select("date,total_work_seconds,status,start_time,end_time,working_on")
          .eq("employee_id", employeeBase.id).gte("date", start).lte("date", end).order("date", { ascending: false }),
        getMonthWorkingDays(payYear, payMonth),
      ]);
      setMonthRecords(att || []);
      setMonthInfo(mi);
      setMonthLoading(false);
    }
    loadMonth();
  }, [employeeBase?.id, tab, payMonth, payYear]);

  if (!employeeBase) return null;

  const tabs = [
    { id: "info", label: "Profile" },
    { id: "bank", label: "Bank" },
    { id: "docs", label: "Docs" },
    { id: "attendance", label: "Attendance" },
    { id: "payroll", label: "Payroll" },
    { id: "projects", label: "Projects" },
  ];

  let monthStats: any = null;
  if (monthInfo) {
    const recMap: Record<string, any> = {};
    monthRecords.forEach((r) => { recMap[r.date] = r; });
    let present = 0, below8h = 0, below6h = 0, ongoing = 0, absent = 0;
    const endDate = new Date(payYear, payMonth, 0);
    for (let d = new Date(payYear, payMonth - 1, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue;
      const iso = d.toISOString().slice(0, 10);
      const st = getAttendanceStatus(recMap[iso]);
      if (st === "present") present++;
      else if (st === "below8h") below8h++;
      else if (st === "below6h") below6h++;
      else if (st === "ongoing") ongoing++;
      else absent++;
    }
    const paidAbsent = below6h + absent;
    const payableDays = Math.max(0, monthInfo.workingDays - paidAbsent);
    monthStats = { present, below8h, below6h, ongoing, absent, payableDays, salary: payableDays * monthInfo.perDay, workingDays: monthInfo.workingDays };
  }

  const sentEmails: string[] = Array.isArray(employeeBase.sent_emails) ? employeeBase.sent_emails : [];

  // ── Scoped sub-components ──
  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 12px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 99, background: DT.accent }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: textFaint, textTransform: "uppercase", letterSpacing: "1.4px" }}>{label}</span>
    </div>
  );

  const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => {
    if (!value) return null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start", padding: "10px 0", borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: textFaint, textTransform: "uppercase", letterSpacing: "0.4px", paddingTop: 2 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: text, fontFamily: mono ? "'JetBrains Mono','Fira Code',monospace" : "inherit", wordBreak: "break-all" }}>{value}</span>
      </div>
    );
  };

  const Empty = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
    <div style={{ textAlign: "center", padding: "40px 20px", borderRadius: 12, border: `1px dashed ${border}`, marginTop: 8 }}>
      <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: textSoft }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: textFaint, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const StatGrid = ({ stats }: { stats: { label: string; value: any; color: string }[] }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, marginBottom: 16 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          padding: "14px 10px 10px", borderRadius: 10,
          border: `1px solid ${border}`,
          background: surface2,
          position: "relative", overflow: "hidden",
          textAlign: "center",
        }}>
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: "0 0 4px 4px", background: s.color }} />
          <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: textFaint, textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 5 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(8px)",
          transition: "opacity 0.2s ease"
        }}
      />

      {/* Panel Container */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
        width: "min(560px, 100vw)",
        background: bg, color: text,
        borderLeft: `1px solid ${border}`,
        boxShadow: "-16px 0 48px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        animation: "drawerIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "32px 28px 24px", background: surface, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Avatar name={employeeBase.name} size={60} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: text, lineHeight: 1.2, marginBottom: 4, letterSpacing: "-0.5px" }}>
                {employeeBase.name}
              </div>
              <div style={{ fontSize: 13, color: textSoft, fontFamily: "monospace", letterSpacing: "-0.1px" }}>
                {employeeBase.email}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: `1px solid ${border}`, borderRadius: 8,
                width: 36, height: 36, cursor: "pointer", color: text,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                flexShrink: 0, transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = text;
                e.currentTarget.style.color = bg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = text;
              }}
            >
              ✕
            </button>
          </div>

          {/* Inline Minimalist Meta Strip */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 20 }}>
            {employeeBase.employee_id && (
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, padding: "3px 8px", background: surface2, border: `1px solid ${border}`, borderRadius: 4 }}>
                ID: {employeeBase.employee_id}
              </span>
            )}
            {employeeBase.role && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", background: surface2, border: `1px solid ${border}`, borderRadius: 4, color: textSoft }}>
                {employeeBase.role}
              </span>
            )}
            {employeeBase.withdrawal_horizon && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", background: surface2, border: `1px solid ${border}`, borderRadius: 4, color: textSoft }}>
                Horizon: {HORIZON_LABELS[employeeBase.withdrawal_horizon] || employeeBase.withdrawal_horizon}
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
              background: employeeBase.has_received_email ? "rgba(0,0,0,0.05)" : "transparent",
              border: employeeBase.has_received_email ? `1px solid ${border}` : "1px dashed #ffcf0f",
              color: employeeBase.has_received_email ? textSoft : "#ffcf0f"
            }}>
              {employeeBase.has_received_email
                ? `✓ ${sentEmails.length} / ${TEMPLATE_TYPES.length} Emails Sent`
                : "Mail Pending"}
            </span>
          </div>
        </div>

        {/* ── TABS (Underlined Minimalist Style) ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: bg, flexShrink: 0, overflowX: "auto", padding: "0 28px" }}>
          {tabs.map(t => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: "none", padding: "16px 0", marginRight: 24,
                  background: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase",
                  color: isActive ? text : textFaint,
                  borderBottom: `2px solid ${isActive ? "#ffcf0f" : "transparent"}`,
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  transition: "all 0.15s ease", whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── MAIN SCROLLABLE CONTENT ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 48px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
              {[80, 55, 70, 45, 60].map((w, i) => (
                <div key={i} style={{ height: 12, borderRadius: 2, background: surface2, width: `${w}%`, animation: "shimmer 1.6s ease-in-out infinite" }} />
              ))}
            </div>
          ) : (
            <>
              {/* TAB: BASIC INFO */}
              {tab === "info" && (
                <div>
                  <SectionLabel label="Identity Configuration" />
                  <Field label="Full Legal Name" value={employeeBase.name} />
                  <Field label="Corporate Email" value={employeeBase.email} mono />
                  <Field label="Employee ID" value={employeeBase.employee_id || "—"} mono />
                  <Field label="Assigned Role" value={employeeBase.role || "—"} />
                  <Field label="Create Employe ID" value={new Date(employeeBase.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
                  <Field label="Horizon Level" value={HORIZON_LABELS[employeeBase.withdrawal_horizon] || "—"} />

                  <SectionLabel label="Dispatched Email Communications Log" />
                  {sentEmails.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                      {sentEmails.map((k, i) => (
                        <div key={`${k}-${i}`} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 16px", borderRadius: 8,
                          border: `1px solid ${border}`, background: surface,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffcf0f" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {TEMPLATE_LABEL_MAP[k] || k}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, color: textFaint, fontFamily: "monospace", textTransform: "uppercase", fontWeight: 600 }}>DISPATCHED</span>
                        </div>
                      ))}
                    </div>
                  ) : <Empty icon="✉️" title="No logs recorded" sub="No communication dispatch sequences run for this employee profile." />}
                </div>
              )}

              {/* TAB: BANK ACCOUNT */}
              {tab === "bank" && (
                <div>
                  <SectionLabel label="Settlement Vault Parameters" />
                  {details.bank ? (
                    <>
                      <Field label="Account Title Holder" value={details.bank.account_holder} />
                      <Field label="Banking Institution" value={details.bank.bank_name} />
                      <Field label="Account Routing Sequence" value={details.bank.account_number} mono />
                      <Field label="IFSC Clearance Code" value={details.bank.ifsc_code} mono />
                    </>
                  ) : <Empty icon="🏦" title="Vault coordinates empty" sub="No banking data fields mapped to this record." />}
                </div>
              )}

              {/* TAB: DOCUMENTS */}
              {tab === "docs" && (
                <div>
                  <SectionLabel label={`Verification Dossiers (${details.documents.length})`} />
                  {details.documents.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {details.documents.map((doc: any) => (
                        <div key={doc.id} style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "14px 16px", borderRadius: 8,
                          border: `1px solid ${border}`, background: surface,
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: surface2, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                            DOC
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 2 }}>{doc.document_type}</div>
                            <div style={{ fontSize: 11, color: textFaint, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_path}</div>
                          </div>
                          <a
                            href={doc.file_path} target="_blank" rel="noreferrer"
                            style={{
                              padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                              color: "#000", background: "#ffcf0f", textDecoration: "none", flexShrink: 0,
                              textTransform: "uppercase", letterSpacing: "0.3px", transition: "opacity 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          >
                            Open
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : <Empty icon="📂" title="No objects uploaded" />}
                </div>
              )}

              {/* TAB: ATTENDANCE */}
              {tab === "attendance" && (
                <div>
                  <SectionLabel label="Historical Lifecycle Matrix" />
                  <StatGrid stats={[
                    { label: "Toal Working Days", value: details.attendance.total_days, color: text },
                    { label: "Present Days", value: details.attendance.present, color: text },
                    { label: "Short Days (<8h)", value: details.attendance.below8h, color: textSoft },
                    { label: "Half Days (<6h)", value: details.attendance.below6h, color: textSoft },
                    { label: "Active Ongoing", value: details.attendance.ongoing, color: textSoft },
                    { label: "Absent", value: details.attendance.absent, color: textFaint },
                    { label: "AVG Hr Worked", value: `${details.attendance.avg_hours}h`, color: text },
                  ]} />

                  {details.attendance.total_days > 0 && (
                    <div style={{ marginBottom: 20, padding: "16px", borderRadius: 8, border: `1px solid ${border}`, background: surface }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: textSoft }}>Attendance Vector Rate</span>
                        <span style={{ fontWeight: 800, color: text, fontVariantNumeric: "tabular-nums" }}>
                          {Math.round((details.attendance.present / details.attendance.total_days) * 100)}%
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: surface2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          background: "#ffcf0f",
                          width: `${(details.attendance.present / details.attendance.total_days) * 100}%`,
                          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)"
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: textSoft, background: surface, border: `1px solid ${border}`, borderRadius: 6, padding: "12px 14px", marginBottom: 24, lineHeight: 1.6 }}>
                    * Deficit configurations are parsed sequentially on legal corporate schedules, matching system logs against master calendars.
                  </div>

                  {details.attendance.rows.length > 0 && (
                    <>
                      <SectionLabel label="Recent Timeline (This Month)" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = now.getMonth();
                          const todayDate = now.getDate();
                          const recMap: Record<string, any> = {};
                          details.attendance.rows.forEach((r: any) => { recMap[r.date] = r; });

                          const rows = [];
                          for (let d = todayDate; d >= 1; d--) {
                            const date = new Date(year, month, d);
                            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            const isSunday = date.getDay() === 0;

                            // Show Sundays as rest days
                            if (isSunday) {
                              rows.push(
                                <div key={dateStr} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "12px 16px", borderRadius: 6,
                                  border: `1px dashed ${border}`, background: "transparent", opacity: 0.4,
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: textFaint, width: 110, flexShrink: 0 }}>
                                    {new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                  </span>
                                  <span style={{ fontSize: 11, color: textFaint, flex: 1 }}>—</span>
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, border: `1px solid ${border}`, color: textFaint }}>
                                    SUNDAY
                                  </span>
                                </div>
                              );
                              continue;
                            }

                            const r = recMap[dateStr];
                            if (!r) {
                              // Absent — no record
                              rows.push(
                                <div key={dateStr} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "12px 16px", borderRadius: 6,
                                  border: `1px solid ${DT.red}30`,
                                  background: DT.red + "08",
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: text, width: 110, flexShrink: 0 }}>
                                    {new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                  </span>
                                  <span style={{ fontSize: 12, color: textFaint, flex: 1 }}>No session logged</span>
                                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: textFaint, flexShrink: 0, marginRight: 8 }}>
                                    0.0h
                                  </span>
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, border: `1px solid ${DT.red}40`, color: DT.red }}>
                                    ABSENT
                                  </span>
                                </div>
                              );
                            } else {
                              const hrs = r.total_work_seconds ? (r.total_work_seconds / 3600).toFixed(1) : "0.0";
                              const st = getAttendanceStatus(r);
                              const isOptimal = st === "present";
                              rows.push(
                                <div key={dateStr} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "12px 16px", borderRadius: 6,
                                  border: `1px solid ${border}`,
                                  background: surface,
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: text, width: 110, flexShrink: 0 }}>
                                    {new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                  </span>
                                  <span style={{ fontSize: 12, color: textFaint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {r.working_on || "—"}
                                  </span>
                                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: textSoft, flexShrink: 0, fontVariantNumeric: "tabular-nums", marginRight: 8 }}>
                                    {hrs}h
                                  </span>
                                  <span style={{
                                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.3px", textTransform: "uppercase",
                                    border: `1px solid ${isOptimal ? border : "#ffcf0f"}`,
                                    color: isOptimal ? textFaint : "#ffcf0f",
                                  }}>
                                    {st}
                                  </span>
                                </div>
                              );
                            }
                          }
                          return rows;
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: PAYROLL MATRIX */}
              {tab === "payroll" && (
                <div>
                  <SectionLabel label="Chronological Ledger Select" />
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {[
                      { val: payMonth, opts: Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: new Date(2000, i).toLocaleString("en-IN", { month: "long" }) })), onChange: (v: number) => setPayMonth(v) },
                      { val: payYear, opts: [2024, 2025, 2026].map(y => ({ v: y, l: String(y) })), onChange: (v: number) => setPayYear(v) },
                    ].map((sel, si) => (
                      <select key={si} value={sel.val} onChange={e => sel.onChange(Number(e.target.value))} style={{
                        padding: "8px 14px", border: `1px solid ${border}`, borderRadius: 6,
                        fontSize: 12, fontWeight: 700, color: text, background: surface, outline: "none", cursor: "pointer",
                      }}>
                        {sel.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ))}
                  </div>

                  {monthLoading || !monthStats ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2, 3].map(i => <div key={i} style={{ height: 48, borderRadius: 6, background: surface2, animation: "shimmer 1.5s ease-in-out infinite" }} />)}
                    </div>
                  ) : (
                    <>
                      <StatGrid stats={[
                        { label: "Working Days", value: monthStats.workingDays, color: textSoft },
                        { label: "Full Days (8h+)", value: monthStats.present, color: text },
                        { label: "Short Days (6–8h)", value: monthStats.below8h, color: textSoft },
                        { label: "Half Days (<6h)", value: monthStats.below6h, color: textSoft },
                        { label: "Absent", value: monthStats.absent, color: textFaint },
                        { label: "Payable Days", value: monthStats.payableDays, color: text },
                      ]} />

                      {/* Premium High-Contrast Salary Banner */}
                      <div style={{
                        borderRadius: 8, border: `1px solid ${border}`,
                        background: surface,
                        padding: "24px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        flexWrap: "wrap", gap: 16, marginBottom: 28,
                      }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: textFaint, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Calculated Net Gross</div>
                          <div style={{ fontSize: 32, fontWeight: 800, color: text, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
                            ₹{monthStats.salary.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: textSoft, textAlign: "right", lineHeight: 1.6, fontFamily: "monospace" }}>
                          <div>₹{monthInfo?.perDay}/unit × {monthStats.payableDays} base units</div>
                          <div style={{ color: textFaint }}>Excl: {monthInfo?.sundays} Sun / {monthInfo?.holidayCount} Rest Frameworks</div>
                        </div>
                      </div>
                    </>
                  )}

                  <SectionLabel label={`Ledger Exception Events (${details.payroll.length})`} />
                  {details.payroll.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {details.payroll.map((inc: any) => {
                        const isDeduction = inc.type === "deduction";
                        return (
                          <div key={inc.id} style={{
                            padding: "14px 16px", borderRadius: 8,
                            border: `1px solid ${border}`,
                            background: surface,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                              <div>
                                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.3px", padding: "2px 6px", border: `1px solid ${border}`, borderRadius: 4, background: surface2 }}>
                                    {inc.type}
                                  </span>
                                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: textFaint }}>
                                    {inc.payment_status}
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{inc.description}</div>
                                <div style={{ fontSize: 10.5, color: textFaint, marginTop: 2 }}>{new Date(inc.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: isDeduction ? text : "#ffcf0f", fontVariantNumeric: "tabular-nums" }}>
                                {isDeduction ? "−" : "+"}₹{Number(inc.amount).toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <Empty icon="💸" title="No ledger logs matching parameters" sub="No exceptions, deductions, or variations calculated manually." />}
                </div>
              )}

              {/* TAB: ASSIGNED PROJECTS */}
              {tab === "projects" && (
                <div>
                  <SectionLabel label={`Assigned Ecosystem Blueprints (${details.projects.length})`} />
                  {details.projects.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {details.projects.map((proj: any) => (
                        <div key={proj.id} style={{
                          padding: "16px", borderRadius: 8,
                          border: `1px solid ${border}`,
                          background: surface,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 4 }}>{proj.project_name}</div>
                              {proj.client_name && <div style={{ fontSize: 12, color: textSoft }}>Account Matrix: <strong>{proj.client_name}</strong></div>}
                              <div style={{ fontSize: 11, color: textFaint, marginTop: 2 }}>Domain Range: {proj.sector}</div>
                              {proj.budget > 0 && <div style={{ fontSize: 11, color: textSoft, fontFamily: "monospace", marginTop: 2 }}>Threshold Asset Cap: ₹{Number(proj.budget).toLocaleString("en-IN")}</div>}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", background: surface2, border: `1px solid ${border}`, borderRadius: 4, letterSpacing: "0.3px" }}>
                              {proj.status}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 16, fontSize: 11, color: textFaint, borderTop: `1px dashed ${border}`, paddingTop: 10, fontFamily: "monospace" }}>
                            <span>INIT // {new Date(proj.start_date).toLocaleDateString("en-IN")}</span>
                            {proj.end_date && <span>TERM // {new Date(proj.end_date).toLocaleDateString("en-IN")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty icon="🗂️" title="No infrastructure paths mapped" sub="This workspace identity does not map directly to any operational matrices." />}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Global CSS Injectors for Animation Sequences */}
      <style>{`
        @keyframes drawerIn  { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes shimmer   { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeListPage() {
  const { darkMode } = useTheme();
  const dm = darkMode;

  // Page-level design tokens — deep navy in dark, cool slate-white in light
  const bg = dm ? "#080e18" : "#f0f4f9";
  const panel = dm ? "#0d1520" : "#ffffff";
  const surface = dm ? "#111d2e" : "#f8fafc";
  const surface2 = dm ? "#16243a" : "#f1f5f9";
  const border = dm ? "#1a2d44" : "#e2e8f0";
  const text = dm ? "#dde5f0" : "#0f172a";
  const textSoft = dm ? "#6e85a0" : "#64748b";
  const textFaint = dm ? "#354d63" : "#94a3b8";
  const inputBg = dm ? "#0d1828" : "#f8fafc";

  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [horizonFilter, setHorizonFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true); setError(null);
      const [empRes, rolesRes] = await Promise.all([
        supabase.from("employee_credentials")
          .select("id,name,email,role,employee_id,withdrawal_horizon,has_received_email,sent_emails,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("company_roles").select("id,role_name,role_code").order("role_name"),
      ]);
      if (empRes.error) setError(empRes.error.message);
      else setEmployees(empRes.data || []);
      setRoles(rolesRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const norm = (s: any) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

  const roleOptions = (() => {
    const map = new Map<string, string>();
    roles.forEach(r => { if (r.role_name) map.set(norm(r.role_name), r.role_name); });
    employees.forEach(e => { if (e.role) { const k = norm(e.role); if (!map.has(k)) map.set(k, e.role); } });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  })();

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return (q === "" || e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q))
      && (roleFilter === "all" || norm(e.role) === roleFilter)
      && (horizonFilter === "all" || e.withdrawal_horizon === horizonFilter);
  });

  const hasFilters = search || roleFilter !== "all" || horizonFilter !== "all";
  const clearFilters = () => { setSearch(""); setRoleFilter("all"); setHorizonFilter("all"); };
  const totalRoles = new Set(employees.map(e => e.role)).size;
  const sentCount = employees.filter(e => e.has_received_email).length;
  const pendingCount = employees.length - sentCount;

  const SkeletonRow = () => (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.8fr 1.2fr 1fr 1.1fr 90px", padding: "0 20px", alignItems: "center", borderBottom: `1px solid ${border}` }}>
      {[140, 180, 80, 60, 70, 50].map((w, i) => (
        <div key={i} style={{ padding: "16px 8px" }}>
          <div style={{ height: 11, borderRadius: 4, background: surface2, width: w, maxWidth: "100%", animation: "shimmer 1.5s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`min-h-screen p-4 md:p-10 antialiased transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"}`}>

      {/* ── HEADER ACTION BANNER ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        padding: "20px 24px",
        borderRadius: "16px",
        border: `1px solid ${border}`,
        background: panel,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        transition: "background 0.3s, border-color 0.3s",
        gap: 16,
        marginBottom: 28,
      }} className="emp-banner-responsive">
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
         color: DT.accent,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: 4
          }}>
            Human Resources
          </div>
          <h1 style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: text,
            margin: 0,
            letterSpacing: "-0.5px",
            lineHeight: 1.25
          }}>
            Employee Directory
          </h1>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: textFaint,
            margin: "4px 0 0 0",
            opacity: 0.85
          }}>
            Records, documents &amp; assignments
          </p>
        </div>
      </div>

      {/* Add this extra media query inside your existing <style> tag at the bottom of your file to get the responsive side-by-side flexbox engine running smoothly */}
      <style>{`
  @media (min-width: 640px) {
    .emp-banner-responsive {
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
  }
`}</style>


      {/* ── STATS ANALYTICS BANNER - MOBILE ADAPTIVE 1 OR 2 ROWS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Employees", value: employees.length, color: DT.accent, sub: "on record", isFeatured: true },
          {
            label: "Emails Delivered",
            value: employees.reduce((sum, e) => {
              const arr = Array.isArray(e.sent_emails) ? e.sent_emails : (typeof e.sent_emails === "string" ? JSON.parse(e.sent_emails || "[]") : []);
              return sum + arr.length;
            }, 0),
            color: DT.green,
            sub: `across ${sentCount} employee${sentCount !== 1 ? "s" : ""}`,
            isFeatured: false
          },
          { label: "Pending Delivery", value: pendingCount, color: DT.amber, sub: "no emails sent yet", isFeatured: false }
        ].map((s, idx) => (
          <div
            key={s.label}
            className={s.isFeatured ? "col-span-2 sm:col-span-1" : ""}
            style={{
              background: dm ? "rgba(24, 24, 27, 0.4)" : panel,
              borderRadius: 16,
              border: dm ? `1px solid rgba(63, 63, 70, 0.5)` : `1px solid ${border}CC`,
              padding: "16px 20px",
              boxShadow: dm ? "none" : "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Dynamic light gradient corner glow instead of hard lines */}
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 56, height: 56, borderRadius: "0 56px 0 0", background: s.color + "0A", pointerEvents: "none" }} />

        <p style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              color: s.isFeatured ? (dm ? "#a1a1aa" : "#94a3b8") : s.color,
              margin: 0,
              letterSpacing: "0.5px"
            }}>
              {s.label}
            </p>

            <p style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: s.isFeatured ? text : s.color,
              marginTop: 6,
              marginBottom: 2,
              letterSpacing: "-0.5px",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums"
            }}>
              {loading ? (
                <span style={{ display: "inline-block", width: 44, height: 28, borderRadius: 6, background: surface2 || border, animation: "pulse 1.5s ease-in-out infinite" }} />
              ) : (
                s.value
              )}
            </p>

            <p style={{
              fontSize: 11,
              color: textFaint,
              margin: 0,
              fontWeight: 500,
              opacity: 0.8
            }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ background: DT.red + "0c", border: `1px solid ${DT.red}30`, borderRadius: 10, padding: "12px 16px", color: DT.red, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          ⚠️ Failed to load employees: {error}
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: textFaint, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email or ID…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12, fontWeight: 500, color: text, background: inputBg, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Role + Horizon */}
        {[
          { val: roleFilter, onChange: setRoleFilter, opts: [{ v: "all", l: "All Roles" }, ...roleOptions.map(r => ({ v: r.key, l: r.label }))] },
          { val: horizonFilter, onChange: setHorizonFilter, opts: [{ v: "all", l: "All Horizons" }, ...Object.entries(HORIZON_LABELS).map(([k, v]) => ({ v: k, l: v }))] },
        ].map((sel, si) => (
          <select key={si} value={sel.val} onChange={e => sel.onChange(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: text, background: inputBg, outline: "none", cursor: "pointer" }}>
            {sel.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}

        {hasFilters && (
          <button onClick={clearFilters} style={{ padding: "7px 12px", border: `1px solid ${DT.red}25`, borderRadius: 8, background: DT.red + "0c", color: DT.red, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: textFaint, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: text }}>{filtered.length}</span> / {employees.length}
        </span>
      </div>

      {/* ── GRID RECORD MATRIX ── */}
      <div style={{ background: panel, borderRadius: 16, border: dm ? `1px solid rgba(63, 63, 70, 0.4)` : `1px solid ${border}`, overflow: "hidden" }}>
        <div className="p-4 md:p-6">
          {/* LOADING STATE - ASYNC ENGINE SHIMMER / SPIN */}
          {loading ? (
            <div className="py-12 md:py-16 flex flex-col items-center justify-center space-y-3" style={{ color: textFaint }}>
              <div
                className="h-6 w-6 border-2 rounded-full animate-spin"
                style={{
                  borderColor: dm ? "#ffcf0f" : "#505824",
                  borderTopColor: "transparent"
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.2px" }}>
                Syncing real-time delivery statuses...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            /* EMPTY STATE INTERCEPTOR */
            <div className="py-12 md:py-16 text-center" style={{ fontSize: 12, fontWeight: 500, color: textFaint, fontStyle: "italic" }}>
              No records match the current active template and status filter selections.
            </div>
          ) : (
            /* GRID CONTAINER - RESPONSIVE 1 OR 2 COLUMNS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filtered.map((emp) => {
                // Fallback parsing safe verification layer
                const historyArray = emp.sent_emails
                  ? (typeof emp.sent_emails === 'string' ? JSON.parse(emp.sent_emails) : emp.sent_emails)
                  : [];

                return (
                  <div
                    key={emp.id}
                    className="group transition-all duration-200"
                    style={{
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: dm ? "1px solid rgba(63,63,70,0.6)" : `1px solid ${border}B3`,
                      background: dm ? "rgba(9, 9, 11, 0.4)" : "rgba(248, 250, 252, 0.5)",
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer"
                    }}
                    onClick={() => setSelected(emp)}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = dm ? "rgba(113,113,122,0.8)" : "rgba(203,213,225,1)";
                      e.currentTarget.style.background = dm ? "rgba(24,24,27,0.3)" : "rgba(241,245,249,0.7)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = dm ? "rgba(63,63,70,0.6)" : `${border}B3`;
                      e.currentTarget.style.background = dm ? "rgba(9, 9, 11, 0.4)" : "rgba(248, 250, 252, 0.5)";
                    }}
                  >
                    {/* PRIMARY DETAILS LAYOUT PANEL */}
                    <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: dm ? "#27272a" : "#e2e8f0",
                            color: dm ? "#d4d4d8" : "#475569",
                            border: dm ? "1px solid rgba(63,63,70,0.4)" : "1px solid rgba(203,213,225,0.5)"
                          }}
                        >
                          {emp.employee_id || "NO ID"}
                        </span>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: text, letterSpacing: "-0.2px" }} className="truncate">
                          {emp.name}
                        </p>
                      </div>

                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: textSoft, fontFamily: "monospace" }} className="truncate">
                        {emp.email}
                      </p>

                      <div style={{ paddingTop: 2 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            padding: "2px 6px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                            background: dm ? "rgba(39,39,42,0.8)" : "rgba(226,232,240,0.6)",
                            color: textSoft,
                            border: dm ? "1px solid #27272a" : "none"
                          }}
                        >
                          {emp.role || "Team Member"}
                        </span>
                      </div>

                      {/* INLINE EMBEDDED NOTIFICATION PILLS */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                        {historyArray.length === 0 ? (
                          <span style={{ fontSize: 10, color: textFaint, fontStyle: "italic", fontWeight: 500 }}>
                            No dynamic logs found
                          </span>
                        ) : (
                          historyArray.map((tmplType: string, hIdx: number) => {
                            // Dynamically render tags map based on parameters
                            const isGeneral = tmplType === 'general' || !DT.accent;
                            return (
                              <span
                                key={`${emp.id}-${tmplType}-${hIdx}`}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  letterSpacing: "0.2px",
                                  textTransform: "uppercase",
                                  border: `1px solid ${isGeneral ? border : DT.accent + '30'}`,
                                  background: isGeneral ? surface : `${DT.accent}10`,
                                  color: isGeneral ? textSoft : DT.accent
                                }}
                              >
                                {tmplType}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* ACTION / METRIC SIDEBAR STRIP */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 6, flexShrink: 0 }} className="text-right">
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: emp.has_received_email ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)",
                          background: emp.has_received_email ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: emp.has_received_email ? DT.green : DT.amber,
                        }}
                      >
                        {emp.has_received_email
                          ? `${historyArray.length} / ${TEMPLATE_TYPES.length} Emails Sent`
                          : "PENDING Mail"}
                      </span>

                      {emp.has_received_email && (
                        <span
                          style={{ fontSize: 11, fontWeight: 600, color: DT.accent || "#c4a174" }}
                          className="hidden sm:inline group-hover:underline"
                        >
                          View logs →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {!loading && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: textFaint, marginTop: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          Showing {filtered.length} of {employees.length} employees
        </p>
      )}


      {selected && <EmployeeDrawer employeeBase={selected} onClose={() => setSelected(null)} darkMode={darkMode} />}

      <style>{`
        @media (max-width: 860px) {
          .emp-desk-header, .emp-desk-row { display: none !important; }
          .emp-mobile-list { display: block !important; }
        }
        @media (min-width: 861px) {
          .emp-mobile-list { display: none !important; }
        }
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}