"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CompanyProject {
  id: string;
  project_name: string;
  client_name: string | null;
  sector: string;
  status: string;
  budget: number;
  amount_paid: number;
  balance_amount: number;
  start_date: string;
  end_date: string | null;
  description: string | null;
  live_site_url: string | null;
  document_urls: string[];
  meta_details: Record<string, any>;
  created_at: string;
}

export default function EmployeeProjectsPage() {
  const { darkMode } = useTheme();
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState("All");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

const fetchProjects = async () => {
  try {
    setLoading(true);

    const empId = localStorage.getItem("user_id")?.replace(/['"]+/g, "");
    if (!empId) return;

    // 1. Get project IDs assigned to this employee
    const { data: assignments, error: assignError } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("employee_id", empId);

    if (assignError) throw assignError;
    if (!assignments || assignments.length === 0) {
      setProjects([]);
      return;
    }

    const projectIds = assignments.map((a) => a.project_id);

    // 2. Fetch only those projects
    const { data, error } = await supabase
      .from("company_projects")
      .select("*")
      .in("id", projectIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data) setProjects(data as CompanyProject[]);
  } catch (err: any) {
    console.error("Error fetching assigned projects:", err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProjects();
  }, []);

  const uniqueSectors = ["All", ...Array.from(new Set(projects.map((p) => p.sector)))];

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client_name && project.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSector = filterSector === "All" || project.sector === filterSector;

    return matchesSearch && matchesSector;
  });

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return darkMode 
          ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/30" 
          : "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "in progress":
        return darkMode 
          ? "bg-blue-950/30 text-blue-400 border-blue-900/30" 
          : "bg-blue-50 text-blue-700 border-blue-100";
      case "on hold":
        return darkMode 
          ? "bg-rose-950/30 text-rose-400 border-rose-900/30" 
          : "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return darkMode 
          ? "bg-amber-950/30 text-amber-400 border-amber-900/30" 
          : "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  return (
    <main className={`p-4 md:p-6 lg:p-10 min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* Page Layout Header */}
      <div className={`border-b pb-5 mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
        darkMode ? "border-zinc-800" : "border-slate-200"
      }`}>
        <div>
          <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
            Company Master Registry
          </h1>
          <p className={`text-xs md:text-sm mt-1 font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
            Browse operational projects, balance metrics, and client deliverables.
          </p>
        </div>
      </div>

      {/* Control Panels Layer (Search & Dropdowns) */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by project title or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-10 md:h-11 pl-10 pr-4 border rounded-xl text-sm font-medium outline-none transition-colors shadow-sm ${
              darkMode 
                ? "bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-700 placeholder-zinc-500" 
                : "bg-white border-slate-200 text-slate-800 focus:border-slate-400 placeholder-slate-400"
            }`}
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 absolute left-3.5 top-3.5 ${
            darkMode ? "text-zinc-500" : "text-slate-400"
          }`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.603 10.602Z" />
          </svg>
        </div>

        <div className="w-full sm:w-56">
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className={`w-full h-10 md:h-11 px-3 border rounded-xl text-sm font-bold outline-none transition-colors shadow-sm ${
              darkMode 
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-700" 
                : "bg-white border-slate-200 text-slate-700 focus:border-slate-400"
            }`}
          >
            {uniqueSectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector === "All" ? "⚡ All Sectors" : sector}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Project Tracker Ledger Section */}
      {loading ? (
        <div className={`h-64 flex flex-col items-center justify-center gap-2 text-sm bg-border rounded-3xl shadow-sm ${
          darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-400"
        }`}>
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Syncing live system layers...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className={`border border-dashed bg-border rounded-3xl h-64 flex items-center justify-center text-sm font-medium ${
          darkMode ? "border-zinc-700 bg-zinc-900 text-zinc-400" : "border-slate-200 bg-white text-slate-400"
        }`}>
          No active client properties matched your filters.
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            return (
              <div 
                key={project.id} 
                className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
                  darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200/80"
                }`}
              >
                {/* Visible Card Summary Header Block */}
                <div 
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  className="p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-opacity-50 transition-colors select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base md:text-base font-black tracking-tight ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {project.project_name}
                      </h3>
                      <span className={`px-2 py-0.5 border text-[10px] font-black uppercase tracking-wider rounded-md ${getStatusStyles(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className={`text-xs font-semibold flex flex-wrap gap-x-3 gap-y-1 ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                      <span>Client: <strong className={darkMode ? "text-zinc-300" : "text-slate-700"}>{project.client_name || "Internal Portfolio"}</strong></span>
                      <span>Sector: <strong className={darkMode ? "text-zinc-300" : "text-slate-700"}>{project.sector}</strong></span>
                    </div>
                  </div>

                  {/* High-Level Date Metrics */}
              <div className={`grid grid-cols-2 gap-4 sm:gap-6 text-left lg:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 ${
                darkMode ? "border-zinc-700" : "border-slate-100"
              }`}>
                    <div>
                      <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Start Date</span>
                      <span className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-800"}`}>{project.start_date}</span>
                    </div>
                    <div>
                      <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>End Date</span>
                      <span className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-800"}`}>{project.end_date || "Continuous"}</span>
                    </div>
                  </div>

                  {/* Accordion Pivot Toggle Arrow */}
                  <div className="hidden lg:block text-current pl-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${
                      darkMode ? "text-zinc-500" : "text-slate-300"
                    } ${isExpanded ? "rotate-180" : ""}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Hidden Extended Details Block (Accordion Panel) */}
                {isExpanded && (
                  <div className={`border-t p-4 md:p-6 space-y-4 md:space-y-6 ${
                    darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50/50 border-slate-100"
                  }`}>
                    
                    {/* Live Environment Deployment Block Anchor */}
                    <div>
                      <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Production URL Vector</h4>
                      {project.live_site_url ? (
                        <a 
                          href={project.live_site_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm font-bold text-blue-500 hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          🚀 Launch Live Interface
                        </a>
                      ) : (
                        <span className={`text-sm font-medium italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>No environment linked</span>
                      )}
                    </div>

                    {/* Array Vector Documentation Attachment Files */}
                    {project.document_urls && project.document_urls.length > 0 && (
                      <div className="space-y-2">
                        <h4 className={`text-xs font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Secure Blueprint Attachments</h4>
                        <div className="flex flex-wrap gap-2">
                          {project.document_urls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-xs font-bold px-3 py-1.5 border rounded-lg shadow-sm inline-flex items-center gap-1.5 transition-colors ${
                                darkMode 
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200" 
                                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              📄 File Asset Record #{index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured JSONB Key-Value Sub-Properties Data Blocks */}
                    {project.meta_details && Object.keys(project.meta_details).length > 0 && (
                      <div className="space-y-2">
                        <h4 className={`text-xs font-extrabold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Contextual Meta Details Dictionary</h4>
                        <div className={`border rounded-xl p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 ${
                          darkMode ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200/60"
                        }`}>
                          {Object.entries(project.meta_details).map(([key, val]) => (
                            <div key={key} className={`text-xs border-b sm:border-b-0 pb-2 sm:pb-0 ${
                              darkMode ? "border-zinc-700" : "border-slate-50"
                            }`}>
                              <span className={`block font-semibold lowercase tracking-tight ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{key}:</span>
                              <span className={`font-bold ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}