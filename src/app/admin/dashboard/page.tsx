"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

interface ProjectStat {
  id: string;
  project_name: string;
  client_name: string | null;
  sector: string;
  status: string;
  budget: number;
  amount_paid: number;
  balance_amount: number;
}

export default function AdminAnalyticsDashboard() {
  // Pulling directly from your shared context provider layout pool
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);

  // Aggregate Metric State Pools
  const [projectMetrics, setProjectMetrics] = useState({
    totalBudget: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    statusCounts: {} as Record<string, number>,
    sectorBudgets: {} as Record<string, number>,
    list: [] as ProjectStat[]
  });

  const [leaveMetrics, setLeaveMetrics] = useState({
    totalPending: 0,
    totalApprovedDays: 0,
    typeDistribution: {} as Record<string, number>
  });

  const [payrollMetrics, setPayrollMetrics] = useState({
    totalDisbursed: 0,
    breakdown: { bonus: 0, deduction: 0, allowance: 0, incentive: 0 }
  });

  const [staffMetrics, setStaffMetrics] = useState({
    totalHeadcount: 0,
    roleDistribution: {} as Record<string, number>
  });

  async function calculateStatistics() {
    try {
      setLoading(true);

      // Parallel Data Fetching via Supabase
      const [
        { data: projects, error: projErr },
        { data: leaves, error: leaveErr },
        { data: incidents, error: incErr },
        { data: staff, error: staffErr }
      ] = await Promise.all([
        supabase.from("company_projects").select("id, project_name, client_name, sector, status, budget, amount_paid, balance_amount"),
        supabase.from("leave_requests").select("status, type, days"),
        supabase.from("payroll_incidents").select("type, amount, payment_status"),
        supabase.from("employee_credentials").select("id, role")
      ]);

      if (projErr) throw projErr;
      if (leaveErr) throw leaveErr;
      if (incErr) throw incErr;
      if (staffErr) throw staffErr;

      // 1. Process Project Financial Ledgers
      let budgetSum = 0, paidSum = 0, balanceSum = 0;
      const projStatuses: Record<string, number> = {};
      const sectorBudgs: Record<string, number> = {};

      (projects || []).forEach((p) => {
        const b = Number(p.budget || 0);
        const paid = Number(p.amount_paid || 0);
        budgetSum += b;
        paidSum += paid;
        balanceSum += Number(p.balance_amount ?? (b - paid));
        
        projStatuses[p.status] = (projStatuses[p.status] || 0) + 1;
        sectorBudgs[p.sector] = (sectorBudgs[p.sector] || 0) + b;
      });

      // 2. Process Leave Allocations
      let pendingCount = 0, approvedDaysSum = 0;
      const leaveTypes: Record<string, number> = {};

      (leaves || []).forEach((l) => {
        if (l.status === "Pending") pendingCount++;
        if (l.status === "Approved") approvedDaysSum += Number(l.days || 0);
        leaveTypes[l.type] = (leaveTypes[l.type] || 0) + 1;
      });

      // 3. Process Payroll Matrices
      let disbursedSum = 0;
      const payBreakdown = { bonus: 0, deduction: 0, allowance: 0, incentive: 0 };

      (incidents || []).forEach((i) => {
        if (i.payment_status !== "Paid") return; 

        const amt = Number(i.amount || 0);
        if (i.type === "deduction") {
          disbursedSum -= amt;
          payBreakdown.deduction += amt;
        } else {
          disbursedSum += amt;
          if (i.type in payBreakdown) {
            payBreakdown[i.type as keyof typeof payBreakdown] += amt;
          }
        }
      });

      // 4. Process Staff Profile Distributions
      const roles: Record<string, number> = {};
      (staff || []).forEach((s) => {
        if (s.role) roles[s.role] = (roles[s.role] || 0) + 1;
      });

      setProjectMetrics({
        totalBudget: budgetSum,
        totalPaid: paidSum,
        totalOutstanding: balanceSum,
        statusCounts: projStatuses,
        sectorBudgets: sectorBudgs,
        list: (projects as ProjectStat[]) || []
      });

      setLeaveMetrics({
        totalPending: pendingCount,
        totalApprovedDays: approvedDaysSum,
        typeDistribution: leaveTypes
      });

      setPayrollMetrics({
        totalDisbursed: disbursedSum,
        breakdown: payBreakdown
      });

      setStaffMetrics({
        totalHeadcount: (staff || []).length,
        roleDistribution: roles
      });

    } catch (err) {
      console.error("Statistics computation engine error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateStatistics();
  }, []);

  if (loading) {
    return (
      <div className={`p-20 text-center text-xs font-bold animate-pulse space-y-3 min-h-screen flex flex-col items-center justify-center ${
        darkMode ? "bg-zinc-950 text-zinc-500" : "bg-slate-50 text-slate-400"
      }`}>
        <div className={`w-12 h-12 rounded-full border-2 border-t-indigo-600 dark:border-t-indigo-500 animate-spin ${
          darkMode ? "border-zinc-800" : "border-slate-300"
        }`} />
        <div className="tracking-wide">Aggregating database clusters and recalculating system metrics...</div>
      </div>
    );
  }

  const collectionPercentage = projectMetrics.totalBudget > 0 
    ? Math.round((projectMetrics.totalPaid / projectMetrics.totalBudget) * 100) 
    : 0;

  return (
    <div className={`min-h-screen antialiased p-4 md:p-8 pt-10 md:pt-4 space-y-6 transition-colors duration-300 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER PANEL */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-3xl border shadow-xs transition-colors duration-300 ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          <div>
            <h1 className={`text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>System Analytics & Statistics</h1>
            <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>Real-time financial ratios, portfolio distributions, and operations parameters.</p>
          </div>
          <button 
            onClick={calculateStatistics}
            className="self-start sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span> Recalculate Live Data
          </button>
        </div>

        {/* METRIC SCORECARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className={`border rounded-2xl p-5 shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Total Project Amount</div>
            <div className={`text-xl font-black font-mono mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>₹{projectMetrics.totalBudget.toLocaleString("en-IN")}</div>
            <div className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 {collectionPercentage}%</span> funds collection rate
            </div>
          </div>

          <div className={`border rounded-2xl p-5 shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Incentive Amount (additional salary)</div>
            <div className={`text-xl font-black font-mono mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {payrollMetrics.totalDisbursed >= 0 ? "+" : "-"}₹{Math.abs(payrollMetrics.totalDisbursed).toLocaleString("en-IN")}
            </div>
            <div className={`text-[10px] font-medium mt-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Accumulated financial adjustments mix
            </div>
          </div>

          <div className={`border rounded-2xl p-5 shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Active Leave Requests</div>
            <div className={`text-xl font-black font-mono mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>{leaveMetrics.totalPending} Pending</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5">
              ⚠️ Requires admin review disposition
            </div>
          </div>

          <div className={`border rounded-2xl p-5 shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Corporate Staff Headcount</div>
            <div className={`text-xl font-black font-mono mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>{staffMetrics.totalHeadcount} Profiles</div>
            <div className={`text-[10px] font-medium mt-1.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
              Across {Object.keys(staffMetrics.roleDistribution).length} unique workspace roles
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION VISUAL METERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CASHFLOW COMPLETION PORT PANEL */}
          <div className={`border rounded-3xl p-6 shadow-2xs lg:col-span-2 space-y-6 transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div>
              <h2 className={`text-sm font-black uppercase tracking-wider ${darkMode ? "text-white" : "text-slate-900"}`}>Portfolio Cashflow Realization Breakdown</h2>
              <p className={`text-[11px] font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>Visualizing gross booked project capital against verified cash receipts.</p>
            </div>

            <div className="space-y-2">
              <div className={`flex justify-between text-xs font-bold ${darkMode ? "text-zinc-300" : "text-slate-600"}`}>
                <span>Realized Receipts (Amount Paid)</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{projectMetrics.totalPaid.toLocaleString("en-IN")}</span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden flex ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                <div 
                  className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500" 
                  style={{ width: `${collectionPercentage}%` }}
                />
              </div>
              <div className={`flex justify-between text-[10px] font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                <span>Outstanding Balance: ₹{projectMetrics.totalOutstanding.toLocaleString("en-IN")}</span>
                <span>{collectionPercentage}% Invoiced & Settled</span>
              </div>
            </div>

            {/* EXPANDED SECTOR DISPERSION */}
            <div className={`pt-4 border-t space-y-3 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
              <h3 className={`text-xs font-bold ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>Gross Budget Distribution Across Operational Sectors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(projectMetrics.sectorBudgets).length === 0 ? (
                  <div className={`text-[11px] italic py-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>No sector allocations processed.</div>
                ) : (
                  Object.entries(projectMetrics.sectorBudgets).map(([sector, budget]) => (
                    <div key={sector} className={`p-3 rounded-xl border flex items-center justify-between transition-colors duration-300 ${
                      darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/70 border-slate-100"
                    }`}>
                      <div>
                        <span className={`text-[11px] font-bold block capitalize ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>{sector}</span>
                        <span className={`text-[9px] font-mono ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Exposure Limit</span>
                      </div>
                      <span className={`font-mono text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>₹{budget.toLocaleString("en-IN")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ADJUSTMENT TYPE MIX DISTRIBUTION */}
          <div className={`border rounded-3xl p-6 shadow-2xs space-y-6 transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div>
              <h2 className={`text-sm font-black uppercase tracking-wider ${darkMode ? "text-white" : "text-slate-900"}`}>Payroll Adjustment Matrix Mix</h2>
              <p className={`text-[11px] font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>Aggregated allocation parameters of financial incidents.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border flex items-center justify-between font-medium transition-colors duration-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
                <div className="font-bold text-[11px]">Incentive Overlays</div>
                <div className="font-mono text-xs font-black">₹{payrollMetrics.breakdown.incentive.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-3 rounded-xl border flex items-center justify-between font-medium transition-colors duration-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30">
                <div className="font-bold text-[11px]">Standard Allowances</div>
                <div className="font-mono text-xs font-black">₹{payrollMetrics.breakdown.allowance.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-3 rounded-xl border flex items-center justify-between font-medium transition-colors duration-300 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                <div className="font-bold text-[11px]">Performance Bonuses</div>
                <div className="font-mono text-xs font-black">₹{payrollMetrics.breakdown.bonus.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-3 rounded-xl border flex items-center justify-between font-medium transition-colors duration-300 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30">
                <div className="font-bold text-[11px]">Administrative Deductions</div>
                <div className="font-mono text-xs font-black">₹{payrollMetrics.breakdown.deduction.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM AUDIT DATAGRID */}
        <div className={`border rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          <div className={`p-5 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors duration-300 ${
            darkMode ? "bg-zinc-950 text-white border-b border-zinc-800" : "bg-slate-100 text-slate-900 border-b border-slate-100"
          }`}>
            <span>📊 Active Enterprise Project Audit Log Matrix</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              darkMode ? "bg-zinc-900 text-zinc-400 border-zinc-800" : "bg-white text-slate-500 border-slate-200"
            }`}>
              Total Count: {projectMetrics.list.length} Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`font-bold uppercase text-[10px] border-b ${
                  darkMode ? "bg-zinc-900/50 text-zinc-500 border-zinc-800" : "bg-slate-50 text-slate-400 border-slate-100"
                }`}>
                  <th className="p-4 px-6">Project Parameters</th>
                  <th className="p-4 px-6">Market Sector</th>
                  <th className="p-4 px-6">Lifecycle Status</th>
                  <th className="p-4 px-6 text-right">Target Budget</th>
                  <th className="p-4 px-6 text-right">Realized Funds</th>
                  <th className={`p-4 px-6 text-right ${darkMode ? "text-indigo-400 bg-indigo-950/20" : "text-indigo-600 bg-indigo-50/50"}`}>Outstanding Receivables</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${
                darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"
              }`}>
                {projectMetrics.list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`text-center p-12 italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>No enterprise project profiles identified in relational storage.</td>
                  </tr>
                ) : (
                  projectMetrics.list.map((proj) => {
                    const percentRealized = proj.budget > 0 ? Math.round((proj.amount_paid / proj.budget) * 100) : 0;
                    return (
                      <tr key={proj.id} className={`transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"}`}>
                        <td className="p-4 px-6">
                          <span className={`font-black block ${darkMode ? "text-white" : "text-slate-900"}`}>{proj.project_name}</span>
                          <span className={`text-[10px] block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Client: {proj.client_name || "Internal Operational Task"}</span>
                        </td>
                        <td className="p-4 px-6">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wider border ${
                            darkMode ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {proj.sector}
                          </span>
                        </td>
                        <td className="p-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            proj.status === "Completed" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" :
                            proj.status === "In Progress" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" :
                            "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                          }`}>
                            {proj.status}
                          </span>
                        </td>
                        <td className={`p-4 px-6 text-right font-mono font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                          ₹{Number(proj.budget).toLocaleString("en-IN")}
                        </td>
                        <td className={`p-4 px-6 text-right font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                          <div>₹{Number(proj.amount_paid).toLocaleString("en-IN")}</div>
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">({percentRealized}% settled)</div>
                        </td>
                        <td className={`p-4 px-6 text-right font-mono font-black ${darkMode ? "text-indigo-400 bg-indigo-950/10" : "text-indigo-600 bg-indigo-50/20"}`}>
                          ₹{Number(proj.balance_amount ?? (proj.budget - proj.amount_paid)).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}