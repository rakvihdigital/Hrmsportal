"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

interface CompanyProject {
  project_name: string;
}

interface PayrollIncident {
  id: string;
  employee_id: string;
  date: string;
  type: "bonus" | "deduction" | "allowance" | "incentive";
  amount: number;
  description: string;
  payment_status: string;
  company_projects: CompanyProject | null;
}

interface EmployeeAccount {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  withdrawal_horizon: string;
}

type IncentiveFilterMonths = 1 | 3 | 6 | 9 | 12;

export default function EmployeePayrollDashboard() {
  const { darkMode } = useTheme();
  const [employee, setEmployee] = useState<EmployeeAccount | null>(null);
  const [allIncidents, setAllIncidents] = useState<PayrollIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [incentiveMonths, setIncentiveMonths] = useState<IncentiveFilterMonths>(1);

  async function loadDashboardData() {
    try {
      setLoading(true);

      let empId = localStorage.getItem("user_id");
      if (empId) empId = empId.replace(/['"]+/g, "");

      if (!empId) {
        console.error("No user_id in localStorage");
        setLoading(false);
        return;
      }

      const { data: empData, error: empErr } = await supabase
        .from("employee_credentials")
        .select("id, employee_id, name, email, role, withdrawal_horizon")
        .eq("id", empId)
        .limit(1);

      if (empErr) throw empErr;
      setEmployee(empData?.[0] || null);

      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      const baselineDateString = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: incData, error: incErr } = await supabase
        .from("payroll_incidents")
        .select(`
          id,
          employee_id,
          date,
          type,
          amount,
          description,
          payment_status,
          company_projects!project_id (
            project_name
          )
        `)
        .eq("employee_id", empId)
        .gte("date", baselineDateString)
        .order("date", { ascending: false });

      if (incErr) throw incErr;
      setAllIncidents((incData as any) || []);
    } catch (err) {
      console.error("Payroll load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const calculateIncentivesTotal = useCallback(
    (empId: string, monthsBack: number) => {
      const today = new Date();
      const cutoffDate = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);

      return allIncidents
        .filter((inc) => {
          if (inc.employee_id !== empId) return false;
          if (inc.type !== "incentive") return false;
          if (inc.payment_status !== "Paid") return false;
          const incDate = new Date(inc.date);
          return incDate >= cutoffDate;
        })
        .reduce((sum, inc) => sum + Number(inc.amount), 0);
    },
    [allIncidents]
  );

  const totalPaidAmount = useMemo(() => {
    return allIncidents
      .filter((inc) => inc.payment_status === "Paid")
      .reduce((sum, inc) => {
        const amt = Number(inc.amount);
        return inc.type === "deduction" ? sum - amt : sum + amt;
      }, 0);
  }, [allIncidents]);

  const balanceUnpaidAmount = useMemo(() => {
    return allIncidents
      .filter((inc) => inc.payment_status !== "Paid")
      .reduce((sum, inc) => {
        const amt = Number(inc.amount);
        return inc.type === "deduction" ? sum - amt : sum + amt;
      }, 0);
  }, [allIncidents]);

  const formatHorizonText = (val: string) => {
    if (val === "1m") return "Every Month";
    if (val === "3m") return "Every 3 Months";
    if (val === "6m") return "Every 6 Months";
    if (val === "9m") return "Every 9 Months";
    if (val === "1y") return "Entire Year Cycle";
    return val;
  };

  return (
    <div className={`min-h-screen antialiased p-4 md:p-8 lg:p-12 space-y-6 md:space-y-12 mt-16 xl:mt-0 transition-colors duration-300 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"
    }`}>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">

        {/* Header */}
        <div className={`p-5 md:p-6 border rounded-3xl shadow-sm transition-colors ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
            My Payroll & Incentives
          </h1>
          <p className={`text-xs font-medium mt-1 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
            View your personal incentive totals, payout horizon, and full transaction history.
          </p>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 text-xs font-bold animate-pulse space-y-3">
            <div className={`w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto ${
              darkMode ? "border-zinc-700 border-t-zinc-400" : "border-slate-300 border-t-slate-900"
            }`} />
            <div>Loading your payroll data...</div>
          </div>
        ) : (
          <>
            {/* SECTION 1: INCENTIVES SUMMARY */}
            <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
              <div className={`p-4 md:p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
                darkMode ? "bg-zinc-900/50 border-zinc-800 text-zinc-300" : "bg-slate-900 text-white"
              }`}>
                <div className="text-[11px] md:text-xs font-bold uppercase tracking-wider">
                  My Incentives Summary (Paid Only)
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="incentive-months-select"
                    className="text-[11px] font-bold whitespace-nowrap"
                  >
                    Filter Timeline:
                  </label>
                  <select
                    id="incentive-months-select"
                    value={incentiveMonths}
                    onChange={(e) =>
                      setIncentiveMonths(Number(e.target.value) as IncentiveFilterMonths)
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer shadow-sm ${
                      darkMode 
                        ? "bg-zinc-800 border-zinc-700 text-white" 
                        : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value={1}>This Month Only</option>
                    <option value={3}>Past 3 Months</option>
                    <option value={6}>Past 6 Months</option>
                    <option value={9}>Past 9 Months</option>
                    <option value={12}>Past 12 Months (Full Year)</option>
                  </select>
                </div>
              </div>

              {employee ? (
                <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Account</p>
                    <p className={`text-base md:text-lg font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{employee.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] md:text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"
                      }`}>
                        {employee.employee_id}
                      </span>
                      <span className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"
                      }`}>
                        {employee.role}
                      </span>
                      <span className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                        darkMode 
                          ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/60" 
                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                      }`}>
                        🔒 Payout: {formatHorizonText(employee.withdrawal_horizon || "1m")}
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      Total Incentives Earned
                    </p>
                    <p className="text-3xl md:text-4xl font-black text-emerald-500 font-mono tracking-tight">
                      ₹{calculateIncentivesTotal(employee.id, incentiveMonths).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[11px] font-semibold mt-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      {incentiveMonths === 1 ? "This month" : `Past ${incentiveMonths} months`} · Paid incentives only
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`p-8 text-center text-sm font-semibold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  No employee record found for your account.
                </div>
              )}
            </div>

            {/* SECTION 2: TRANSACTION HISTORY */}
            <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
              
              {/* HEADER ROW WITH METRICS */}
              <div className={`p-4 md:p-5 border-b font-bold text-[11px] md:text-xs uppercase tracking-wider flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-colors ${
                darkMode ? "bg-zinc-900/50 border-zinc-800 text-zinc-400" : "bg-slate-50/50 text-slate-400"
              }`}>
                <span>My Transaction History (Past Year)</span>
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tracking-normal normal-case font-semibold ${
                  darkMode ? "text-zinc-400" : "text-slate-500"
                }`}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Total Paid: <span className="text-emerald-500 font-bold">₹{totalPaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </span>
                  <span className={darkMode ? "text-zinc-800 hidden sm:inline" : "text-slate-200 hidden sm:inline"}>|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Balance: <span className="text-amber-500 font-bold">₹{balanceUnpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </div>

              {allIncidents.length > 0 ? (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`font-bold uppercase border-b text-[10px] transition-colors ${
                          darkMode ? "bg-zinc-900/20 border-zinc-800 text-zinc-500" : "bg-slate-50/20 border-slate-100 text-slate-400"
                        }`}>
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6">Type</th>
                          <th className="py-3 px-6">Description</th>
                          <th className="py-3 px-6">Project</th>
                          <th className="py-3 px-6 text-center">Status</th>
                          <th className="py-3 px-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y font-medium transition-colors ${
                        darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-600"
                      }`}>
                        {allIncidents.map((inc) => (
                          <tr key={inc.id} className={darkMode ? "hover:bg-zinc-800/30" : "hover:bg-slate-50/30"}>
                            <td className={`py-4 px-6 font-mono ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              {new Date(inc.date).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border ${
                                inc.type === "incentive"
                                  ? (darkMode ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-100")
                                  : inc.type === "bonus"
                                  ? (darkMode ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-100")
                                  : inc.type === "allowance"
                                  ? (darkMode ? "bg-amber-950/40 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-700 border-amber-100")
                                  : (darkMode ? "bg-rose-950/40 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-700 border-rose-100")
                              }`}>
                                {inc.type}
                              </span>
                            </td>
                            <td className={`py-4 px-6 font-semibold ${darkMode ? "text-zinc-100" : "text-slate-800"}`}>
                              {inc.description}
                            </td>
                            <td className="py-4 px-6">
                              {inc.company_projects?.project_name ? (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {inc.company_projects.project_name}
                                </span>
                              ) : (
                                <span className={`italic text-[11px] ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>General Operations</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border select-none ${
                                inc.payment_status === "Paid"
                                  ? (darkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                                  : (darkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-700 border-amber-200")
                              }`}>
                                {inc.payment_status === "Paid" ? "🟢 Paid" : "🔴 Unpaid"}
                              </span>
                            </td>
                            <td className={`py-4 px-6 text-right font-mono font-bold text-sm ${
                              inc.type === "deduction" ? "text-rose-500" : "text-emerald-500"
                            }`}>
                              {inc.type === "deduction" ? "-" : "+"}₹
                              {Number(inc.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile/Tablet List View */}
                  <div className="block lg:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                    {allIncidents.map((inc) => (
                      <div key={inc.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-xs ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            {new Date(inc.date).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border ${
                            inc.type === "incentive"
                              ? (darkMode ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-100")
                              : inc.type === "bonus"
                              ? (darkMode ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-100")
                              : inc.type === "allowance"
                              ? (darkMode ? "bg-amber-950/40 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-700 border-amber-100")
                              : (darkMode ? "bg-rose-950/40 text-rose-400 border-rose-900/50" : "bg-rose-50 text-rose-700 border-rose-100")
                          }`}>
                            {inc.type}
                          </span>
                        </div>

                        <div>
                          <p className={`font-bold text-sm ${darkMode ? "text-zinc-100" : "text-slate-800"}`}>
                            {inc.description}
                          </p>
                          <div className="mt-1">
                            {inc.company_projects?.project_name ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-600"
                              }`}>
                                Project: {inc.company_projects.project_name}
                              </span>
                            ) : (
                              <span className={`italic text-[10px] ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>General Operations</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-bold border select-none ${
                            inc.payment_status === "Paid"
                              ? (darkMode ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                              : (darkMode ? "bg-amber-950/30 text-amber-400 border-amber-900/50" : "bg-amber-50 text-amber-700 border-amber-200")
                          }`}>
                            {inc.payment_status === "Paid" ? "🟢 Paid" : "🔴 Unpaid"}
                          </span>
                          <span className={`font-mono font-bold text-sm ${
                            inc.type === "deduction" ? "text-rose-500" : "text-emerald-500"
                          }`}>
                            {inc.type === "deduction" ? "-" : "+"}₹
                            {Number(inc.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`text-center py-16 font-semibold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  No payroll transactions found for your account
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}