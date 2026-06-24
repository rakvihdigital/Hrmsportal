"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "idle" | "active" | "paused" | "completed";
  working_on: string;
  start_time: string;
  end_time?: string;
  total_work_seconds: number;
}

interface HolidayRecord {
  id: string;
  title: string;
  holiday_date: string; // "YYYY-MM-DD"
  category: string;
  description?: string;
}

const TARGET_SECONDS = 28800;
const HARD_LIMIT_SECONDS = 32400;

// Safe localStorage helpers
const lsGet = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const lsSet = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { }
};
const lsRemove = (key: string) => {
  try { localStorage.removeItem(key); } catch { }
};

const formatTime = (secs: number): string => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
};

export default function AttendancePage() {
  const { darkMode } = useTheme();
  const [status, setStatus] = useState<"idle" | "active" | "paused" | "completed">("idle");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(0);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [workingOn, setWorkingOn] = useState("");
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  // history holds only PAST completed/finalized records — never the active one
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);

  const shiftCompleteNotifiedRef = useRef(false);
  const [showShiftBanner, setShowShiftBanner] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState("");
  const [lastSavedTask, setLastSavedTask] = useState("");

  const progress = Math.min((timer / TARGET_SECONDS) * 100, 100);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const todayStr = (): string => new Date().toISOString().split("T")[0];

  // ─── Fetch active session + history + holidays ─────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    const empId = lsGet("user_id");
    if (!empId) { setIsLoading(false); return; }

    // 1. Fetch the most recent record for this employee
    const { data: latestData } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", empId)
      .order("start_time", { ascending: false })
      .limit(1);

    const latestRecord = latestData?.[0];

    // 2. Decide if latest record is an active/paused session
    const isLiveSession =
      latestRecord &&
      (latestRecord.status === "active" || latestRecord.status === "paused");

    // 3. Recover time drift if active
    let recoveredTime = 0;
    if (latestRecord && latestRecord.status === "active") {
      const lastSaved = new Date(latestRecord.updated_at).getTime();
      const secondsPassedWhileOffline = (Date.now() - lastSaved) / 1000;
      if (secondsPassedWhileOffline < 3600) {
        recoveredTime = secondsPassedWhileOffline;
      }
    }

    // 4. Hydrate live-session state
    if (isLiveSession) {
      setAttendanceId(latestRecord.id);
      setStatus(latestRecord.status);
      setWorkingOn(latestRecord.working_on);
      setStartTime(latestRecord.start_time);
      setTimer(latestRecord.total_work_seconds + recoveredTime);
      timerRef.current = latestRecord.total_work_seconds + recoveredTime;
      setLastSavedTask(latestRecord.working_on);
      // Restore banner if already past 8h
      if (latestRecord.total_work_seconds + recoveredTime >= TARGET_SECONDS) {
        setShowShiftBanner(true);
        shiftCompleteNotifiedRef.current = true;
      }
    }

    // 5. Fetch history — ALWAYS exclude the live session row so today never
    //    appears as a completed card while actively working
    let historyQuery = supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", empId)
      .order("start_time", { ascending: false });

    if (isLiveSession) {
      // Exclude the active/paused row from history
      historyQuery = historyQuery.neq("id", latestRecord.id);
    }

    const { data: pastData } = await historyQuery;
    setHistory(pastData || []);

    // 6. Fetch company holidays for this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: holidayData } = await supabase
      .from("company_holidays")
      .select("*")
      .gte("holiday_date", monthStart)
      .lte("holiday_date", monthEnd);

    setHolidays(holidayData || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ─── Timer + business logic ────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "active" || !startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const start = new Date(startTime).getTime();
      const diffInSeconds = Math.floor((now - start) / 1000);

      setTimer(diffInSeconds);
      timerRef.current = diffInSeconds;

      if (diffInSeconds >= HARD_LIMIT_SECONDS) {
        executeStop(attendanceId!);
        sendEmailNotification("Shift auto-closed after 9 hours.");
      } else if (diffInSeconds >= TARGET_SECONDS && !shiftCompleteNotifiedRef.current) {
        setShowShiftBanner(true);
        sendEmailNotification("You have reached 8 hours. Please wrap up soon.");
        shiftCompleteNotifiedRef.current = true;
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, startTime, attendanceId]);

  // ─── Email helper ─────────────────────────────────────────────────────────
  const sendEmailNotification = async (message: string) => {
    const userEmail = lsGet("user_email");
    try {
      await fetch("/api/send-attendance-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email: userEmail }),
      });
    } catch (e) {
      console.error("Email failed:", e);
    }
  };

  // ─── Shared stop logic ────────────────────────────────────────────────────
  const executeStop = async (id: string) => {
    const { error } = await supabase
      .from("attendance")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        total_work_seconds: Math.round(timerRef.current),
      })
      .eq("id", id);

    if (!error) {
      lsRemove(`attendance_timer_${id}`);
      setStatus("idle");
      setAttendanceId(null);
      setTimer(0);
      timerRef.current = 0;
      setStartTime(null);
      setWorkingOn("");
      setLastSavedTask("");
      setShowShiftBanner(false);
      shiftCompleteNotifiedRef.current = false;
      await fetchAttendance();
    } else {
      console.error("Stop error:", error);
      alert(`Error closing session: ${error.message}`);
    }
  };

  // ─── Manual start ──────────────────────────────────────────────────────────
