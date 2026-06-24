"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LeaveRecord {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason: string | null;
  created_at: string;
}

export default function EmployeeLeavesPage() {
  const { darkMode } = useTheme();
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  // Form Field States
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. READ DATAPOOL FROM SUPABASE
  const fetchLeaveHistory = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("user_id"); 
      if (!userId) return;

      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, type, start_date, end_date, days, reason, status, rejection_reason, created_at")
        .eq("employee_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setLeaveHistory(data as LeaveRecord[]);
    } catch (err: any) {
      console.error("Error reading leave history:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  // 2. WRITE/SAVE NEW DATA ENTRIES TO SUPABASE
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      alert("Session context missing. Please re-authenticate your account.");
      return;
    }
    if (!startDate || !endDate || !reason.trim()) {
      alert("Please fill in all layout blocks before submitting.");
      return;
    }
    if (endDate < startDate) {
      alert("End date cannot occur prior to the chosen start date.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const calculatedDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("leave_requests")
        .insert([
          {
            employee_id: userId,
            type: leaveType,
            start_date: startDate,
            end_date: endDate,
            days: calculatedDays,
            reason: reason.trim(),
            status: "Pending"
          }
        ]);

      if (error) throw error;

      alert("Leave request dispatched to HR database successfully!");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchLeaveHistory();
    } catch (err: any) {
      alert(`Database saving failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metric Calculation Aggregations
  const approvedSick = leaveHistory.filter(r => r.type === "Sick Leave" && r.status === "Approved").reduce((s, r) => s + r.days, 0);
  const approvedCasual = leaveHistory.filter(r => r.type === "Casual Leave" && r.status === "Approved").reduce((s, r) => s + r.days, 0);
  const totalRejected = leaveHistory.filter(r => r.status === "Rejected").reduce((s, r) => s + r.days, 0);
  const grandTotalApproved = leaveHistory.filter(r => r.status === "Approved").reduce((s, r) => s + r.days, 0);

  // Filter evaluation layer
  const filteredLeaves = leaveHistory.filter((item) => {
    if (filterStatus === "All") return true;
    return item.status === filterStatus;
  });

  return (
    <main className={`p-4 md:p-8 lg:p-10 min-h-screen transition-colors duration-300 mt-16 xl:mt-0 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Page Title Header */}
      <div className={`border-b pb-5 mb-6 md:mb-8 ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
        <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
          Personal Leaves Dashboard
        </h1>
        <p className={`text-xs md:text-sm mt-1 font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
          Request formal absences and trace validation workflows.
        </p>
      </div>

      {/* Analytics Counter Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        <div className={`p-4 md:p-5 rounded-2xl border shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
          <span className={`text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>Approved Sick</span>
          <div className={`text-xl md:text-2xl font-black mt-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            {approvedSick} <span className={`text-xs font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Days</span>
          </div>
        </div>
        <div className={`p-4 md:p-5 rounded-2xl border shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
          <span className={`text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Approved Casual</span>
          <div className={`text-xl md:text-2xl font-black mt-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            {approvedCasual} <span className={`text-xs font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Days</span>
          </div>
        </div>
        <div className={`p-4 md:p-5 rounded-2xl border shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
          <span className={`text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-rose-400" : "text-rose-500"}`}>Rejected Total</span>
          <div className={`text-xl md:text-2xl font-black mt-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            {totalRejected} <span className={`text-xs font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Days</span>
          </div>
        </div>
        <div className={`col-span-2 sm:col-span-2 lg:col-span-1 p-4 md:p-5 rounded-2xl text-white shadow-md border ${
          darkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-900 border-transparent"
        }`}>
          <span className={`text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-400" : "text-slate-300"}`}>Net Approved Absences</span>
          <div className="text-xl md:text-2xl font-black text-white mt-2">
            {grandTotalApproved} <span className={`text-xs ${darkMode ? "text-zinc-400" : "text-slate-300"} font-normal"}`}>Total Days</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        
        {/* Left Side: Form Panel Container */}
        <div className={`border rounded-3xl p-5 md:p-6 shadow-sm lg:col-span-1 ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          <h2 className={`text-sm md:text-base font-black tracking-tight mb-5 ${darkMode ? "text-white" : "text-slate-900"}`}>File New Request</h2>
          <form onSubmit={handleApplyLeave} className="space-y-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Leave Category</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className={`w-full h-11 px-3 border rounded-xl text-sm font-bold outline-none transition-colors ${
                  darkMode 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400"
                }`}
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full h-11 px-3 border rounded-xl text-sm font-medium outline-none transition-colors ${
                    darkMode 
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700" 
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full h-11 px-3 border rounded-xl text-sm font-medium outline-none transition-colors ${
                    darkMode 
                      ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700" 
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Reason Details</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide details for your supervisors..."
                className={`w-full p-3 border rounded-xl text-sm font-medium outline-none transition-colors resize-none ${
                  darkMode 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700 placeholder:text-zinc-700" 
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400 placeholder:text-slate-400"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-11 font-bold text-sm rounded-xl tracking-wide shadow-sm transition-all active:scale-[0.99] flex items-center justify-center disabled:opacity-50 ${
                darkMode 
                  ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-950" 
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isSubmitting ? "Writing to Database..." : "Submit Application"}
            </button>
          </form>
        </div>

        {/* Right Side: Display Logs Container */}
        <div className={`border rounded-3xl p-5 md:p-6 shadow-sm lg:col-span-2 overflow-hidden ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-5 gap-3 ${
            darkMode ? "border-zinc-800" : "border-slate-100"
          }`}>
            <h2 className={`text-sm md:text-base font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Historical Tracking Log</h2>
            
            {/* Status Segment Filter Controls */}
            <div className={`flex flex-wrap items-center gap-1 p-1 rounded-xl self-start max-w-full ${
              darkMode ? "bg-zinc-950" : "bg-slate-100"
            }`}>
              {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterStatus === status 
                      ? (darkMode ? "bg-zinc-800 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") 
                      : (darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800")
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className={`h-64 flex flex-col items-center justify-center gap-2 text-sm ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
              <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
                darkMode ? "border-zinc-800 border-t-zinc-400" : "border-slate-300 border-t-slate-800"
              }`} />
              <span className="font-medium">Syncing database layers...</span>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className={`border border-dashed rounded-xl h-64 flex items-center justify-center text-sm font-medium p-4 text-center ${
              darkMode ? "border-zinc-800 text-zinc-600" : "border-slate-200 text-slate-400"
            }`}>
              No tracking records found matching the status "{filterStatus}".
            </div>
          ) : (
            <>
              {/* MOBILE RESPONSIVE STACKED CARDS (Visible on Small Mobile Screens Only) */}
              <div className="block md:hidden space-y-4">
                {filteredLeaves.map((item) => (
                  <div key={item.id} className={`p-4 rounded-xl border space-y-3 ${
                    darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/80 border-slate-100"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`text-sm font-bold ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>{item.type}</div>
                        <div className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          {item.start_date} to {item.end_date}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                        item.status === "Approved" ? (darkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-100") :
                        item.status === "Rejected" ? (darkMode ? "bg-rose-950/30 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-700 border-rose-100") :
                        (darkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50 animate-pulse" : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse")
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className={`text-xs italic p-2 rounded-lg border ${
                      darkMode ? "bg-zinc-900 border-zinc-800/40 text-zinc-400" : "bg-white border-slate-100 text-slate-600"
                    }`}>
                      "{item.reason}"
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={darkMode ? "text-zinc-500" : "text-slate-400"}>Requested Scope:</span>
                      <span className={`font-black ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>{item.days} {item.days === 1 ? 'Day' : 'Days'}</span>
                    </div>

                    {item.status === "Rejected" && item.rejection_reason && (
                      <div className={`border rounded-xl p-2.5 ${darkMode ? "bg-rose-950/20 border-rose-900/30" : "bg-rose-50 border-rose-100"}`}>
                        <span className={`block text-[9px] font-black uppercase tracking-wider mb-0.5 ${darkMode ? "text-rose-400" : "text-rose-500"}`}>Manager Feedback:</span>
                        <p className={`text-xs font-semibold ${darkMode ? "text-rose-300" : "text-rose-700"}`}>"{item.rejection_reason}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DESKTOP MATRIX TABLE VIEW (Hidden on Mobile screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                      <th className="pb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Category / Reason</th>
                      <th className="pb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Timeline Scope</th>
                      <th className="pb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 text-center">Days</th>
                      <th className="pb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-zinc-800/60" : "divide-slate-100"}`}>
                    {filteredLeaves.map((item) => (
                      <tr key={item.id} className={`group transition-colors ${darkMode ? "hover:bg-zinc-950/40" : "hover:bg-slate-50/50"}`}>
                        <td className="py-4 pr-3 align-top">
                          <div className={`text-sm font-bold ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>{item.type}</div>
                          <div className={`text-xs max-w-[240px] font-medium mt-0.5 italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            "{item.reason}"
                          </div>
                          
                          {item.status === "Rejected" && item.rejection_reason && (
                            <div className={`mt-2 border rounded-xl p-2.5 max-w-[240px] ${darkMode ? "bg-rose-950/20 border-rose-900/40" : "bg-rose-50 border-rose-100"}`}>
                              <span className={`block text-[9px] font-black uppercase tracking-wider mb-0.5 ${darkMode ? "text-rose-400" : "text-rose-500"}`}>Manager Feedback:</span>
                              <p className={`text-xs font-semibold ${darkMode ? "text-rose-300" : "text-rose-700"}`}>"{item.rejection_reason}"</p>
                            </div>
                          )}
                        </td>
                        <td className={`py-4 text-sm font-medium align-top ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                          <div>{item.start_date}</div>
                          <div className={`text-xs mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>to {item.end_date}</div>
                        </td>
                        <td className={`py-4 text-sm font-black text-center align-top ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>
                          {item.days}
                        </td>
                        <td className="py-4 text-right align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border ${
                            item.status === "Approved" ? (darkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-100") :
                            item.status === "Rejected" ? (darkMode ? "bg-rose-950/30 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-700 border-rose-100") :
                            (darkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50 animate-pulse" : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse")
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </main>
  );
}