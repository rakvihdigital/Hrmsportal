"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface EmployeeAccount {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  auto_pass: string;
  role: string;
  dob: string;
}

interface RoleItem {
  id: string;
  role_name: string;
  role_code: string;
}

export default function CredentialsPage() {
  const { darkMode } = useTheme();
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeAccount | null>(null);
  const [revealPassId, setRevealPassId] = useState<string | null>(null);

  const [copiedPackageId, setCopiedPackageId] = useState<string | null>(null);

  // --- FILTERING STATE ---
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    dob: "",
    employee_id: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // --- EMPLOYEE ID AVAILABILITY CHECK STATE ---
  // status: 'idle' | 'checking' | 'available' | 'taken' | 'unchanged'
  const [empIdStatus, setEmpIdStatus] = useState<"idle" | "checking" | "available" | "taken" | "unchanged">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchActiveRoles()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("employee_credentials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employee records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("company_roles")
        .select("*")
        .order("role_name", { ascending: true });
      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error("Error fetching active roles:", err);
    }
  };

  const generateComplexPassword = (name: string): string => {
    const clean = name.replace(/\s+/g, "");
    const letters = clean.length < 4 ? clean.padEnd(4, "X") : clean.substring(0, 4);
    const formattedLetters = letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
    const symbolsPool = ["@#", "$%", "&*", "#$", "@$"];
    const chosenSymbols = symbolsPool[Math.floor(Math.random() * symbolsPool.length)];
    const randomDigits = Math.floor(10 + Math.random() * 90);
    return `${formattedLetters}${chosenSymbols}${randomDigits}`;
  };

  const handleCopyEntirePackage = (
    employeeId: string,
    name: string,
    email: string,
    pass: string,
    id: string
  ) => {
    const loginUrl = window.location.origin;
    const textBlock = `*Employee Login Credentials*\n*Employee ID:* ${employeeId}\n*Name:* ${name}\n*Email:* ${email}\n*Password:* ${pass}\n*Login Link:* ${loginUrl}`;

    navigator.clipboard.writeText(textBlock);
    setCopiedPackageId(id);
    setTimeout(() => setCopiedPackageId(null), 2000);
  };

  // --- CHECK IF A TYPED EMPLOYEE ID IS ALREADY TAKEN (debounced) ---
  useEffect(() => {
    // Only relevant while editing an existing record (new records auto-generate their ID)
    if (!isEditing) {
      setEmpIdStatus("idle");
      return;
    }

    const typedId = formData.employee_id.trim();
    const originalEmp = employees.find((e) => e.id === formData.id);

    if (!typedId) {
      setEmpIdStatus("idle");
      return;
    }

    // Nothing changed from what's already saved
    if (originalEmp && typedId === originalEmp.employee_id) {
      setEmpIdStatus("unchanged");
      return;
    }

    setEmpIdStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("employee_credentials")
          .select("id")
          .eq("employee_id", typedId)
          .neq("id", formData.id) // exclude the record being edited
          .maybeSingle();

        if (error) throw error;
        setEmpIdStatus(data ? "taken" : "available");
      } catch (err) {
        console.error("Error checking employee_id availability:", err);
        setEmpIdStatus("idle");
      }
    }, 400); // debounce so we don't hit the DB on every keystroke

    return () => clearTimeout(timer);
  }, [formData.employee_id, formData.id, isEditing, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submission if the typed Employee ID is already in use by someone else
    if (isEditing && empIdStatus === "taken") {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const updatePayload: Record<string, any> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          dob: formData.dob,
        };

        // Only include employee_id in the update if it was actually changed,
        // so we don't accidentally trip the unique constraint on an unmodified field.
        const originalEmp = employees.find((emp) => emp.id === formData.id);
        const trimmedId = formData.employee_id.trim();
        if (trimmedId && trimmedId !== originalEmp?.employee_id) {
          updatePayload.employee_id = trimmedId;
        }

        const { error } = await supabase
          .from("employee_credentials")
          .update(updatePayload)
          .eq("id", formData.id);

        if (error) throw error;
      } else {
        const complexPassword = generateComplexPassword(formData.name);
        const { error } = await supabase.from("employee_credentials").insert([
          {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            auto_pass: complexPassword,
            dob: formData.dob,
            // employee_id intentionally omitted on create — the DB trigger
            // (generate_employee_id) auto-assigns it on insert.
          },
        ]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error("Error handling credential submission:", err);
      if (err?.code === "23505") {
        // Postgres unique_violation, as a last-resort safety net
        alert("That Employee ID is already in use. Please choose a different one.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this record?")) return;
    try {
      await supabase.from("employee_credentials").delete().eq("id", id);
      fetchEmployees();
    } catch (err) {
      console.error("Error deleting credential record:", err);
    }
  };

  // --- UPDATED FILTERING WITH SEARCH ---
  const filteredEmployees = employees.filter((emp) => {
    // Role filter
    if (selectedRoleFilter !== "all" && emp.role !== selectedRoleFilter) {
      return false;
    }

    // Search filter (name OR employee_id)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = emp.name.toLowerCase().includes(query);
      const idMatch = emp.employee_id.toLowerCase().includes(query);
      if (!nameMatch && !idMatch) {
        return false;
      }
    }

    return true;
  });

  const exportToExcel = () => {
    if (filteredEmployees.length === 0) return alert("No active data entries to export.");

    const headers = ["Employee ID", "Employee Name", "Designation & Code", "Corporate Email", "Date of Birth", "Generated Password"];
    const rows = filteredEmployees.map((emp) => [
      `"${emp.employee_id}"`,
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${emp.role.replace(/"/g, '""')}"`,
      `"${emp.email}"`,
      `"${emp.dob || ""}"`,
      `"${emp.auto_pass}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_Credentials_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP INTERACTIVE ACCESS BAR */}
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
          <div>
            <h1 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              System Login Credentials
            </h1>
            <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
              Issue secure accounts using dynamically linked role configs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* --- ROLE FILTER DROPDOWN --- */}
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className={`w-full h-10 px-3 pr-8 text-xs font-bold rounded-xl border appearance-none outline-none cursor-pointer transition-all ${darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-700"
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-300"
                  }`}
              >
                <option value="all">All Roles & Positions</option>
                {roles.map((r) => {
                  const combinedValue = `${r.role_name} (${r.role_code})`;
                  return (
                    <option key={r.id} value={combinedValue}>
                      {r.role_name} ({r.role_code})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* --- NEW SEARCH BAR --- */}
            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <input
                type="text"
                placeholder="Search name or Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 px-4 pl-10 text-xs font-bold rounded-xl border outline-none transition-all ${darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-700 placeholder-zinc-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-300 placeholder-slate-400"
                  }`}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${darkMode ? "text-zinc-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center pointer-events-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-1 sm:flex-initial">
              <button
                onClick={exportToExcel}
                className={`flex-1 sm:flex-initial h-10 px-4 border text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${darkMode
                  ? "border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                title="Download records as Excel CSV spreadsheet"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel Export
              </button>

              <button
                onClick={() => {
                  setFormData({
                    id: "",
                    name: "",
                    email: "",
                    role: roles[0]?.role_name ? `${roles[0].role_name} (${roles[0].role_code})` : "",
                    dob: "",
                    employee_id: "",
                  });
                  setEmpIdStatus("idle");
                  setIsEditing(false);
                  setIsModalOpen(true);
                }}
                className={`flex-1 sm:flex-initial h-10 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${darkMode
                  ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                  : "bg-[#505824] hover:bg-[#3e441c] text-white"
                  }`}
              >
                Create Account for Employee
              </button>
            </div>
          </div>
        </div>

        {/* CORE DATABASE VIEWS WRAPPER */}
        <div className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
          {isLoading ? (
            <div className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${darkMode ? "text-zinc-500" : "text-slate-400"
              }`}>
              Loading DB Layers Matrix...
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE INTERFACE */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className={`font-bold uppercase text-[10px] border-b h-12 ${darkMode ? "bg-zinc-900/50 text-zinc-500 border-zinc-800" : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}>
                      <th className="px-6">Full Name / Designation</th>
                      <th className="px-6">Employee ID</th>
                      <th className="px-6">Corporate Email</th>
                      <th className="px-6">Date of Birth</th>

                      <th className="px-6 text-center">Copy Credentials</th>
                      <th className="px-6 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"
                    }`}>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`text-center p-12 italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          No registered database entries located for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id} className={`h-16 transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"}`}>
                          <td className="px-6">
                            <div>
                              <div className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</div>
                              <div className={`text-[10px] font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</div>
                            </div>
                          </td>
                          <td className="px-6">
                            <div className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border inline-block ${darkMode ? "bg-zinc-950 text-zinc-400 border-zinc-800" : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {emp.employee_id}
                            </div>
                          </td>
                          <td className={`px-6 font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                            {emp.email}
                          </td>
                          <td className={`px-6 font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                            {emp.dob ? new Date(emp.dob).toLocaleDateString() : "—"}
                          </td>

                          <td className="px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleCopyEntirePackage(emp.employee_id, emp.name, emp.email, emp.auto_pass, emp.id)}
                              className={`h-8 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${copiedPackageId === emp.id
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
                                : darkMode
                                  ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                  : "bg-slate-50 hover:bg-[#ffcf0f] hover:text-[#505824] border-slate-200 text-slate-700"
                                }`}
                            >
                              {copiedPackageId === emp.id ? "✓ Pack Copied" : "📋 Copy Credentials"}
                            </button>
                          </td>
                          <td className="px-6 pr-8 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedEmp(emp);
                                  setIsViewModalOpen(true);
                                }}
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode ? "text-zinc-500 hover:text-blue-400 hover:bg-zinc-950" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  }`}
                                title="Inspect Details"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setFormData({
                                    id: emp.id,
                                    name: emp.name,
                                    email: emp.email,
                                    role: emp.role,
                                    dob: emp.dob || "",
                                    employee_id: emp.employee_id || "",
                                  });
                                  setEmpIdStatus("idle");
                                  setIsEditing(true);
                                  setIsModalOpen(true);
                                }}
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode ? "text-zinc-500 hover:text-amber-400 hover:bg-zinc-950" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                  }`}
                                title="Edit Row Entry"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(emp.id)}
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-950" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                title="Delete Record"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE ADAPTIVE LAYER VIEW */}
              <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                {filteredEmployees.length === 0 ? (
                  <div className={`text-center p-8 italic text-xs ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    No registered database entries located for the selected criteria.
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div key={emp.id} className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className={`font-black block text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{emp.name}</span>
                          <span className={`text-[10px] font-bold block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{emp.role}</span>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 font-mono text-[10px] font-black rounded border ${darkMode ? "bg-zinc-950 text-zinc-400 border-zinc-800" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                          {emp.employee_id}
                        </span>
                      </div>

                      <div className={`p-3 rounded-xl space-y-2 border ${darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/70 border-slate-100"}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Corporate Email</span>
                          <span className={`font-mono tracking-tight ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>{emp.email}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Date of Birth</span>
                          <span className={`font-mono tracking-tight ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
                            {emp.dob ? new Date(emp.dob).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className={`flex flex-col gap-1 pt-1.5 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                          <span className={`text-[9px] uppercase font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Access Key</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs font-bold tracking-wider ${darkMode ? "text-white" : "text-slate-900"}`}>
                              {revealPassId === emp.id ? emp.auto_pass : "••••••••••••"}
                            </span>
                            <button type="button" onClick={() => setRevealPassId(revealPassId === emp.id ? null : emp.id)} className="cursor-pointer text-sm">
                              {revealPassId === emp.id ? "🙈" : "👁️"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyEntirePackage(emp.employee_id, emp.name, emp.email, emp.auto_pass, emp.id)}
                          className={`flex-1 h-9 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${copiedPackageId === emp.id
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
                            : darkMode
                              ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                        >
                          {copiedPackageId === emp.id ? "✓ Copied" : "📋 Copy Package"}
                        </button>
                        <button
                          onClick={() => {
                            setFormData({
                              id: emp.id,
                              name: emp.name,
                              email: emp.email,
                              role: emp.role,
                              dob: emp.dob || "",
                              employee_id: emp.employee_id || "",
                            });
                            setEmpIdStatus("idle");
                            setIsEditing(true);
                            setIsModalOpen(true);
                          }}
                          className={`h-9 px-3 border rounded-xl flex items-center justify-center cursor-pointer ${darkMode ? "border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-800" : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                            }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setIsViewModalOpen(true);
                          }}
                          className={`h-9 px-3 border rounded-xl flex items-center justify-center cursor-pointer ${darkMode ? "border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-800" : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                            }`}
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className={`h-9 px-3 border rounded-xl flex items-center justify-center cursor-pointer ${darkMode ? "border-zinc-800 text-red-400 bg-zinc-950 hover:bg-zinc-800" : "border-slate-200 text-red-600 bg-white hover:bg-red-50"
                            }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* DIALOG LAYERS: UPDATE & GENERATION MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md border rounded-3xl p-6 shadow-xl transition-all duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}>
              <h3 className={`text-base font-black tracking-tight mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
                {isEditing ? "Modify Designation" : "Create Access Credentials"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Employee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Sharma"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${darkMode
                      ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500 disabled:text-zinc-600"
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824] disabled:text-slate-400"
                      }`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isEditing}
                  />
                </div>

                {/* --- EMPLOYEE ID: only shown/editable while editing an existing record.
                     New records auto-generate their ID via the DB trigger, so there's
                     nothing meaningful to type here on create. --- */}
                {isEditing && (
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      Employee ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. EMP-0001"
                        className={`w-full h-11 border rounded-xl px-4 pr-10 font-mono font-bold text-sm outline-none transition-all ${empIdStatus === "taken"
                            ? "border-red-400 focus:border-red-500"
                            : darkMode
                              ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                              : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                          } ${darkMode ? "bg-zinc-950" : "bg-slate-50"}`}
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        required
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        {empIdStatus === "checking" && (
                          <Loader2 className={`w-4 h-4 animate-spin ${darkMode ? "text-zinc-500" : "text-slate-400"}`} />
                        )}
                        {empIdStatus === "available" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {empIdStatus === "taken" && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    {empIdStatus === "taken" && (
                      <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                        This Employee ID already exists. Choose a different one.
                      </p>
                    )}
                    {empIdStatus === "available" && (
                      <p className="text-[10px] font-bold text-emerald-500 mt-1.5 ml-1">
                        Employee ID is available.
                      </p>
                    )}
                    {empIdStatus === "idle" && (
                      <p className={`text-[10px] font-medium mt-1.5 ml-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                        Auto-generated on creation. Change only if you need a custom ID.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@rakvih.com"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                      }`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                      }`}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    required
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Designation Role
                  </label>
                  <select
                    className={`w-full h-11 border rounded-xl px-4 font-bold text-sm outline-none cursor-pointer transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-[#505824]"
                      }`}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Designation Position...</option>
                    {roles.map((r) => {
                      const combinedValue = `${r.role_name} (${r.role_code})`;
                      return (
                        <option key={r.id} value={combinedValue}>
                          {r.role_name} ({r.role_code})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`h-10 px-4 text-xs font-bold cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (isEditing && empIdStatus === "taken") || (isEditing && empIdStatus === "checking")}
                    className={`h-10 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                      }`}
                  >
                    {isSubmitting ? "Saving..." : "Save to Database"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DIALOG LAYERS: COMPLETE DATA INSPECTION VIEW */}
        {isViewModalOpen && selectedEmp && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md border rounded-3xl p-6 shadow-xl relative transition-all duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}>
              <h3 className={`text-[10px] font-black uppercase tracking-wider mb-4 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                Credential Inspection
              </h3>

              <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-150"
                }`}>
                <div>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Name / Profile</span>
                  <div className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{selectedEmp.name}</div>
                  <div className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>{selectedEmp.role}</div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Employee ID</span>
                  <div className="font-mono text-xs font-bold">{selectedEmp.employee_id}</div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Email Parameter</span>
                  <div className="font-mono text-xs font-bold">{selectedEmp.email}</div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Date of Birth</span>
                  <div className="font-mono text-xs font-bold">
                    {selectedEmp.dob ? new Date(selectedEmp.dob).toLocaleDateString() : "—"}
                  </div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Password String</span>
                  <div className="font-mono text-xs text-emerald-500 font-black tracking-wide">{selectedEmp.auto_pass}</div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyEntirePackage(selectedEmp.employee_id, selectedEmp.name, selectedEmp.email, selectedEmp.auto_pass, "view-modal")}
                  className={`flex-1 h-11 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${copiedPackageId === "view-modal"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : darkMode
                      ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                      : "bg-[#505824] text-white hover:bg-[#3e441c]"
                    }`}
                >
                  {copiedPackageId === "view-modal" ? "✓ Credentials Copied" : "📋 Copy Credentials Package"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className={`h-11 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}