const handleStart = async () => {
  if (new Date().getDay() === 0) return alert("Today is Sunday — rest day. You cannot start a work session.");
  const todayHoliday = holidays.find((h) => h.holiday_date === todayStr());
  if (todayHoliday) return alert(`Today is a holiday: ${todayHoliday.title}. You cannot start a work session.`);
  if (!workingOn.trim()) return alert("Please clarify what task you are initiating!");
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const now = new Date().toISOString();

    const { data } = await supabase
      .from("attendance")
      .insert([{
        employee_id: lsGet("user_id"),
        working_on: workingOn,
        start_time: now,
        status: "active",
        date: now.split("T")[0],
        total_work_seconds: 0,
      }])
      .select()
      .single();

    if (data) {
      setAttendanceId(data.id);
      setStartTime(now);
      setStatus("active");
      setTimer(0);
      timerRef.current = 0;
      setLastSavedTask(workingOn);
      shiftCompleteNotifiedRef.current = false;
      setShowShiftBanner(false);
      lsSet(`attendance_timer_${data.id}`, JSON.stringify({ time: 0, lastTick: Date.now() }));
    }
  };

  // ─── Pause / Resume ────────────────────────────────────────────────────────
  const handleTogglePause = async () => {
    if (!attendanceId) return;
    const newStatus = status === "active" ? "paused" : "active";
    setStatus(newStatus);

    await supabase
      .from("attendance")
      .update({ total_work_seconds: Math.round(timerRef.current), status: newStatus })
      .eq("id", attendanceId);

    lsSet(`attendance_timer_${attendanceId}`, JSON.stringify({ time: timerRef.current, lastTick: Date.now() }));
  };

  // ─── Manual stop ──────────────────────────────────────────────────────────
  const handleStop = async () => {
    if (isStopping || !attendanceId) return;
    const confirmStop = window.confirm("Are you sure you want to wrap up and finalize your timesheet logs for today?");
    if (!confirmStop) return;
    setIsStopping(true);
    await executeStop(attendanceId);
    setIsStopping(false);
  };

  // ─── Task field blur ──────────────────────────────────────────────────────
  const updateTask = async () => {
    if (!attendanceId || workingOn === lastSavedTask) return;
    await supabase.from("attendance").update({ working_on: workingOn }).eq("id", attendanceId);
    setLastSavedTask(workingOn);
  };

  // ─── Inline history edit ──────────────────────────────────────────────────
  const startInlineEditing = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditTask(record.working_on);
  };

  const saveInlineEdit = async (id: string) => {
    const { error } = await supabase.from("attendance").update({ working_on: editTask }).eq("id", id);
    if (!error) {
      setEditingId(null);
      const empId = lsGet("user_id");
      let q = supabase.from("attendance").select("*").eq("employee_id", empId).order("start_time", { ascending: false });
      if (attendanceId) q = q.neq("id", attendanceId);
      const { data } = await q;
      if (data) setHistory(data);
    } else {
      alert("Failed updating log entry.");
    }
  };

  // ─── Status color helpers ─────────────────────────────────────────────────
  const getStatusColor = (stat: string) => {
    if (stat === "active") return "bg-emerald-500";
    if (stat === "paused") return "bg-amber-500";
    return darkMode ? "bg-zinc-500" : "bg-slate-400";
  };

  const getStatusBadge = (stat: string) => {
    if (stat === "active") return darkMode ? "bg-emerald-950/30 text-emerald-400" : "bg-emerald-50 text-emerald-700";
    if (stat === "paused") return darkMode ? "bg-amber-950/30 text-amber-400" : "bg-amber-50 text-amber-700";
    return darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-700";
  };

  // ─── Monthly calendar computation ─────────────────────────────────────────
  const getMonthDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const currentTodayStr = todayStr();
    const days = [];

    for (let d = today; d >= 1; d--) {
      const date = new Date(year, month, d);
      // Use local date string to avoid UTC offset shifting the date
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSunday = date.getDay() === 0;
      const isToday = dateStr === currentTodayStr;
      const record = history.find((h) => h.date === dateStr);
      const holiday = holidays.find((h) => h.holiday_date === dateStr);
      days.push({ date, dateStr, isSunday, isToday, record, holiday });
    }
    return days;
  };

  const getMonthlySummary = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const currentTodayStr = todayStr();

    let fullCount = 0, shortCount = 0, absentCount = 0;

    for (let d = 1; d <= today; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSunday = date.getDay() === 0;
      const isHoliday = holidays.some((h) => h.holiday_date === dateStr);
      const isToday = dateStr === currentTodayStr;

      // Skip Sundays and holidays from counts
      if (isSunday || isHoliday) continue;
      // Skip today if session is live (not yet finalized)
      if (isToday && (status === "active" || status === "paused")) continue;

      const record = history.find((h) => h.date === dateStr);
      if (!record) { absentCount++; continue; }
      if (record.total_work_seconds >= TARGET_SECONDS) fullCount++;
      else shortCount++;
    }

    return { fullCount, shortCount, absentCount };
  };

  const monthDays = getMonthDays();
  const { fullCount, shortCount, absentCount } = getMonthlySummary();
  const currentMonthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const todayLabel = new Date().toLocaleDateString([], { month: "short", day: "numeric" });

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen antialiased selection:bg-emerald-100 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"}`}>

      {/* ── Header ── */}
      <header className={`py-5 md:py-6 px-4 md:px-6 lg:px-12 sticky top-0 z-10 shadow-sm transition-colors duration-300 ${darkMode ? "bg-zinc-900 shadow-zinc-900/40 border-b border-zinc-800" : "bg-white shadow-slate-100/40 border-b border-slate-100"}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Workspace Management
            </h1>
            <p className={`text-xs md:text-sm mt-1 font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
              Record working milestones, project workloads, and verify past daily submissions.
            </p>
          </div>
          <div className={`text-xs font-mono px-3 py-2 rounded-xl font-semibold flex items-center gap-2 ${getStatusBadge(status)}`}>
            <span className={`h-2 w-2 rounded-full ${getStatusColor(status)} animate-pulse`} />
            {status === "active" ? "Shift Active" : status === "paused" ? "Break Interval" : "Off Duty"}
          </div>
        </div>
      </header>

      {/* ── 8h Shift Complete Banner ── */}
      {showShiftBanner && (
        <div className="bg-emerald-600 text-white px-4 md:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-black text-sm tracking-wide">Shift Target Achieved — 8 Hours Completed!</p>
              <p className="text-xs text-emerald-100 font-medium">
                Your timer is still running. Click <strong>Stop Work</strong> whenever you're ready to finalize your timesheet.
              </p>
            </div>
          </div>
          <button
            onClick={handleStop}
            disabled={isStopping}
            className="bg-white text-emerald-700 font-black text-xs px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm whitespace-nowrap disabled:opacity-60"
          >
            {isStopping ? "Stopping..." : "Stop Work Now"}
          </button>
        </div>
      )}

      <main className="p-4 md:p-6 lg:p-12 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* ── Left Panel: Active Session ── */}
        <div className={`lg:col-span-5 p-5 md:p-8 rounded-3xl border flex flex-col justify-between h-fit transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200/70 shadow-sm"}`}>
          <div>
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h2 className={`text-xs md:text-sm font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Live Workspace Session
              </h2>
              {status !== "idle" && (
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold ${showShiftBanner
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : darkMode ? "bg-amber-950/30 text-amber-400" : "bg-amber-50 text-amber-700"
                  }`}>
                  {showShiftBanner ? "Shift Complete ✓" : status === "active" ? "Tracking Live" : "Paused"}
                </span>
              )}
            </div>

            {/* Clock display */}
            <div className={`rounded-2xl p-6 md:p-8 text-center mb-5 md:mb-6 shadow-inner transition-colors duration-700 ${showShiftBanner ? "bg-emerald-950" : darkMode ? "bg-zinc-950" : "bg-slate-950"}`}>
              {isLoading ? (
                <div className="text-4xl md:text-5xl font-mono font-black tracking-widest text-slate-600 animate-pulse">--:--:--</div>
              ) : (
                <div className={`text-4xl md:text-5xl font-mono font-black tracking-widest transition-colors duration-300 ${showShiftBanner
                  ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                  : status === "active"
                    ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.25)]"
                    : "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                  }`}>
                  {formatTime(timer)}
                </div>
              )}
              {showShiftBanner && (
                <p className="text-[11px] text-emerald-400 font-bold mt-2 tracking-widest uppercase animate-pulse">
                  8-Hour Target Reached
                </p>
              )}
              <p className={`text-xs mt-2 font-medium ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
                {startTime
                  ? `Session initialized at ${new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "System idle; awaiting clock-in instruction"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2 mb-6 md:mb-8">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Daily Milestone Metrics</span>
                <span>{Math.min(progress, 100).toFixed(1)}% {timer >= TARGET_SECONDS ? "— ✅ Complete" : "Completed"}</span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                <div
                  className={`h-full transition-all duration-500 rounded-full ${showShiftBanner ? "bg-emerald-500" : status === "active" ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`text-[11px] ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {timer >= TARGET_SECONDS
                  ? "✅ 8-hour shift complete. Click Stop Work to register your attendance."
                  : "Standard operational shift target is 8.0 hours — you will be notified on completion."}
              </p>
            </div>

            {/* Task input */}
            <div className="space-y-2 mb-5 md:mb-6">
              <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                Current Working Objectives
              </label>
              <input
                className={`w-full p-3 md:p-4 rounded-xl border placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm ${darkMode
                  ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-emerald-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                  }`}
                placeholder="Ex: Refactoring API endpoints, designing onboarding states..."
                value={workingOn}
                onChange={(e) => setWorkingOn(e.target.value)}
                onBlur={status !== "idle" ? updateTask : undefined}
                disabled={status === "completed" || isLoading}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Active session card */}
            {status !== "idle" && attendanceId && (
              <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-amber-50/60 hover:bg-amber-50 border border-amber-200/60 rounded-2xl transition-all gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${status === "active" ? "bg-amber-500 animate-pulse" : "bg-amber-400"}`} />
                    <p className="font-bold text-amber-800 text-sm">Today — Ongoing</p>
                  </div>
                  <p className="text-xs text-amber-700 font-medium line-clamp-2">
                    {workingOn || <span className="italic text-amber-400">No task description</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm text-amber-700 bg-amber-100 border-amber-200">
                    {formatTime(timer)}
                  </p>
                  <p className="text-[10px] text-amber-500 font-semibold mt-1">
                    {status === "paused" ? "Paused" : "Live"}
                  </p>
                </div>
              </div>
            )}

   {status === "idle" && (() => {
  const todayHoliday = holidays.find((h) => h.holiday_date === todayStr());
  const isTodaySunday = new Date().getDay() === 0;

  if (isTodaySunday) {
    return (
      <div className={`p-4 rounded-xl text-center border border-dashed ${darkMode ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-50 border-zinc-300 text-zinc-500"}`}>
        <p className="text-lg mb-1">😴</p>
        <p className="font-black text-sm">Today is Sunday</p>
        <p className={`text-xs font-semibold mt-1 ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>Rest day — work sessions are not permitted on Sundays.</p>
      </div>
    );
  }

  if (todayHoliday) {
    return (
      <div className={`p-4 rounded-xl text-center border border-dashed ${darkMode ? "bg-violet-950/20 border-violet-800 text-violet-300" : "bg-violet-50 border-violet-300 text-violet-700"}`}>
        <p className="text-lg mb-1">🎉</p>
        <p className="font-black text-sm">Today is a Holiday!</p>
        <p className={`text-xs font-semibold mt-1 ${darkMode ? "text-violet-400" : "text-violet-500"}`}>{todayHoliday.title} — You cannot start a work session today.</p>
      </div>
    );
  }

  return (
    <button onClick={handleStart} className="w-full py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all tracking-wide text-sm shadow-md">
      START WORK
    </button>
  );
})()}

            {(status === "active" || status === "paused") && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleTogglePause}
                  className={`py-3 md:py-4 font-bold rounded-xl transition-all tracking-wide text-sm border ${status === "active"
                    ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                    : darkMode
                      ? "bg-emerald-950/30 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/50"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    }`}
                >
                  {status === "active" ? "PAUSE BREAK" : "RESUME WORK"}
                </button>
                <button onClick={handleStop} disabled={isStopping} className="py-3 md:py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all tracking-wide text-sm shadow-md">
                  {isStopping ? "STOPPING..." : "STOP WORK"}
                </button>
              </div>
            )}

            {status === "completed" && (
              <div className={`p-3 md:p-4 rounded-xl text-center text-sm font-semibold ${darkMode ? "bg-zinc-950 border border-zinc-800 text-zinc-500" : "bg-slate-50 border border-slate-200 text-slate-500"}`}>
                ✅ Today's shift is complete. See you tomorrow!
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Monthly Timesheet ── */}
        <div className={`lg:col-span-7 p-5 md:p-8 rounded-3xl border shadow-sm max-h-[80vh] overflow-y-auto transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200/70"}`}>

          {/* ── Header row ── */}
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <h2 className={`text-xs md:text-sm font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              {currentMonthLabel} — Timesheet
            </h2>
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${darkMode ? "bg-emerald-950/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
              Today: {todayLabel}
            </span>
          </div>

          {/* ── Summary stat cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className={`p-3 md:p-4 rounded-2xl border text-center ${darkMode ? "bg-emerald-950/20 border-emerald-900/40" : "bg-emerald-50 border-emerald-200"}`}>
              <p className={`text-2xl font-black leading-none mb-1 ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>{fullCount}</p>
              <p className={`text-[10px] font-semibold ${darkMode ? "text-emerald-600" : "text-emerald-600"}`}>Full shifts (8h+)</p>
            </div>
            <div className={`p-3 md:p-4 rounded-2xl border text-center ${darkMode ? "bg-amber-950/20 border-amber-900/40" : "bg-orange-50 border-orange-200"}`}>
              <p className={`text-2xl font-black leading-none mb-1 ${darkMode ? "text-amber-400" : "text-orange-600"}`}>{shortCount}</p>
              <p className={`text-[10px] font-semibold ${darkMode ? "text-amber-600" : "text-orange-500"}`}>Under 8 hours</p>
            </div>
            <div className={`p-3 md:p-4 rounded-2xl border text-center ${darkMode ? "bg-red-950/20 border-red-900/40" : "bg-red-50 border-red-200"}`}>
              <p className={`text-2xl font-black leading-none mb-1 ${darkMode ? "text-red-400" : "text-red-600"}`}>{absentCount}</p>
              <p className={`text-[10px] font-semibold ${darkMode ? "text-red-600" : "text-red-500"}`}>Absent</p>
            </div>
          </div>

          {/* ── Day rows ── */}
          <div className="space-y-2 md:space-y-3">
            {monthDays.map(({ date, dateStr, isSunday, isToday, record, holiday }) => {
              const label = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

              // ── 1. TODAY with live session ──────────────────────────────
              if (isToday && (status === "active" || status === "paused")) {
                return (
                  <div key={dateStr} className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border ring-1 ring-emerald-500 ${darkMode ? "bg-emerald-950/20 border-emerald-800" : "bg-emerald-50/70 border-emerald-300"}`}>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{label}</p>
                      <p className="text-[11px] text-emerald-600 font-medium truncate max-w-[180px]">
                        {workingOn || "Active session"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${darkMode ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/40" : "text-emerald-700 bg-emerald-100 border-emerald-200"}`}>
                        {formatTime(timer)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg animate-pulse ${darkMode ? "bg-emerald-950/30 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>
                        ● {status === "paused" ? "PAUSED" : "LIVE"}
                      </span>
                    </div>
                  </div>
                );
              }

              // ── 2. TODAY is a holiday (and no active session) ───────────
              if (isToday && holiday) {
                return (
                  <div key={dateStr} className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border ring-1 ring-violet-400 ${darkMode ? "bg-violet-950/20 border-violet-800" : "bg-violet-50/70 border-violet-300"}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{label}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? "bg-violet-900/40 text-violet-300" : "bg-violet-100 text-violet-600"}`}>TODAY</span>
                      </div>
                      <p className={`text-[11px] font-medium ${darkMode ? "text-violet-400" : "text-violet-600"}`}>
                        🎉 {holiday.title}
                        {holiday.description ? ` — ${holiday.description}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${darkMode ? "bg-violet-900/40 text-violet-300" : "bg-violet-100 text-violet-600"}`}>
                      Holiday
                    </span>
                  </div>
                );
              }

              // ── 3. Company holiday (past day) ───────────────────────────
              if (holiday) {
                return (
                  <div key={dateStr} className={`flex items-center justify-between p-3 rounded-2xl border border-dashed ${darkMode ? "border-violet-800/50 bg-violet-950/10" : "border-violet-200 bg-violet-50/40"}`}>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm ${darkMode ? "text-violet-300" : "text-violet-700"}`}>{label}</p>
                      <p className={`text-[11px] font-medium ${darkMode ? "text-violet-500" : "text-violet-500"}`}>
                        🎉 {holiday.title}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${darkMode ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600"}`}>
                      {holiday.category}
                    </span>
                  </div>
                );
              }

              // ── 4. Sunday rest day ──────────────────────────────────────
              if (isSunday && !record) {
                return (
                  <div key={dateStr} className={`flex items-center justify-between p-3 rounded-2xl border border-dashed ${darkMode ? "border-zinc-700 bg-zinc-950/50" : "border-zinc-200 bg-zinc-50"}`}>
                    <p className={`font-semibold text-sm ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>{label}</p>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400"}`}>
                      Rest day (Sun)
                    </span>
                  </div>
                );
              }

              // ── 5. Absent — no record for a working day ─────────────────
              if (!record) {
                return (
                  <div key={dateStr} className={`flex items-center justify-between p-3 rounded-2xl border ${darkMode ? "border-red-900/50 bg-red-950/20" : "border-red-200 bg-red-50/50"}`}>
                    <p className={`font-bold text-sm ${darkMode ? "text-red-400" : "text-red-700"}`}>{label}</p>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${darkMode ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-600"}`}>
                      Absent
                    </span>
                  </div>
                );
              }

              // ── 6. Existing completed record ────────────────────────────
              const isOver = record.total_work_seconds >= TARGET_SECONDS;
              return (
                <div
                  key={record.id}
                  className={`group flex items-center justify-between p-3 md:p-4 rounded-2xl border gap-3 transition-all ${isOver
                    ? darkMode
                      ? "bg-emerald-950/20 border-emerald-900/40 hover:bg-emerald-950/30"
                      : "bg-emerald-50/60 border-emerald-200/60 hover:bg-emerald-50"
                    : darkMode
                      ? "bg-red-950/20 border-red-900/40 hover:bg-red-950/30"
                      : "bg-red-50/40 border-red-200/50 hover:bg-red-50"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{label}</p>
                    {editingId === record.id ? (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <input
                          value={editTask}
                          onChange={(e) => setEditTask(e.target.value)}
                          className={`p-1.5 border rounded-lg text-xs w-full max-w-xs focus:outline-none ${darkMode ? "bg-zinc-950 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
                        />
                        <button onClick={() => saveInlineEdit(record.id)} className="text-xs text-emerald-600 font-bold hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 font-bold hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <p className={`text-[11px] font-medium truncate ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                        {record.working_on || <span className={darkMode ? "text-zinc-600" : "text-slate-400"}>No task logged</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${isOver
                        ? darkMode ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/40" : "text-emerald-700 bg-emerald-100 border-emerald-200"
                        : darkMode ? "text-red-400 bg-red-950/30 border-red-900/40" : "text-red-600 bg-red-100 border-red-200"
                        }`}>
                        {formatTime(record.total_work_seconds)}
                      </p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${isOver ? "text-emerald-500" : "text-red-400"}`}>
                        {isOver ? "✓ Full shift" : "⚠ Incomplete"}
                      </p>
                    </div>
                    {editingId !== record.id && (
                      <button
                        onClick={() => startInlineEditing(record)}
                        className={`text-xs font-semibold lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ${darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Month note ── */}
          <p className={`text-[11px] text-center mt-5 py-2 px-4 rounded-xl ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-50 text-slate-400"}`}>
            📅 Showing {currentMonthLabel} only
          </p>
        </div>

      </main>
    </div>
  );
}