"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectItem {
  id: string;
  project_name: string;
  client_name: string;
  sector: "IT & Development" | "Calling & Support";
  status: "Planning" | "In Progress" | "Review" | "Completed";
  budget: number;
  amount_paid: number;
  balance_amount: number;
  start_date: string;
  end_date: string;
  description: string;
  document_urls: string[];
  live_site_url: string;
  meta_details: {
    platforms?: string[];
    agent_seats?: string;
    shift_type?: string;
  };
  assigned_employees?: Employee[];
}

export default function ProjectsPage() {
  const { darkMode } = useTheme();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    id: "",
    project_name: "",
    client_name: "",
    sector: "IT & Development",
    status: "Planning",
    budget: "",
    amount_paid: "",
    start_date: "",
    end_date: "",
    description: "",
    live_site_url: "",
    document_urls: [] as string[],
    assignedEmployeeIds: [] as string[],
    hasWebsite: false,
    hasPlayStore: false,
    hasAppleStore: false,
    agent_seats: "",
    shift_type: "Day Shift",
  });

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    setIsLoading(true);
    await fetchEmployees();
    await fetchProjects();
    setIsLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employee_credentials")
      .select("id, name, email, role")
      .order("name");
    setTeamMembers(data || []);
  };

  const fetchProjects = async () => {
    const { data: projs } = await supabase
      .from("company_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!projs) return setProjects([]);

    const enrichedProjects = await Promise.all(
      projs.map(async (p) => {
        const { data: links } = await supabase
          .from("project_assignments")
          .select("employee_credentials(id, name, email, role)")
          .eq("project_id", p.id);
        const assigned =
          links?.map((l: any) => l.employee_credentials).filter(Boolean) || [];
        return { ...p, assigned_employees: assigned };
      })
    );
    setProjects(enrichedProjects);
  };

  useEffect(() => {
    if (isEditing) return;
    if (formData.sector === "IT & Development") {
      let plats: string[] = [];
      if (formData.hasWebsite) plats.push("Web App");
      if (formData.hasPlayStore) plats.push("Android Play Store");
      if (formData.hasAppleStore) plats.push("iOS App Store");
      setFormData((prev) => ({
        ...prev,
        description: `Software suite built out for execution across: [${plats.join(" + ") || "No Platforms Checked"}]. Build covers custom staging and environment control maps.`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        description: `BPO support operation framework running ${formData.agent_seats || "0"} workstation channels optimized under a ${formData.shift_type} module.`,
      }));
    }
  }, [
    formData.sector,
    formData.hasWebsite,
    formData.hasPlayStore,
    formData.hasAppleStore,
    formData.agent_seats,
    formData.shift_type,
    isEditing,
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const targetFile = files[0];
      const fileExt = targetFile.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-docs")
        .upload(filePath, targetFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("project-docs")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setFormData((prev) => ({
          ...prev,
          document_urls: [...prev.document_urls, publicUrlData.publicUrl],
        }));
      }
    } catch (err: any) {
      alert(`File Pipeline Error: ${err.message || err}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveDocument = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      document_urls: prev.document_urls.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleToggleEmployee = (empId: string) => {
    setFormData((prev) => {
      const alreadyChecked = prev.assignedEmployeeIds.includes(empId);
      return {
        ...prev,
        assignedEmployeeIds: alreadyChecked
          ? prev.assignedEmployeeIds.filter((id) => id !== empId)
          : [...prev.assignedEmployeeIds, empId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const metaPayload: any = {};
    if (formData.sector === "IT & Development") {
      metaPayload.platforms = [];
      if (formData.hasWebsite) metaPayload.platforms.push("Website");
      if (formData.hasPlayStore) metaPayload.platforms.push("Play Store");
      if (formData.hasAppleStore) metaPayload.platforms.push("Apple Store");
    } else {
      metaPayload.agent_seats = formData.agent_seats;
      metaPayload.shift_type = formData.shift_type;
    }

    const projectPayload = {
      project_name: formData.project_name,
      client_name: formData.client_name,
      sector: formData.sector,
      status: formData.status,
      budget: parseFloat(formData.budget) || 0,
      amount_paid: parseFloat(formData.amount_paid) || 0,
      start_date: formData.start_date || new Date().toISOString().split("T")[0],
      end_date: formData.end_date || null,
      description: formData.description,
      live_site_url: formData.live_site_url,
      document_urls: formData.document_urls,
      meta_details: metaPayload,
    };

    let targetProjectId = formData.id;

    if (isEditing) {
      await supabase
        .from("company_projects")
        .update(projectPayload)
        .eq("id", targetProjectId);
      await supabase
        .from("project_assignments")
        .delete()
        .eq("project_id", targetProjectId);
    } else {
      const { data: newProj } = await supabase
        .from("company_projects")
        .insert([projectPayload])
        .select()
        .single();
      if (newProj) targetProjectId = newProj.id;
    }

    if (targetProjectId && formData.assignedEmployeeIds.length > 0) {
      const relationPayloads = formData.assignedEmployeeIds.map((empId) => ({
        project_id: targetProjectId,
        employee_id: empId,
      }));
      await supabase.from("project_assignments").insert(relationPayloads);
    }

    setIsModalOpen(false);
    fetchProjects();
  };

  const getStatusStyles = (status: string) => {
    if (status === "Completed")
      return darkMode
        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Review")
      return darkMode
        ? "bg-amber-950/40 text-amber-400 border-amber-900/60"
        : "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "In Progress")
      return darkMode
        ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
        : "bg-blue-50 text-blue-700 border-blue-200";
    return darkMode
      ? "bg-zinc-800 text-zinc-400 border-zinc-700"
      : "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div
      className={`min-h-screen antialiased p-4 md:p-8 pt-2 space-y-6 transition-colors duration-300 ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          <div>
         
            <h1
              className={`text-lg sm:text-xl font-black tracking-tight mt-2 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Enterprise Project Hub
            </h1>
            <p
              className={`text-xs font-medium mt-0.5 ${
                darkMode ? "text-zinc-400" : "text-slate-400"
              }`}
            >
              Real-time financial ledgers, asset endpoints, and resource matrices.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({
                id: "", project_name: "", client_name: "", sector: "IT & Development",
                status: "Planning", budget: "", amount_paid: "",
                start_date: new Date().toISOString().split("T")[0], end_date: "",
                description: "", document_urls: [], live_site_url: "",
                assignedEmployeeIds: [], hasWebsite: true, hasPlayStore: false,
                hasAppleStore: false, agent_seats: "10", shift_type: "Day Shift",
              });
              setIsEditing(false);
              setIsModalOpen(true);
            }}
            className={`h-10 px-5 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-center ${
              darkMode
                ? "bg-[#ffcf0f] text-zinc-950 hover:bg-[#e0b60d]"
                : "bg-[#505824] hover:bg-[#3e441c] text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Initialize Project
          </button>
        </div>

        {/* ── TABLE WRAPPER ── */}
        <div
          className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          {isLoading ? (
            <div
              className={`p-16 text-center text-xs font-bold animate-pulse tracking-wide ${
                darkMode ? "text-zinc-500" : "text-slate-400"
              }`}
            >
              Syncing relational records architecture...
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr
                      className={`font-bold uppercase text-[10px] border-b h-14 ${
                        darkMode
                          ? "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}
                    >
                      <th className="px-6 pl-8">Project / Client / Sector</th>
                      <th className="px-6">Financial Ledger</th>
                      <th className="px-6">Scope & Status</th>
                      <th className="px-6">Team</th>
                      <th className="px-6">Endpoints & Assets</th>
                      <th className="px-6 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y font-medium ${
                      darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"
                    }`}
                  >
                    {projects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className={`p-12 text-center italic text-xs ${
                            darkMode ? "text-zinc-500" : "text-slate-400"
                          }`}
                        >
                          No projects found. Initialize a new project scope.
                        </td>
                      </tr>
                    ) : (
                      projects.map((proj) => (
                        <tr
                          key={proj.id}
                          className={`transition-colors ${
                            darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/50"
                          }`}
                        >
                          {/* Project / Client */}
                          <td className="px-6 py-5 pl-8 max-w-[220px]">
                            <div className={`font-black text-base tracking-tight truncate ${darkMode ? "text-white" : "text-slate-900"}`}>
                              {proj.project_name}
                            </div>
                            <div className={`text-xs font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              <span className={darkMode ? "text-zinc-600" : "text-slate-300"}>Client: </span>
                              {proj.client_name || "Internal Venture"}
                            </div>
                            <span
                              className={`inline-block mt-2 px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wide border ${
                                darkMode
                                  ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {proj.sector}
                            </span>
                          </td>

                          {/* Financial Ledger */}
                          <td className="px-6 py-5">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className={darkMode ? "text-zinc-500" : "text-slate-400"}>Budget:</span>
                                <span className={`font-mono font-bold ${darkMode ? "text-zinc-200" : "text-slate-900"}`}>
                                  ₹{(proj.budget || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-500">
                                <span>Paid:</span>
                                <span className="font-mono font-bold">₹{(proj.amount_paid || 0).toLocaleString()}</span>
                              </div>
                              <div className={`flex justify-between gap-4 border-t pt-1 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                                <span className={darkMode ? "text-zinc-500" : "text-slate-400"}>Balance:</span>
                                <span className={`font-mono font-bold ${(proj.balance_amount || 0) > 0 ? "text-rose-500" : darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                  ₹{(proj.balance_amount || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="px-6 py-5 max-w-[220px]">
                            <span className={`inline-block mb-1.5 px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider border ${getStatusStyles(proj.status)}`}>
                              {proj.status}
                            </span>
                            <p className={`text-[11px] font-medium line-clamp-2 leading-relaxed mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              {proj.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {proj.sector === "IT & Development" &&
                                proj.meta_details?.platforms?.map((p, i) => (
                                  <span key={i} className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${darkMode ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-200/40"}`}>
                                     {p}
                                  </span>
                                ))}
                              {proj.sector === "Calling & Support" && (
                                <>
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${darkMode ? "bg-purple-950/40 text-purple-400 border-purple-900/50" : "bg-purple-50 text-purple-700 border-purple-200/40"}`}>
                                     {proj.meta_details?.agent_seats} Seats
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${darkMode ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-700 border-indigo-200/40"}`}>
                                    ⏱️ {proj.meta_details?.shift_type}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Team */}
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {proj.assigned_employees && proj.assigned_employees.length > 0 ? (
                                proj.assigned_employees.map((emp) => (
                                  <div
                                    key={emp.id}
                                    title={emp.role}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide shadow-sm ${
                                      darkMode ? "bg-zinc-700 text-zinc-200" : "bg-slate-900 text-white"
                                    }`}
                                  >
                                    {emp.name}
                                  </div>
                                ))
                              ) : (
                                <span className={`text-xs italic ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>
                                  No team assigned
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Endpoints */}
                          <td className="px-6 py-5 space-y-2">
                            {proj.live_site_url ? (
                              <a
                                href={proj.live_site_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                                  darkMode
                                    ? "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-900/40"
                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                }`}
                              >
                                🌐 Live URL
                              </a>
                            ) : (
                              <div className={`text-[10px] italic ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>No Live Route</div>
                            )}
                            <div className="space-y-0.5">
                              {proj.document_urls && proj.document_urls.length > 0 ? (
                                proj.document_urls.slice(0, 3).map((url, i) => (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`block text-[11px] font-medium hover:underline truncate max-w-[130px] ${
                                      darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-[#505824]"
                                    }`}
                                  >
                                    📄 SOW #{i + 1}
                                  </a>
                                ))
                              ) : (
                                <span className={`text-[10px] ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>No uploads</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-5 text-right pr-8">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setFormData({
                                    id: proj.id, project_name: proj.project_name,
                                    client_name: proj.client_name || "", sector: proj.sector,
                                    status: proj.status, budget: proj.budget.toString(),
                                    amount_paid: (proj.amount_paid || 0).toString(),
                                    start_date: proj.start_date || "", end_date: proj.end_date || "",
                                    description: proj.description || "", live_site_url: proj.live_site_url || "",
                                    document_urls: proj.document_urls || [],
                                    assignedEmployeeIds: proj.assigned_employees?.map((e) => e.id) || [],
                                    hasWebsite: proj.meta_details?.platforms?.includes("Website") || false,
                                    hasPlayStore: proj.meta_details?.platforms?.includes("Play Store") || false,
                                    hasAppleStore: proj.meta_details?.platforms?.includes("Apple Store") || false,
                                    agent_seats: proj.meta_details?.agent_seats || "",
                                    shift_type: proj.meta_details?.shift_type || "Day Shift",
                                  });
                                  setIsEditing(true);
                                  setIsModalOpen(true);
                                }}
                                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                  darkMode
                                    ? "text-zinc-500 hover:text-amber-400 hover:bg-zinc-950"
                                    : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Confirm row deletion?")) {
                                    supabase.from("company_projects").delete().eq("id", proj.id).then(() => fetchProjects());
                                  }
                                }}
                                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                  darkMode
                                    ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-950"
                                    : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                }`}
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

              {/* ── MOBILE CARD VIEW ── */}
              <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                {projects.length === 0 ? (
                  <div className={`text-center p-8 italic text-xs ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    No projects found. Initialize a new project scope.
                  </div>
                ) : (
                  projects.map((proj) => (
                    <div key={proj.id} className="p-4 space-y-3 text-xs">

                      {/* Project name + sector + status */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`font-black block text-sm truncate ${darkMode ? "text-white" : "text-slate-900"}`}>
                            {proj.project_name}
                          </span>
                          <span className={`text-[10px] font-bold block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            {proj.client_name || "Internal Venture"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-black uppercase tracking-wide ${getStatusStyles(proj.status)}`}>
                            {proj.status}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${darkMode ? "bg-zinc-800 text-zinc-500 border-zinc-700" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {proj.sector === "IT & Development" ? "IT" : "BPO"}
                          </span>
                        </div>
                      </div>

                      {/* Financial block */}
                      <div className={`p-3 rounded-xl space-y-1.5 border ${darkMode ? "bg-zinc-950/40 border-zinc-800/60" : "bg-slate-50/70 border-slate-100"}`}>
                        <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Financial Ledger</span>
                        <div className="flex justify-between">
                          <span className={darkMode ? "text-zinc-500" : "text-slate-400"}>Budget</span>
                          <span className={`font-mono font-bold ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>₹{(proj.budget || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-500">
                          <span>Paid</span>
                          <span className="font-mono font-bold">₹{(proj.amount_paid || 0).toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between pt-1 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                          <span className={darkMode ? "text-zinc-500" : "text-slate-400"}>Balance</span>
                          <span className={`font-mono font-bold ${(proj.balance_amount || 0) > 0 ? "text-rose-500" : darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            ₹{(proj.balance_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Scope meta chips */}
                      <div className="flex flex-wrap gap-1">
                        {proj.sector === "IT & Development" &&
                          proj.meta_details?.platforms?.map((p, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${darkMode ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-200/40"}`}>
                              🚀 {p}
                            </span>
                          ))}
                        {proj.sector === "Calling & Support" && (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${darkMode ? "bg-purple-950/40 text-purple-400 border-purple-900/50" : "bg-purple-50 text-purple-700 border-purple-200/40"}`}>
                              👥 {proj.meta_details?.agent_seats} Seats
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${darkMode ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-700 border-indigo-200/40"}`}>
                              ⏱️ {proj.meta_details?.shift_type}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Team */}
                      {proj.assigned_employees && proj.assigned_employees.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proj.assigned_employees.map((emp) => (
                            <div
                              key={emp.id}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${darkMode ? "bg-zinc-700 text-zinc-200" : "bg-slate-900 text-white"}`}
                            >
                              {emp.name}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      {(proj.live_site_url || (proj.document_urls && proj.document_urls.length > 0)) && (
                        <div className="flex flex-wrap gap-2">
                          {proj.live_site_url && (
                            <a
                              href={proj.live_site_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${darkMode ? "bg-blue-950/40 text-blue-400 border-blue-900/50" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                            >
                              🌐 Live URL
                            </a>
                          )}
                          {proj.document_urls?.slice(0, 2).map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${darkMode ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                            >
                              📄 SOW #{i + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setFormData({
                              id: proj.id, project_name: proj.project_name,
                              client_name: proj.client_name || "", sector: proj.sector,
                              status: proj.status, budget: proj.budget.toString(),
                              amount_paid: (proj.amount_paid || 0).toString(),
                              start_date: proj.start_date || "", end_date: proj.end_date || "",
                              description: proj.description || "", live_site_url: proj.live_site_url || "",
                              document_urls: proj.document_urls || [],
                              assignedEmployeeIds: proj.assigned_employees?.map((e) => e.id) || [],
                              hasWebsite: proj.meta_details?.platforms?.includes("Website") || false,
                              hasPlayStore: proj.meta_details?.platforms?.includes("Play Store") || false,
                              hasAppleStore: proj.meta_details?.platforms?.includes("Apple Store") || false,
                              agent_seats: proj.meta_details?.agent_seats || "",
                              shift_type: proj.meta_details?.shift_type || "Day Shift",
                            });
                            setIsEditing(true);
                            setIsModalOpen(true);
                          }}
                          className={`flex-1 h-9 border rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            darkMode
                              ? "border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-800"
                              : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Confirm row deletion?")) {
                              supabase.from("company_projects").delete().eq("id", proj.id).then(() => fetchProjects());
                            }
                          }}
                          className={`h-9 px-4 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            darkMode
                              ? "border-zinc-800 text-red-400 bg-zinc-950 hover:bg-zinc-800"
                              : "border-slate-200 text-red-500 bg-white hover:bg-red-50"
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

        {/* ── MODAL ── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div
              className={`w-full max-w-xl border rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto transition-colors duration-300 ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-800"
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffcf0f] rounded-t-3xl" />

              <h3 className={`text-lg font-black tracking-tight mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
                {isEditing ? "Modify Enterprise Project Parameters" : "Provision New Enterprise Scheme"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Sector Picker */}
                <div>
                  <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Operational Target Sector</label>
                  <select
                    className={`w-full h-11 border-2 rounded-xl px-3 font-extrabold text-sm outline-none cursor-pointer ${
                      darkMode
                        ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                        : "border-[#505824] bg-amber-50/20 text-[#505824]"
                    }`}
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value as any })}
                  >
                    <option value="IT & Development">💻 IT Architecture, App & Web Platforming</option>
                    <option value="Calling & Support">📞 Inbound / Outbound Customer Call Center</option>
                  </select>
                </div>

                {/* Name + Client */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Project Name", key: "project_name", placeholder: "" },
                    { label: "Client Business Entity", key: "client_name", placeholder: "" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className={`text-xs font-bold uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{label}</label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-950 border-zinc-700 text-white focus:border-indigo-500"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                        }`}
                        value={(formData as any)[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Ledger */}
                <div className={`p-3.5 rounded-2xl border grid grid-cols-2 gap-3 ${darkMode ? "bg-zinc-950/50 border-zinc-700" : "bg-slate-50 border-slate-200/60"}`}>
                  {[
                    { label: "Total Budget (₹)", key: "budget" },
                    { label: "Amount Paid (₹)", key: "amount_paid" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-700"}`}>{label}</label>
                      <input
                        type="number"
                        className={`w-full h-10 border rounded-xl px-3 font-mono font-bold text-sm outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500"
                            : "bg-white border-slate-200 text-slate-800 focus:border-[#505824] shadow-sm"
                        }`}
                        value={(formData as any)[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Kickoff Date", key: "start_date", required: true },
                    { label: "Target Deadline", key: "end_date", required: false },
                  ].map(({ label, key, required }) => (
                    <div key={key}>
                      <label className={`text-xs font-bold uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{label}</label>
                      <input
                        type="date"
                        className={`w-full h-11 border rounded-xl px-3 font-semibold text-xs outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                            : "bg-slate-50 border-slate-200 text-slate-700 focus:border-[#505824]"
                        }`}
                        value={(formData as any)[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        required={required}
                      />
                    </div>
                  ))}
                </div>

                {/* Status Phases */}
                <div>
                  <label className={`text-xs font-bold uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Current Implementation Phase</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["Planning", "In Progress", "Review", "Completed"].map((phase) => (
                      <button
                        key={phase}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: phase as any })}
                        className={`h-10 text-[11px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                          formData.status === phase
                            ? "bg-[#505824] text-white border-[#505824]"
                            : darkMode
                            ? "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sector Conditional */}
                {formData.sector === "IT & Development" ? (
                  <div className={`p-4 rounded-2xl border space-y-2 ${darkMode ? "bg-blue-950/20 border-blue-900/40" : "bg-blue-50/60 border-blue-100"}`}>
                    <span className={`text-xs font-black uppercase block tracking-wider ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
                      Target Digital Platforms
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Website", key: "hasWebsite" },
                        { label: "Play Store", key: "hasPlayStore" },
                        { label: "Apple Store", key: "hasAppleStore" },
                      ].map(({ label, key }) => (
                        <label
                          key={key}
                          className={`flex items-center justify-center gap-1.5 h-10 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                            (formData as any)[key]
                              ? "bg-blue-600 text-white border-blue-600"
                              : darkMode
                              ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                              : "bg-white text-slate-700 border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={(formData as any)[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                            className="hidden"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl border grid grid-cols-2 gap-3 ${darkMode ? "bg-purple-950/20 border-purple-900/40" : "bg-purple-50/60 border-purple-100"}`}>
                    <div>
                      <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-purple-300" : "text-purple-800"}`}>Agent Seats</label>
                      <input
                        type="number"
                        className={`w-full h-11 border rounded-xl px-4 font-bold text-sm outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-700 text-white focus:border-purple-500"
                            : "bg-white border-slate-200 text-slate-800 focus:border-purple-600"
                        }`}
                        value={formData.agent_seats}
                        onChange={(e) => setFormData({ ...formData, agent_seats: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-purple-300" : "text-purple-800"}`}>Shift Model</label>
                      <select
                        className={`w-full h-11 border rounded-xl px-3 font-bold text-sm outline-none cursor-pointer transition-all ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-700 text-zinc-300 focus:border-purple-500"
                            : "bg-white border-slate-200 text-slate-700 focus:border-purple-600"
                        }`}
                        value={formData.shift_type}
                        onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
                      >
                        <option value="Day Shift">Day Shift</option>
                        <option value="Night Shift">Night Shift</option>
                        <option value="24/7 Rotational">24/7 Rotational</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Team Assignment */}
                <div>
                  <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Assemble Team (Select Multiple)
                  </label>
                  <div
                    className={`border rounded-xl p-3 max-h-36 overflow-y-auto grid grid-cols-2 gap-2 ${
                      darkMode ? "bg-zinc-950/50 border-zinc-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {teamMembers.map((member) => {
                      const isChecked = formData.assignedEmployeeIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleToggleEmployee(member.id)}
                          className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-all flex items-center justify-between ${
                            isChecked
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : darkMode
                              ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-bold truncate">{member.name}</p>
                            <p className={`text-[10px] truncate ${isChecked ? "text-emerald-100" : darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              {member.role}
                            </p>
                          </div>
                          {isChecked && <span className="text-[10px] shrink-0 ml-1">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assets & File Upload */}
                <div className={`space-y-3 p-4 border border-dashed rounded-2xl ${darkMode ? "bg-zinc-950/30 border-zinc-700" : "bg-slate-50/50 border-slate-200"}`}>
                  <div>
                    <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-700"}`}>Live Site URL</label>
                    <input
                      type="url"
                      placeholder="https://live-deployment-portal.com"
                      className={`w-full h-10 border rounded-xl px-4 text-xs font-mono font-semibold outline-none transition-all ${
                        darkMode
                          ? "bg-zinc-900 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                          : "bg-white border-slate-200 text-slate-700 focus:border-[#505824] shadow-sm"
                      }`}
                      value={formData.live_site_url}
                      onChange={(e) => setFormData({ ...formData, live_site_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-black uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-700"}`}>
                      SOW / Document Uploads
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="system-file-uploader"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="system-file-uploader"
                      className={`w-full h-11 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs transition-colors ${
                        isUploading
                          ? darkMode
                            ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
                            : "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                          : darkMode
                          ? "bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-400"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-[#505824]"
                      }`}
                    >
                      {isUploading ? <>🔄 Uploading...</> : <>📁 Select File From Local System</>}
                    </label>

                    {formData.document_urls.length > 0 && (
                      <div className={`mt-2 p-2 border border-dashed rounded-xl space-y-1 ${darkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-slate-200"}`}>
                        {formData.document_urls.map((url, idx) => (
                          <div key={idx} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${darkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-50 border-slate-200"}`}>
                            <span className={`truncate max-w-[240px] font-mono text-[11px] ${darkMode ? "text-blue-400" : "text-blue-600"}`}>{url}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(idx)}
                              className="text-rose-500 font-bold hover:underline px-1 text-[11px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={`text-xs font-bold uppercase block mb-1 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Calculated Project Profile Summary
                  </label>
                  <textarea
                    rows={2}
                    className={`w-full border rounded-xl p-3 font-semibold text-xs outline-none leading-relaxed transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-700 text-zinc-300 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-600 focus:border-[#505824]"
                    }`}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                {/* CTAs */}
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
                    className={`h-10 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all ${
                      darkMode
                        ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                        : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                    }`}
                  >
                    Commit System Package
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}