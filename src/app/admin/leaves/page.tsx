"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AdminLeaveRecord {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason: string | null;
  created_at: string;
  employee_credentials?: {
    name: string;
    employee_id: string;
  } | null;
}

export default function AdminLeavesPage() {
  const { darkMode } = useTheme();

  const [allLeaves, setAllLeaves] = useState<AdminLeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState("");

  const fetchAllLeaves = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          days,
          reason,
          status,
          rejection_reason,
          created_at,
          employee_credentials ( name, employee_id )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAllLeaves(data as unknown as AdminLeaveRecord[]);
    } catch (err: any) {
      console.error("Database reading error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "Approved",
          rejection_reason: null,
        })
        .eq("id", id);

      if (error) {
        throw new Error(`Database rejected the update. Check your RLS policies: ${error.message}`);
      }

      setAllLeaves((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Approved", rejection_reason: null } : item
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();

    if (!rejectionInput.trim()) {
      alert("Please enter a reason for the rejection.");
      return;
    }

    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "Rejected",
          rejection_reason: rejectionInput.trim(),
        })
        .eq("id", id);

      if (error) {
        throw new Error(`Database rejected the update. Check your RLS policies: ${error.message}`);
      }

      setAllLeaves((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "Rejected", rejection_reason: rejectionInput.trim() }
            : item
        )
      );

      setActiveRejectId(null);
      setRejectionInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalPending = allLeaves.filter((r) => r.status === "Pending").length;
  const totalApprovedDays = allLeaves
    .filter((r) => r.status === "Approved")
    .reduce((s, r) => s + r.days, 0);
  const totalSickDays = allLeaves
    .filter((r) => r.type === "Sick Leave" && r.status === "Approved")
    .reduce((s, r) => s + r.days, 0);
  const totalCasualDays = allLeaves
    .filter((r) => r.type === "Casual Leave" && r.status === "Approved")
    .reduce((s, r) => s + r.days, 0);

  const filteredLeaves = allLeaves.filter((item) => {
    if (filterStatus === "All") return true;
    return item.status === filterStatus;
  });

  return (
    <main
      className={`min-h-screen p-4 md:p-8 pt-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
        }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}
        >
          <div>
            <h1
              className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"
                }`}
            >
              Global Leaves Admin Console
            </h1>
            <p
              className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"
                }`}
            >
              Manage employee leave requests and resolution notes.
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-slate-100"
              }`}
          >
            {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${filterStatus === status
                    ? darkMode
                      ? "bg-zinc-100 text-zinc-950"
                      : "bg-white text-slate-900 shadow-sm"
                    : darkMode
                      ? "text-zinc-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Changed grid-cols-1 to grid-cols-2 for mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">

          {/* Card 1 */}
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
              Awaiting
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {totalPending}
            </div>
          </div>

          {/* Card 2 */}
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-500">
              Sick Days
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {totalSickDays}
            </div>
          </div>

          {/* Card 3 */}
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-500">
              Casual Days
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {totalCasualDays}
            </div>
          </div>

          {/* Card 4 */}
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-md transition-colors ${darkMode ? "bg-zinc-100 text-zinc-950 border-zinc-200" : "bg-slate-900 text-white border-slate-900"
            }`}>
            <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-600" : "text-slate-300"
              }`}>
              Total Approved
            </span>
            <div className="text-xl sm:text-2xl font-black mt-1">{totalApprovedDays}</div>
          </div>

        </div>

        <div
          className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}
        >
          {loading ? (
            <div
              className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${darkMode ? "text-zinc-500" : "text-slate-400"
                }`}
            >
              Loading leave ledger...
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div
              className={`p-12 text-center text-xs italic ${darkMode ? "text-zinc-500" : "text-slate-400"
                }`}
            >
              No requests match this filter.
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr
                      className={`font-bold uppercase text-[10px] border-b h-12 ${darkMode
                          ? "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                    >
                      <th className="px-6">Employee Name</th>
                      <th className="px-6">Employee ID</th>
                      <th className="px-6">Category / Reason</th>
                      <th className="px-6">Timeline</th>
                      <th className="px-6 text-center">Days</th>
                      <th className="px-6">Status</th>
                      <th className="px-6 text-right pr-8">Actions</th>
                    </tr>
                  </thead>

                  <tbody
                    className={`divide-y font-medium ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"
                      }`}
                  >
                    {filteredLeaves.map((item) => (
                      <tr
                        key={item.id}
                        className={`h-auto transition-colors align-top ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"
                          }`}
                      >
                        <td className="px-6 py-4 align-top">
                          <div>
                            <div className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                              {item.employee_credentials?.name || "Unknown Staff"}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div
                            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border inline-block ${darkMode
                                ? "bg-zinc-950 text-zinc-400 border-zinc-800"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {item.employee_credentials?.employee_id || item.employee_id}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {item.type}
                          </div>
                          <div className={`text-xs italic mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            "{item.reason}"
                          </div>

                          {item.status === "Rejected" && item.rejection_reason && (
                            <div
                              className={`mt-2 rounded-xl p-2.5 max-w-[260px] border ${darkMode
                                  ? "bg-rose-950/20 border-rose-900/30"
                                  : "bg-rose-50 border-rose-100"
                                }`}
                            >
                              <span className="block text-[10px] font-extrabold text-rose-500 uppercase tracking-wider mb-0.5">
                                Reason for Rejection
                              </span>
                              <p className={`text-xs font-semibold ${darkMode ? "text-rose-300" : "text-rose-700"}`}>
                                "{item.rejection_reason}"
                              </p>
                            </div>
                          )}
                        </td>

                        <td className={`px-6 py-4 text-sm font-medium align-top ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                          <div>{item.start_date}</div>
                          <div className={`text-xs mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            to {item.end_date}
                          </div>
                        </td>

                        <td className={`px-6 py-4 text-sm font-black text-center align-top ${darkMode ? "text-white" : "text-slate-800"}`}>
                          {item.days}
                        </td>

                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border ${item.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
                                : item.status === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30"
                                  : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 pr-8 text-right align-top">
                          {item.status === "Pending" ? (
                            <div className="space-y-3">
                              {activeRejectId !== item.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApprove(item.id)}
                                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveRejectId(item.id);
                                      setRejectionInput("");
                                    }}
                                    className={`h-8 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${darkMode
                                        ? "bg-rose-950/30 hover:bg-rose-950/50 text-rose-400"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                                      }`}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <form
                                  onSubmit={(e) => handleRejectSubmit(e, item.id)}
                                  className={`rounded-xl p-3 text-left inline-block w-64 border ${darkMode
                                      ? "bg-zinc-950 border-zinc-800"
                                      : "bg-slate-50 border-slate-200"
                                    }`}
                                >
                                  <label
                                    className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 ${darkMode ? "text-zinc-500" : "text-slate-500"
                                      }`}
                                  >
                                    Reason for Rejection
                                  </label>
                                  <input
                                    type="text"
                                    value={rejectionInput}
                                    onChange={(e) => setRejectionInput(e.target.value)}
                                    placeholder="State rejection reason..."
                                    className={`w-full h-8 px-2 rounded-lg text-xs font-medium outline-none mb-2 border ${darkMode
                                        ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                        : "bg-white border-slate-200 text-slate-800"
                                      }`}
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setActiveRejectId(null)}
                                      className={`h-6 px-2 text-[11px] font-bold transition-colors cursor-pointer ${darkMode
                                          ? "text-zinc-500 hover:text-zinc-300"
                                          : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="h-6 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-md transition-colors shadow-sm cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          ) : (
                            <span className={`text-xs font-bold italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              Decided
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                {filteredLeaves.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`font-black block text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>
                          {item.employee_credentials?.name || "Unknown Staff"}
                        </span>
                        <span className={`text-[10px] font-bold block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          {item.type}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 px-2 py-0.5 font-mono text-[10px] font-black rounded border ${darkMode
                            ? "bg-zinc-950 text-zinc-400 border-zinc-800"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        {item.employee_credentials?.employee_id || item.employee_id}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl space-y-2 border ${darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/70 border-slate-100"
                        }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Reason
                        </span>
                        <span className={`${darkMode ? "text-zinc-300" : "text-slate-700"}`}>{item.reason}</span>
                      </div>

                      <div className={`flex flex-col gap-0.5 pt-1.5 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                        <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Timeline
                        </span>
                        <span className={`${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
                          {item.start_date} to {item.end_date}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between pt-1.5 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                        <div>
                          <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            Days
                          </span>
                          <span className={`font-black text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>
                            {item.days}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${item.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
                              : item.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30"
                                : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                            }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {item.status === "Rejected" && item.rejection_reason && (
                        <div className={`pt-1.5 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                          <span className="text-[9px] uppercase font-bold text-rose-500 block">
                            Rejection Note
                          </span>
                          <p className={`text-xs mt-1 font-semibold ${darkMode ? "text-rose-300" : "text-rose-700"}`}>
                            {item.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      {item.status === "Pending" ? (
                        activeRejectId !== item.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActiveRejectId(item.id);
                                setRejectionInput("");
                              }}
                              className={`flex-1 h-9 text-[11px] font-bold rounded-xl transition-colors cursor-pointer ${darkMode
                                  ? "bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-900/30"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                                }`}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => handleRejectSubmit(e, item.id)}
                            className={`rounded-xl p-3 border space-y-2 ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"
                              }`}
                          >
                            <label
                              className={`block text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-500"
                                }`}
                            >
                              Reason for Rejection
                            </label>
                            <input
                              type="text"
                              value={rejectionInput}
                              onChange={(e) => setRejectionInput(e.target.value)}
                              placeholder="State rejection reason..."
                              className={`w-full h-9 px-3 rounded-lg text-xs font-medium outline-none border ${darkMode
                                  ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                  : "bg-white border-slate-200 text-slate-800"
                                }`}
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveRejectId(null)}
                                className={`flex-1 h-9 rounded-lg text-[11px] font-bold cursor-pointer ${darkMode
                                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  }`}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                              >
                                Confirm
                              </button>
                            </div>
                          </form>
                        )
                      ) : (
                        <div className={`text-center text-[11px] font-bold italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Decided
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
