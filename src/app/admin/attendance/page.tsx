"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const MONTHLY_SALARY = 18500;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  total_work_seconds: number;
  status: string;
  break_seconds: number;
  working_on: string | null;
}

interface MonthInfo {
  totalDays: number;
  sundays: number;
  holidayCount: number;
  workingDays: number;
  perDay: number;
}

interface EmpMonthStats {
  present: number;
  below8h: number;
  below6h: number;
  ongoing: number;
  absent: number;
  payableDays: number;
  salary: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(secs: number | null): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtClock(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type StatusKey = "present" | "below8h" | "below6h" | "ongoing" | "absent";

function getAttendanceStatus(record: AttendanceRecord | undefined): StatusKey {
  if (!record) return "absent";
  const secs = record.total_work_seconds || 0;
  if (record.start_time && !record.end_time) return "ongoing";
  if (secs > 0 && secs < 21600) return "below6h";
  if (secs >= 21600 && secs < 28800) return "below8h";
  if (secs >= 28800) return "present";
  return "absent";
}

const STATUS_CONFIG: Record<StatusKey, { label: string; light: string; dark: string; dot: string }> = {
  present: { label: "Present",    light: "bg-emerald-50 text-emerald-700 border-emerald-200",   dark: "bg-emerald-950/40 text-emerald-400 border-emerald-900/40",   dot: "bg-emerald-500" },
  below8h: { label: "< 8 hrs",   light: "bg-amber-50 text-amber-700 border-amber-200",         dark: "bg-amber-950/40 text-amber-400 border-amber-900/40",         dot: "bg-amber-500" },
  below6h: { label: "< 6 hrs",   light: "bg-orange-50 text-orange-700 border-orange-200",      dark: "bg-orange-950/40 text-orange-400 border-orange-900/40",      dot: "bg-orange-500" },
  ongoing: { label: "Ongoing",   light: "bg-blue-50 text-blue-700 border-blue-200",            dark: "bg-blue-950/40 text-blue-400 border-blue-900/40",            dot: "bg-blue-500" },
  absent:  { label: "Absent",    light: "bg-red-50 text-red-700 border-red-200",               dark: "bg-red-950/40 text-red-400 border-red-900/40",               dot: "bg-red-500" },
};

function StatusBadge({ status, darkMode }: { status: StatusKey; darkMode: boolean }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${darkMode ? cfg.dark : cfg.light}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

async function getMonthWorkingDays(year: number, month: number): Promise<MonthInfo> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const { data: holidays } = await supabase
    .from("company_holidays")
    .select("holiday_date")
    .gte("holiday_date", start.toISOString().slice(0, 10))
    .lte("holiday_date", end.toISOString().slice(0, 10));

  const holidaySet = new Set((holidays || []).map((h: { holiday_date: string }) => h.holiday_date));
  let sundays = 0;
  let holidayCount = 0;

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

// ─── Employee Detail Modal ────────────────────────────────────────────────────
function EmployeeModal({
  employee,
  month,
  year,
  darkMode,
  onClose,
}: {
  employee: Employee;
  month: number;
  year: number;
  darkMode: boolean;
  onClose: () => void;
}) {
const [records, setRecords] = useState<AttendanceRecord[]>([]);
const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0);
      const end = endDate.toISOString().slice(0, 10);

     const [{ data: att }, mi, { data: holidays }] = await Promise.all([
  supabase.from("attendance").select("*").eq("employee_id", employee.id).gte("date", start).lte("date", end).order("date", { ascending: false }),
  getMonthWorkingDays(year, month),
  supabase.from("company_holidays").select("holiday_date").gte("holiday_date", start).lte("holiday_date", end),
]);

setRecords(att || []);
setMonthInfo(mi);
setHolidaySet(new Set((holidays || []).map((h: any) => h.holiday_date)));
setLoading(false);
    }
    load();
  }, [employee.id, month, year]);

  const stats = useCallback((): EmpMonthStats & { workingDays: number } => {
    if (!monthInfo) return { present: 0, below8h: 0, below6h: 0, ongoing: 0, absent: 0, payableDays: 0, salary: 0, workingDays: 0 };
    const recMap: Record<string, AttendanceRecord> = {};
    records.forEach((r) => { recMap[r.date] = r; });

    let present = 0, below8h = 0, below6h = 0, ongoing = 0, absent = 0;
    const endDate = new Date(year, month, 0);

    for (let d = new Date(year, month - 1, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
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
    return { present, below8h, below6h, ongoing, absent, payableDays, salary: payableDays * monthInfo.perDay, workingDays: monthInfo.workingDays };
  }, [records, monthInfo, month, year]);

  const s = stats();
  const monthName = new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${darkMode ? "bg-zinc-800 text-zinc-100" : "bg-slate-100 text-slate-700"}`}>
              {getInitials(employee.name)}
            </div>
            <div>
              <p className={`font-black text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{employee.name}</p>
              <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{employee.role} · {monthName}</p>
            </div>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading ? (
            <p className={`text-center text-xs font-bold animate-pulse py-8 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Loading attendance data...</p>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "Working days", value: s.workingDays, color: darkMode ? "text-white" : "text-slate-900" },
                  { label: "Present", value: s.present, color: "text-emerald-500" },
                  { label: "< 8 hrs", value: s.below8h, color: "text-amber-500" },
                  { label: "< 6 hrs", value: s.below6h, color: "text-orange-500" },
                  { label: "Absent", value: s.absent, color: "text-red-500" },
                  { label: "Payable", value: s.payableDays, color: darkMode ? "text-white" : "text-slate-900" },
                ].map((c) => (
                  <div key={c.label} className={`rounded-2xl p-3 text-center border ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
                    <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                    <p className={`text-[9px] font-bold uppercase mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Salary Card */}
              <div className={`rounded-2xl border p-4 flex items-center justify-between flex-wrap gap-3 ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
                <div>
                  <p className={`text-[10px] font-bold uppercase mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Calculated salary</p>
                  <p className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>₹{s.salary.toLocaleString("en-IN")}</p>
                </div>
                <div className={`text-[10px] font-bold text-right space-y-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  <p>₹{monthInfo?.perDay}/day × {s.payableDays} days</p>
                  <p>{monthInfo?.sundays} Sundays + {monthInfo?.holidayCount} holidays excluded</p>
                </div>
              </div>

              {/* Daily Records Table */}
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                <div className={`hidden sm:block overflow-x-auto`}>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-bold uppercase text-[9px] h-10 ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-zinc-500" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
                        {["Date", "Status", "Check In", "Check Out", "Hours", "Working on"].map((h) => (
                          <th key={h} className="px-4 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? "divide-zinc-800/60 text-zinc-300" : "divide-slate-100 text-slate-700"}`}>
  {(() => {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
    const recMap: Record<string, AttendanceRecord> = {};
    records.forEach((r) => { recMap[r.date] = r; });
    const rows = [];

    for (let d = lastDay; d >= 1; d--) {
      const date = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSunday = date.getDay() === 0;
      const isHoliday = holidaySet.has(dateStr);

      if (isSunday) {
        rows.push(
          <tr key={dateStr} className={`h-12 ${darkMode ? "opacity-30" : "opacity-40"}`}>
            <td className="px-4 whitespace-nowrap">{fmtDate(dateStr)}</td>
            <td className="px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${darkMode ? "bg-zinc-800 text-zinc-500 border-zinc-700" : "bg-slate-100 text-slate-400 border-slate-200"}`}>😴 Sunday</span></td>
            <td className="px-4">—</td><td className="px-4">—</td><td className="px-4">—</td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>Rest day</td>
          </tr>
        );
        continue;
      }

      if (isHoliday) {
        rows.push(
          <tr key={dateStr} className={`h-12 ${darkMode ? "opacity-40" : "opacity-50"}`}>
            <td className="px-4 whitespace-nowrap">{fmtDate(dateStr)}</td>
            <td className="px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${darkMode ? "bg-violet-950/40 text-violet-400 border-violet-900/40" : "bg-violet-50 text-violet-600 border-violet-200"}`}>🎉 Holiday</span></td>
            <td className="px-4">—</td><td className="px-4">—</td><td className="px-4">—</td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>Company holiday</td>
          </tr>
        );
        continue;
      }

      const r = recMap[dateStr];
      if (!r) {
        rows.push(
          <tr key={dateStr} className={`h-12 ${darkMode ? "bg-red-950/10" : "bg-red-50/50"}`}>
            <td className="px-4 whitespace-nowrap">{fmtDate(dateStr)}</td>
            <td className="px-4"><StatusBadge status="absent" darkMode={darkMode} /></td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>—</td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>—</td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>—</td>
            <td className={`px-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>—</td>
          </tr>
        );
        continue;
      }

      rows.push(
        <tr key={r.id} className={`h-12 transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/60"}`}>
          <td className="px-4 whitespace-nowrap">{fmtDate(r.date)}</td>
          <td className="px-4"><StatusBadge status={getAttendanceStatus(r)} darkMode={darkMode} /></td>
          <td className="px-4 whitespace-nowrap font-mono">{fmtClock(r.start_time)}</td>
          <td className="px-4 whitespace-nowrap font-mono">{fmtClock(r.end_time)}</td>
          <td className="px-4 whitespace-nowrap">{fmtTime(r.total_work_seconds)}</td>
          <td className={`px-4 max-w-[140px] truncate ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{r.working_on || "—"}</td>
        </tr>
      );
    }
    return rows;
  })()}
</tbody>
                  </table>
                </div>

                {/* Mobile records */}
           <div className={`sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
  {(() => {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
    const recMap: Record<string, AttendanceRecord> = {};
    records.forEach((r) => { recMap[r.date] = r; });
    const rows = [];

    for (let d = lastDay; d >= 1; d--) {
      const date = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSunday = date.getDay() === 0;
      const isHoliday = holidaySet.has(dateStr);

      if (isSunday || isHoliday) {
        rows.push(
          <div key={dateStr} className={`p-4 flex items-center justify-between opacity-40`}>
            <span className={`text-xs font-black ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{fmtDate(dateStr)}</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${darkMode ? "bg-zinc-800 text-zinc-500 border-zinc-700" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
              {isSunday ? "😴 Sunday" : "🎉 Holiday"}
            </span>
          </div>
        );
        continue;
      }

      const r = recMap[dateStr];
      if (!r) {
        rows.push(
          <div key={dateStr} className={`p-4 flex items-center justify-between ${darkMode ? "bg-red-950/10" : "bg-red-50/50"}`}>
            <span className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{fmtDate(dateStr)}</span>
            <StatusBadge status="absent" darkMode={darkMode} />
          </div>
        );
        continue;
      }

      rows.push(
        <div key={r.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{fmtDate(r.date)}</span>
            <StatusBadge status={getAttendanceStatus(r)} darkMode={darkMode} />
          </div>
          <div className={`flex gap-4 text-[11px] font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
            <span>In: <span className="font-mono">{fmtClock(r.start_time)}</span></span>
            <span>Out: <span className="font-mono">{fmtClock(r.end_time)}</span></span>
            <span>{fmtTime(r.total_work_seconds)}</span>
          </div>
          {r.working_on && <p className={`text-[10px] truncate ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{r.working_on}</p>}
        </div>
      );
    }
    return rows;
  })()}
</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { darkMode } = useTheme();
  const today = new Date();

  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [selMonth, setSelMonth] = useState(today.getMonth() + 1);
  const [selYear, setSelYear] = useState(today.getFullYear());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [monthlyMap, setMonthlyMap] = useState<Record<string, EmpMonthStats>>({});
  const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
    const [dailyDayOff, setDailyDayOff] = useState<{ type: "sunday" | "holiday"; title?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.from("employee_credentials").select("id, name, email, employee_id, role").order("name").then(({ data }) => {
      setEmployees(data || []);
    });
  }, []);

  useEffect(() => {
    if (employees.length === 0) return;
    if (viewMode === "daily") loadDaily();
    else loadMonthly();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, selectedDate, viewMode, selMonth, selYear]);

async function loadDaily() {
  setLoading(true);
  setDailyDayOff(null);

  const dateObj = new Date(selectedDate + "T00:00:00");
  if (dateObj.getDay() === 0) {
    setDailyDayOff({ type: "sunday" });
    setAttendanceMap({});
    setLoading(false);
    return;
  }

  const { data: holidayCheck } = await supabase
    .from("company_holidays")
    .select("title")
    .eq("holiday_date", selectedDate)
    .limit(1);

  if (holidayCheck && holidayCheck.length > 0) {
    setDailyDayOff({ type: "holiday", title: holidayCheck[0].title });
    setAttendanceMap({});
    setLoading(false);
    return;
  }

  const { data } = await supabase.from("attendance").select("*").eq("date", selectedDate);
  const map: Record<string, AttendanceRecord> = {};
  (data || []).forEach((r: AttendanceRecord) => { map[r.employee_id] = r; });
  setAttendanceMap(map);
  setLoading(false);
}

  async function loadMonthly() {
    setLoading(true);
    const start = `${selYear}-${String(selMonth).padStart(2, "0")}-01`;
    const endDate = new Date(selYear, selMonth, 0);
    const end = endDate.toISOString().slice(0, 10);

    const [{ data }, mi] = await Promise.all([
      supabase.from("attendance").select("*").gte("date", start).lte("date", end),
      getMonthWorkingDays(selYear, selMonth),
    ]);

    setMonthInfo(mi);
    const grouped: Record<string, AttendanceRecord[]> = {};
    (data || []).forEach((r: AttendanceRecord) => {
      if (!grouped[r.employee_id]) grouped[r.employee_id] = [];
      grouped[r.employee_id].push(r);
    });

    const stats: Record<string, EmpMonthStats> = {};
    employees.forEach((emp) => {
      const recs = grouped[emp.id] || [];
      const recMap: Record<string, AttendanceRecord> = {};
      recs.forEach((r) => { recMap[r.date] = r; });

      let present = 0, below8h = 0, below6h = 0, ongoing = 0, absent = 0;
      for (let d = new Date(selYear, selMonth - 1, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue;
        const iso = d.toISOString().slice(0, 10);
        const st = getAttendanceStatus(recMap[iso]);
        if (st === "present") present++;
        else if (st === "below8h") below8h++;
        else if (st === "below6h") below6h++;
        else if (st === "ongoing") ongoing++;
        else absent++;
      }
      const payableDays = Math.max(0, mi.workingDays - below6h - absent);
      stats[emp.id] = { present, below8h, below6h, ongoing, absent, payableDays, salary: payableDays * mi.perDay };
    });

    setMonthlyMap(stats);
    setLoading(false);
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return emp.name.toLowerCase().includes(q) || emp.employee_id?.toLowerCase().includes(q);
  });

  // Daily summary
  const summary = { present: 0, below8h: 0, below6h: 0, ongoing: 0, absent: 0 };
  filteredEmployees.forEach((emp) => {
    const st = getAttendanceStatus(attendanceMap[emp.id]);
    summary[st] = (summary[st] || 0) + 1;
  });

  const monthLabel = new Date(selYear, selMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const modalMonth = viewMode === "monthly" ? selMonth : new Date(selectedDate).getMonth() + 1;
  const modalYear = viewMode === "monthly" ? selYear : new Date(selectedDate).getFullYear();

  return (
    <div className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
          <div>
            <h1 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Attendance
            </h1>
            <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
              {viewMode === "daily" ? `Daily view · ${fmtDate(selectedDate)}` : `Monthly view · ${monthLabel}`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[200px]">
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 pl-9 pr-4 text-xs font-bold rounded-xl border outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-700 placeholder-zinc-600" : "bg-white border-slate-200 text-slate-700 focus:border-slate-300 placeholder-slate-400"}`}
              />
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? "text-zinc-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Date / Month picker */}
            {viewMode === "daily" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`h-10 px-3 text-xs font-bold rounded-xl border outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-700" : "bg-white border-slate-200 text-slate-700 focus:border-slate-300"}`}
              />
            ) : (
              <div className="flex gap-2">
                <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className={`h-10 px-3 text-xs font-bold rounded-xl border outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("en-IN", { month: "short" })}</option>
                  ))}
                </select>
                <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className={`h-10 px-3 text-xs font-bold rounded-xl border outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}>
                  {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            )}

            {/* View toggle */}
            <div className={`flex h-10 rounded-xl overflow-hidden border ${darkMode ? "border-zinc-800 bg-zinc-950" : "border-slate-200 bg-slate-100"}`}>
              {(["daily", "monthly"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`flex-1 px-4 text-xs font-bold capitalize transition-all cursor-pointer ${viewMode === m ? darkMode ? "bg-zinc-100 text-zinc-950" : "bg-[#505824] text-white" : darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── SUMMARY CHIPS (daily only) ───────────────────────────────────── */}
       {viewMode === "daily" && !dailyDayOff && (
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <div key={key} className={`rounded-2xl border p-4 flex items-center gap-3 transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <p className={`text-xl font-black leading-none ${darkMode ? "text-white" : "text-slate-900"}`}>{summary[key] || 0}</p>
                    <p className={`text-[9px] font-bold uppercase mt-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MONTHLY INFO BAR ─────────────────────────────────────────────── */}
        {viewMode === "monthly" && monthInfo && (
          <div className={`flex flex-wrap gap-x-6 gap-y-2 px-5 py-3.5 rounded-2xl border text-xs font-bold transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-500"}`}>
            {[
              { label: "Working days", val: monthInfo.workingDays },
              { label: "Sundays off", val: monthInfo.sundays },
              { label: "Holidays off", val: monthInfo.holidayCount },
              { label: "Per day rate", val: `₹${monthInfo.perDay}` },
              { label: "Monthly salary", val: `₹${MONTHLY_SALARY.toLocaleString("en-IN")}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{item.val}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── TABLE ────────────────────────────────────────────────────────── */}
        <div className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
          {loading ? (
  <div className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
    Loading attendance records...
  </div>
) : dailyDayOff && viewMode === "daily" ? (
  <div className={`p-12 text-center space-y-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
    <p className="text-3xl">{dailyDayOff.type === "sunday" ? "😴" : "🎉"}</p>
    <p className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
      {dailyDayOff.type === "sunday" ? "Sunday — Rest Day" : dailyDayOff.title}
    </p>
    <p className="text-xs font-semibold">
      {dailyDayOff.type === "sunday"
        ? "No attendance is recorded on Sundays."
        : "This is a company holiday. No attendance is recorded."}
    </p>
  </div>
) : viewMode === "daily" ? (
            <>
              {/* Daily — Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className={`font-bold uppercase text-[10px] border-b h-12 ${darkMode ? "bg-zinc-900/50 text-zinc-500 border-zinc-800" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                      {["Employee", "Status", "Check In", "Check Out", "Hours worked", "Working on", ""].map((h) => (
                        <th key={h} className="px-6 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"}`}>
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan={7} className={`text-center p-12 italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>No employees found</td></tr>
                    ) : filteredEmployees.map((emp) => {
                      const r = attendanceMap[emp.id];
                      const status = getAttendanceStatus(r);
                      return (
                        <tr key={emp.id} className={`h-16 transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"}`}>
                          <td className="px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-200" : "bg-slate-100 text-slate-700"}`}>
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <p className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</p>
                                <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6"><StatusBadge status={status} darkMode={darkMode} /></td>
                          <td className={`px-6 font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{fmtClock(r?.start_time ?? null)}</td>
                          <td className={`px-6 font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{fmtClock(r?.end_time ?? null)}</td>
                          <td className="px-6">{fmtTime(r?.total_work_seconds ?? null)}</td>
                          <td className={`px-6 max-w-[160px] truncate ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{r?.working_on || "—"}</td>
                          <td className="px-6 pr-8 text-right">
                            <button
                              onClick={() => setSelectedEmployee(emp)}
                              className={`h-8 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"}`}
                            >
                              View detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Daily — Mobile */}
              <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                {filteredEmployees.map((emp) => {
                  const r = attendanceMap[emp.id];
                  const status = getAttendanceStatus(r);
                  return (
                    <div key={emp.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black ${darkMode ? "bg-zinc-800 text-zinc-200" : "bg-slate-100 text-slate-700"}`}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</p>
                            <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</p>
                          </div>
                        </div>
                        <StatusBadge status={status} darkMode={darkMode} />
                      </div>
                      <div className={`rounded-xl border p-3 grid grid-cols-3 gap-2 text-[10px] font-bold ${darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
                        {[
                          { label: "Check In", value: fmtClock(r?.start_time ?? null) },
                          { label: "Check Out", value: fmtClock(r?.end_time ?? null) },
                          { label: "Hours", value: fmtTime(r?.total_work_seconds ?? null) },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className={`${darkMode ? "text-zinc-600" : "text-slate-400"} uppercase text-[9px]`}>{item.label}</p>
                            <p className={`font-mono mt-0.5 ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className={`w-full h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"}`}
                      >
                        View detail →
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Monthly — Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className={`font-bold uppercase text-[10px] border-b h-12 ${darkMode ? "bg-zinc-900/50 text-zinc-500 border-zinc-800" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                      {["Employee", "Present", "< 8 hrs", "< 6 hrs", "Absent", "Payable days", "Salary", ""].map((h) => (
                        <th key={h} className="px-6 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"}`}>
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan={8} className={`text-center p-12 italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>No employees found</td></tr>
                    ) : filteredEmployees.map((emp) => {
                      const s = monthlyMap[emp.id] || { present: 0, below8h: 0, below6h: 0, ongoing: 0, absent: 0, payableDays: 0, salary: 0 };
                      return (
                        <tr key={emp.id} className={`h-16 transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"}`}>
                          <td className="px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-200" : "bg-slate-100 text-slate-700"}`}>
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <p className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</p>
                                <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6"><span className="text-emerald-500 font-black">{s.present}</span></td>
                          <td className="px-6"><span className="text-amber-500 font-black">{s.below8h}</span></td>
                          <td className="px-6"><span className="text-orange-500 font-black">{s.below6h}</span></td>
                          <td className="px-6"><span className="text-red-500 font-black">{s.absent}</span></td>
                          <td className="px-6">
                            <span className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{s.payableDays}</span>
                            <span className={`ml-1 text-[10px] ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>days</span>
                          </td>
                          <td className="px-6">
                            <span className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>₹{s.salary.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="px-6 pr-8 text-right">
                            <button
                              onClick={() => setSelectedEmployee(emp)}
                              className={`h-8 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"}`}
                            >
                              View detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Monthly — Mobile */}
              <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                {filteredEmployees.map((emp) => {
                  const s = monthlyMap[emp.id] || { present: 0, below8h: 0, below6h: 0, absent: 0, payableDays: 0, salary: 0 };
                  return (
                    <div key={emp.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-200" : "bg-slate-100 text-slate-700"}`}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</p>
                            <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>₹{s.salary.toLocaleString("en-IN")}</p>
                          <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{s.payableDays} days paid</p>
                        </div>
                      </div>
                      <div className={`rounded-xl border p-3 grid grid-cols-4 gap-2 text-center ${darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
                        {[
                          { label: "Present", value: s.present, color: "text-emerald-500" },
                          { label: "< 8hrs", value: s.below8h, color: "text-amber-500" },
                          { label: "< 6hrs", value: s.below6h, color: "text-orange-500" },
                          { label: "Absent", value: s.absent, color: "text-red-500" },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                            <p className={`text-[9px] font-bold uppercase ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{item.label}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className={`w-full h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"}`}
                      >
                        View detail →
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          month={modalMonth}
          year={modalYear}
          darkMode={darkMode}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}