"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

interface PayrollRecord {
  id: string;
  employee_id: string;
  date: string;
  total_work_seconds: number;
  working_on: string | null;
  employee_credentials?: {
    name: string;
    email: string;
    role: string;
    withdrawal_horizon: string;
  } | null;
}

interface CompanyProject {
  id: string;
  project_name: string;
  client_name: string | null;
}

interface PayrollIncident {
  id: string;
  employee_id: string;
  date: string;
  type: "bonus" | "deduction" | "allowance" | "incentive";
  amount: number;
  description: string;
  project_id: string | null;
  payment_status: string;
  company_projects?: {
    project_name: string;
  } | null;
}

interface EmployeePayrollProfile {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  withdrawal_horizon: string;
  totalSeconds: number;
  calculatedHours: number;
  shifts: PayrollRecord[];
  incidents: PayrollIncident[];
}

export default function AdminPayrollDashboard() {
  const { darkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  const [profiles, setProfiles] = useState<EmployeePayrollProfile[]>([]);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<EmployeePayrollProfile | null>(null);

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState("");
  const [incidentType, setIncidentType] = useState<"bonus" | "deduction" | "allowance" | "incentive">("incentive");
  const [incidentAmount, setIncidentAmount] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from("company_projects")
        .select("id, project_name, client_name")
        .order("project_name", { ascending: true });
      if (data) setProjects(data);
    }
    fetchProjects();
  }, []);

  const fetchPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      const firstDay = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split("-").map(Number);
      const lastDay = `${selectedMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select(`*, employee_credentials!employee_id (name, email, role, withdrawal_horizon)`)
        .gte("date", firstDay)
        .lte("date", lastDay);

      const { data: incidentData, error: incError } = await supabase
        .from("payroll_incidents")
        .select(`*, company_projects!project_id (project_name)`)
        .gte("date", firstDay)
        .lte("date", lastDay);

      if (attError || incError) {
        console.error("Database compilation mismatch:", attError || incError);
        return;
      }

      const rawShifts = (attendanceData as PayrollRecord[]) || [];
      const rawIncidents = (incidentData as PayrollIncident[]) || [];
      const profileMap = new Map<string, EmployeePayrollProfile>();

      const { data: fallbackEmp } = await supabase
        .from("employee_credentials")
        .select("id, employee_id, name, email, role, withdrawal_horizon");

      if (fallbackEmp) {
        fallbackEmp.forEach((emp) => {
          profileMap.set(emp.id, {
            id: emp.id,
            employee_id: emp.employee_id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            withdrawal_horizon: emp.withdrawal_horizon || "1m",
            totalSeconds: 0,
            calculatedHours: 0,
            shifts: [],
            incidents: [],
          });
        });
      }

      rawShifts.forEach((shift) => {
        const empId = shift.employee_id;
        if (!profileMap.has(empId)) return;
        const profile = profileMap.get(empId)!;
        profile.totalSeconds += shift.total_work_seconds || 0;
        profile.calculatedHours = profile.totalSeconds / 3600;
        profile.shifts.push(shift);
        if (shift.employee_credentials?.withdrawal_horizon) {
          profile.withdrawal_horizon = shift.employee_credentials.withdrawal_horizon;
        }
      });

      rawIncidents.forEach((inc) => {
        const profile = profileMap.get(inc.employee_id);
        if (profile) profile.incidents.push(inc);
      });

      const processedProfiles = Array.from(profileMap.values());
      setProfiles(processedProfiles);

      if (selectedProfile) {
        const updated = processedProfiles.find((p) => p.id === selectedProfile.id);
        setSelectedProfile(updated || null);
      }
    } catch (err) {
      console.error("Error gathering state profiles:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedProfile?.id]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  const handleUpdateHorizon = async (employeeId: string, horizonValue: string) => {
    try {
      setUpdatingId(employeeId);
      setProfiles((prev) =>
        prev.map((p) => (p.id === employeeId ? { ...p, withdrawal_horizon: horizonValue } : p))
      );
      if (selectedProfile?.id === employeeId) {
        setSelectedProfile((prev) => prev ? { ...prev, withdrawal_horizon: horizonValue } : null);
      }
      const { error } = await supabase
        .from("employee_credentials")
        .update({ withdrawal_horizon: horizonValue })
        .eq("id", employeeId);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating horizon:", err);
      alert("Failed to update withdrawal horizon.");
      fetchPayrollData();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePaymentStatus = async (incidentId: string, statusValue: string) => {
    try {
      setUpdatingIncidentId(incidentId);
      setProfiles((prevProfiles) =>
        prevProfiles.map((profile) => ({
          ...profile,
          incidents: profile.incidents.map((inc) =>
            inc.id === incidentId ? { ...inc, payment_status: statusValue } : inc
          ),
        }))
      );
      if (selectedProfile) {
        setSelectedProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            incidents: prev.incidents.map((inc) =>
              inc.id === incidentId ? { ...inc, payment_status: statusValue } : inc
            ),
          };
        });
      }
      const { error } = await supabase
        .from("payroll_incidents")
        .update({ payment_status: statusValue })
        .eq("id", incidentId);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to change payment status.");
      fetchPayrollData();
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentAmount || !incidentDesc) return;
    const { error } = await supabase.from("payroll_incidents").insert({
      employee_id: modalEmployeeId,
      date: new Date().toISOString().split("T")[0],
      type: incidentType,
      amount: parseFloat(incidentAmount),
      description: incidentDesc,
      project_id: selectedProjectId === "none" ? null : selectedProjectId,
      payment_status: "Unpaid",
    });
    if (!error) {
      setShowIncidentModal(false);
      setIncidentAmount("");
      setIncidentDesc("");
      setSelectedProjectId("none");
      fetchPayrollData();
    } else {
      alert(`Database Rejected: ${error.message}`);
    }
  };

  const calculateTotalAdjustments = (incidents: PayrollIncident[]) =>
    incidents.reduce((acc, inc) => {
      if (inc.payment_status !== "Paid") return acc;
      return inc.type === "deduction" ? acc - inc.amount : acc + inc.amount;
    }, 0);

  const calculateUnpaidBalance = (incidents: PayrollIncident[]) =>
    incidents.reduce((acc, inc) => {
      if (inc.payment_status === "Paid") return acc;
      return inc.type === "deduction" ? acc - inc.amount : acc + inc.amount;
    }, 0);

  const horizonLabel = (h: string) => {
    const map: Record<string, string> = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "9m": "9 Months", "1y": "1 Year" };
    return map[h] || h || "None";
  };

  // ── SHARED INCIDENT DETAIL PANEL (used by both desktop sidebar and mobile expanded view)
  const IncidentPanel = ({ profile }: { profile: EmployeePayrollProfile }) => (
    <div className={`space-y-3 p-4 rounded-2xl border ${darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50/50 border-slate-100"}`}>
      <h4 className={`text-[11px] font-bold uppercase tracking-wide ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
        Custom Adjustments &amp; Payouts
      </h4>
      {profile.incidents.length > 0 ? (
        <>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {profile.incidents.map((inc) => (
              <div
                key={inc.id}
                className={`p-3 border rounded-xl flex flex-col gap-2 text-xs ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-xs"
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className={`font-bold block capitalize ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>
                      {inc.description}
                    </span>
                    <span className={`text-[10px] font-mono block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      {inc.date}
                    </span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${inc.type === "deduction" ? "text-rose-500" : "text-emerald-500"}`}>
                    {inc.type === "deduction" ? "-" : "+"}₹{inc.amount.toFixed(2)}
                  </span>
                </div>

                {inc.company_projects?.project_name && (
                  <div className={`text-[10px] font-semibold flex items-center gap-1 ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                    <span>📁 Project:</span>
                    <span className={`px-1.5 py-0.5 rounded ${darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-700"}`}>
                      {inc.company_projects.project_name}
                    </span>
                  </div>
                )}

                <div className={`flex items-center justify-between pt-1 border-t ${darkMode ? "border-zinc-800" : "border-slate-50"}`}>
                  <span className={`text-[10px] font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Payment status:</span>
                  <select
                    disabled={updatingIncidentId === inc.id}
                    value={inc.payment_status || "Unpaid"}
                    onChange={(e) => handleUpdatePaymentStatus(inc.id, e.target.value)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border outline-none cursor-pointer transition-opacity ${updatingIncidentId === inc.id ? "opacity-50" : ""
                      } ${inc.payment_status === "Paid"
                        ? darkMode
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : darkMode
                          ? "bg-amber-950/40 text-amber-400 border-amber-900/60"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                  >
                    <option value="Unpaid">🔴 Unpaid</option>
                    <option value="Paid">🟢 Paid</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className={`pt-3 border-t space-y-2 ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
            <div className="flex justify-between items-center text-xs">
              <span className={`font-bold uppercase tracking-wide text-[10px] ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                Total Paid:
              </span>
              <span className={`font-mono font-black text-base ${calculateTotalAdjustments(profile.incidents) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                ₹{calculateTotalAdjustments(profile.incidents).toFixed(2)}
              </span>
            </div>
            <div className={`flex justify-between items-center rounded-xl px-3 py-2 border ${darkMode ? "bg-amber-950/20 border-amber-900/40" : "bg-amber-50 border-amber-100"
              }`}>
              <span className={`font-bold uppercase tracking-wide text-[10px] flex items-center gap-1 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
                🔴 Unpaid Balance:
              </span>
              <span className={`font-mono font-black text-base ${calculateUnpaidBalance(profile.incidents) >= 0 ? (darkMode ? "text-amber-400" : "text-amber-600") : "text-rose-500"}`}>
                ₹{calculateUnpaidBalance(profile.incidents).toFixed(2)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <p className={`text-xs italic py-2 ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
          No individual ledger entries linked to this profile.
        </p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen antialiased transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50/50 text-slate-800"}`}>

      {/* ── HEADER ── */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
      >
        {/* LEFT SIDE: Content */}
        <div>
          <h1 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
            Enterprise Payroll Center
          </h1>
          <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
            Manage shifts, withdrawal windows, and payout processing flags.
          </p>
        </div>

        {/* RIGHT SIDE: Controls (Input + Button) */}
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer transition-colors ${darkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-200 focus:border-zinc-500"
                : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white"
              }`}
          />

        </div>
      </div>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── DESKTOP: side-by-side grid ── */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8">

          {/* LEFT — Table */}
          <div className={`lg:col-span-2 border rounded-3xl overflow-hidden shadow-sm h-fit transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
            <div className={`p-5 border-b text-xs font-bold uppercase tracking-wider ${darkMode ? "bg-zinc-900/50 border-zinc-800 text-zinc-500" : "bg-slate-50/50 border-slate-100 text-slate-400"
              }`}>
              Employee Payroll Calculations Rollup
            </div>

            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-14 animate-pulse rounded-xl ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`} />
                ))}
              </div>
            ) : profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase font-bold border-b ${darkMode ? "text-zinc-500 border-zinc-800 bg-zinc-900/30" : "text-slate-400 border-slate-100 bg-slate-50/20"
                      }`}>
                      <th className="py-3 px-5">Employee / Role</th>
                      <th className="py-3 px-5">Employee ID</th>
                      <th className="py-3 px-5 text-center">Withdrawal HZ</th>
                      <th className="py-3 px-5 text-center">Hours</th>
                      <th className="py-3 px-5 text-center">Incidents</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"}`}>
                    {profiles.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProfile(p)}
                        className={`transition-colors cursor-pointer ${selectedProfile?.id === p.id
                          ? darkMode ? "bg-zinc-800/50" : "bg-slate-50"
                          : darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/60"
                          }`}
                      >
                        <td className="py-4 px-5">
                          <div className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{p.name}</div>
                          <div className={`text-[10px] font-mono mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{p.role}</div>
                        </td>

                        <td className="py-4 px-5">
                          <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md inline-block ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"
                            }`}>
                            {p.employee_id}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl font-bold text-[11px] border shadow-sm select-none ${darkMode ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}>
                            {horizonLabel(p.withdrawal_horizon)}
                          </span>
                        </td>

                        <td className={`py-4 px-5 text-center font-mono font-semibold ${darkMode ? "text-zinc-300" : ""}`}>
                          {p.calculatedHours.toFixed(2)} hrs
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.incidents.length > 0
                            ? darkMode ? "bg-zinc-200 text-zinc-900" : "bg-slate-900 text-white"
                            : darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-400"
                            }`}>
                            {p.incidents.length} items
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setModalEmployeeId(p.id); setIncidentType("incentive"); setShowIncidentModal(true); }}
                            className={`font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm transition-colors cursor-pointer ${darkMode ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200" : "bg-slate-900 text-white hover:bg-slate-800"
                              }`}
                          >
                            + Adjust Pay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`text-center py-16 text-xs font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                No hours tracked this month.
              </div>
            )}
          </div>

          {/* RIGHT — Profile detail */}
          <div className="space-y-6">
            {selectedProfile ? (
              <div className={`border rounded-3xl p-6 shadow-sm space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-black text-base ${darkMode ? "text-white" : "text-slate-900"}`}>{selectedProfile.name}</h3>
                    <p className={`text-xs font-mono mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>{selectedProfile.email}</p>
                  </div>
                  <select
                    disabled={updatingId === selectedProfile.id}
                    value={selectedProfile.withdrawal_horizon || "1m"}
                    onChange={(e) => handleUpdateHorizon(selectedProfile.id, e.target.value)}
                    className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${updatingId === selectedProfile.id ? "opacity-50 animate-pulse" : ""
                      } ${darkMode
                        ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                  >
                    <option value="1m">HZ: 1 Month</option>
                    <option value="3m">HZ: 3 Months</option>
                    <option value="6m">HZ: 6 Months</option>
                    <option value="9m">HZ: 9 Months</option>
                    <option value="1y">HZ: 1 Year</option>
                  </select>
                </div>
                <IncidentPanel profile={selectedProfile} />
              </div>
            ) : (
              <div className={`border border-dashed rounded-3xl p-8 text-center text-xs font-medium transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-600" : "bg-white border-slate-200 text-slate-400"
                }`}>
                Select an employee record to view shift breakdowns, active metrics, and balance sheets.
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE CARD VIEW ── */}
        <div className="block lg:hidden space-y-4">
          <div className={`text-xs font-bold uppercase tracking-wider px-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
            Employee Payroll Rollup
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-24 animate-pulse rounded-2xl ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`} />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className={`text-center py-12 text-xs font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              No hours tracked this month.
            </div>
          ) : (
            profiles.map((p) => {
              const isExpanded = selectedProfile?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${isExpanded
                    ? darkMode ? "border-zinc-600 bg-zinc-900" : "border-slate-300 bg-white"
                    : darkMode ? "border-zinc-800 bg-zinc-900" : "border-slate-200 bg-white"
                    }`}
                >
                  {/* Card header — tappable */}
                  <div
                    className="p-4 space-y-3 cursor-pointer"
                    onClick={() => setSelectedProfile(isExpanded ? null : p)}
                  >
                    {/* Name + ID */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={`font-black block text-sm truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{p.name}</span>
                        <span className={`text-[10px] font-mono block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{p.role}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${darkMode ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                          {p.employee_id}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isExpanded
                          ? darkMode ? "bg-zinc-700 text-zinc-300" : "bg-slate-200 text-slate-600"
                          : darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-400"
                          }`}>
                          {isExpanded ? "▲ Collapse" : "▼ Expand"}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/70 border-slate-100"
                      }`}>
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Hours</span>
                        <span className={`font-mono font-bold text-sm ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>
                          {p.calculatedHours.toFixed(2)} hrs
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 items-center">
                        <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Withdrawal HZ</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${darkMode ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                          {horizonLabel(p.withdrawal_horizon)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Incidents</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.incidents.length > 0
                          ? darkMode ? "bg-zinc-200 text-zinc-900" : "bg-slate-900 text-white"
                          : darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-400"
                          }`}>
                          {p.incidents.length} items
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setModalEmployeeId(p.id); setIncidentType("incentive"); setShowIncidentModal(true); }}
                        className={`flex-1 h-9 text-xs font-bold rounded-xl transition-colors cursor-pointer ${darkMode ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200" : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                      >
                        + Adjust Pay
                      </button>
                      <select
                        disabled={updatingId === p.id}
                        value={p.withdrawal_horizon || "1m"}
                        onChange={(e) => { e.stopPropagation(); handleUpdateHorizon(p.id, e.target.value); }}
                        className={`flex-1 h-9 text-xs font-bold border rounded-xl outline-none cursor-pointer px-2 transition-all ${updatingId === p.id ? "opacity-50 animate-pulse" : ""
                          } ${darkMode
                            ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                      >
                        <option value="1m">HZ: 1 Month</option>
                        <option value="3m">HZ: 3 Months</option>
                        <option value="6m">HZ: 6 Months</option>
                        <option value="9m">HZ: 9 Months</option>
                        <option value="1y">HZ: 1 Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Expanded incident panel */}
                  {isExpanded && (
                    <div className={`px-4 pb-4 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                      <div className="pt-3">
                        <IncidentPanel profile={p} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── INCIDENT MODAL ── */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddIncident}
            className={`border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-800"
              }`}
          >
            <h3 className={`font-black text-sm tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Add Adjustment / Incident Charge
            </h3>

            {[
              {
                label: "Adjustment Classification",
                content: (
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as any)}
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer transition-all ${darkMode
                      ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white"
                      }`}
                  >
                    <option value="incentive">Incentive Pay (+)</option>
                    <option value="bonus">Bonus Pay (+)</option>
                    <option value="allowance">Allowance (+)</option>
                    <option value="deduction">Deduction (-)</option>
                  </select>
                ),
              },
              {
                label: "Associated Project (Optional)",
                content: (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer transition-all ${darkMode
                      ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white"
                      }`}
                  >
                    <option value="none">General / No Specific Project</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.project_name} {proj.client_name ? `(${proj.client_name})` : ""}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                label: "Amount (₹)",
                content: (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={incidentAmount}
                    onChange={(e) => setIncidentAmount(e.target.value)}
                    className={`w-full text-xs font-mono px-3 py-2 rounded-xl border outline-none transition-all ${darkMode
                      ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white"
                      }`}
                  />
                ),
              },
              {
                label: "Description Memo",
                content: (
                  <input
                    type="text"
                    placeholder="e.g., Target Milestone Incentive, Launch Bonus"
                    required
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    className={`w-full text-xs font-medium px-3 py-2 rounded-xl border outline-none transition-all ${darkMode
                      ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white"
                      }`}
                  />
                ),
              },
            ].map(({ label, content }) => (
              <div key={label} className="space-y-1">
                <label className={`text-[10px] font-bold uppercase block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  {label}
                </label>
                {content}
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className={`px-4 py-2 border rounded-xl cursor-pointer transition-colors ${darkMode
                  ? "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                  : "border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-colors ${darkMode ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200" : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}