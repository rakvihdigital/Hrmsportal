"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";
import {
    ExternalLink,
    Link2,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    X,
    Lock,
    Eye,
    EyeOff,
    Building2,
    Search,
} from "lucide-react";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ---- CONSTANTS ----
const COMPANY_NAME = "Rakvih Private Solutions";
const ACCESS_CODE = "Rakvih@2026";
const ACCESS_SESSION_KEY = "rakvih_projects_unlocked";

const PROJECT_TYPE_OPTIONS = [
    "In-house",
    "Clients",
    "3D Website",
    "E-commerce Website",
    "App & iOS",
    "Demo",
];

// ---- TYPES ----
interface ProjectLink {
    id: string;
    title: string;
    url: string;
    username?: string;
    password?: string;
}

interface Project {
    id: string;
    name: string;
    short_description: string;
    site_link: string;
    admin_link: string;
    admin_username?: string;
    admin_password?: string;
    links: ProjectLink[];
    project_types: string[];
    created_at?: string;
}

export default function ProjectsPage() {
    const { darkMode } = useTheme();

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Which project card is expanded, and (within it) which sub-sections are open
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
    const [adminCredsOpen, setAdminCredsOpen] = useState(false);

    // --- FILTERING STATE ---
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

    // --- ACCESS CODE / LOCK SCREEN STATE ---
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [accessError, setAccessError] = useState("");
    const [showAccessCode, setShowAccessCode] = useState(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "true") {
                setIsUnlocked(true);
            }
        } catch {
            // sessionStorage unavailable — just fall back to prompting
        }
    }, []);

    useEffect(() => {
        if (isUnlocked) {
            fetchProjects();
        }
    }, [isUnlocked]);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (accessCode === ACCESS_CODE) {
            setIsUnlocked(true);
            setAccessError("");
            try {
                sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
            } catch {
                // ignore storage errors
            }
        } else {
            setAccessError("Incorrect access code. Please try again.");
            setAccessCode("");
        }
    };

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setProjects(data || []);
        } catch (err) {
            console.error("Error fetching projects:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // ---- EXPAND / COLLAPSE ----
    const toggleProjectExpand = (id: string) => {
        setExpandedProjectId((prev) => (prev === id ? null : id));
        setExpandedLinkId(null);
        setAdminCredsOpen(false);
    };

    // ---- COPY HELPERS ----
    const copyGeneric = (text: string, keyId: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(keyId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyLink = (link: ProjectLink, keyId: string) => {
        let textBlock = `*${link.title || "Link"}*\n*URL:* ${link.url}`;
        if (link.username) textBlock += `\n*Username:* ${link.username}`;
        if (link.password) textBlock += `\n*Password:* ${link.password}`;
        navigator.clipboard.writeText(textBlock);
        setCopiedId(keyId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAdminCreds = (project: Project, keyId: string) => {
        let textBlock = `*Admin Login*\n*URL:* ${project.admin_link}`;
        if (project.admin_username) textBlock += `\n*Username:* ${project.admin_username}`;
        if (project.admin_password) textBlock += `\n*Password:* ${project.admin_password}`;
        navigator.clipboard.writeText(textBlock);
        setCopiedId(keyId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyProjectPackage = (project: Project, keyId: string) => {
        let textBlock = `*Project:* ${project.name}\n*Description:* ${project.short_description || "—"}`;
        if (project.site_link) textBlock += `\n*Site:* ${project.site_link}`;
        if (project.admin_link) {
            textBlock += `\n*Admin:* ${project.admin_link}`;
            if (project.admin_username) textBlock += `\n*Admin Username:* ${project.admin_username}`;
            if (project.admin_password) textBlock += `\n*Admin Password:* ${project.admin_password}`;
        }
        if (project.links?.length) {
            textBlock += `\n\n*Additional Links:*`;
            project.links.forEach((l) => {
                textBlock += `\n- ${l.title || "Link"}: ${l.url}`;
                if (l.username) textBlock += ` | user: ${l.username}`;
                if (l.password) textBlock += ` | pass: ${l.password}`;
            });
        }
        navigator.clipboard.writeText(textBlock);
        setCopiedId(keyId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // ---- FILTERING ----
    const filteredProjects = projects.filter((p) => {
        if (selectedTypeFilter !== "all" && !p.project_types?.includes(selectedTypeFilter)) {
            return false;
        }
        if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase().trim();
            const nameMatch = p.name.toLowerCase().includes(q);
            const descMatch = (p.short_description || "").toLowerCase().includes(q);
            if (!nameMatch && !descMatch) return false;
        }
        return true;
    });

    // ---- SHARED STYLE HELPERS ----
    const cardBg = darkMode
        ? "bg-zinc-900 border-zinc-800"
        : "bg-white border-slate-200";
    const inputBase = darkMode
        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]";
    const labelBase = darkMode ? "text-zinc-500" : "text-slate-400";

    const typeBadge = (type: string) => (
        <span
            key={type}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${darkMode
                ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
        >
            {type}
        </span>
    );

    // ---- LOCK SCREEN (shown until the correct access code is entered) ----
    if (!isUnlocked) {
        return (
            <div
                className={`min-h-screen antialiased flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
                    }`}
            >
                <div
                    className={`w-full max-w-sm border rounded-3xl p-7 shadow-xl transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                        }`}
                >
                    <div className="flex flex-col items-center text-center mb-6">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-slate-50 border border-slate-200"
                                }`}
                        >
                            <Building2
                                className={darkMode ? "w-6 h-6 text-zinc-300" : "w-6 h-6 text-[#505824]"}
                                strokeWidth={2.25}
                            />
                        </div>
                        <h1 className={`text-base font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                            {COMPANY_NAME}
                        </h1>
                        <p className={`text-xs font-medium mt-1 ${labelBase}`}>
                            Enter the access code to open Projects.
                        </p>
                    </div>

                    <form onSubmit={handleUnlock} className="space-y-3">
                        <div>
                            <label className={`text-[10px] font-bold uppercase block mb-1 ${labelBase}`}>
                                Access Code
                            </label>
                            <div className="relative">
                                <Lock className={`absolute inset-y-0 left-3 my-auto w-4 h-4 ${labelBase}`} />
                                <input
                                    type={showAccessCode ? "text" : "password"}
                                    autoFocus
                                    placeholder="Enter access code"
                                    value={accessCode}
                                    onChange={(e) => {
                                        setAccessCode(e.target.value);
                                        if (accessError) setAccessError("");
                                    }}
                                    className={`w-full h-11 border rounded-xl pl-9 pr-10 font-semibold text-sm outline-none transition-all ${inputBase}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAccessCode((v) => !v)}
                                    className={`absolute inset-y-0 right-3 my-auto flex items-center cursor-pointer ${labelBase}`}
                                    title={showAccessCode ? "Hide code" : "Show code"}
                                >
                                    {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {accessError && (
                                <p className="text-[11px] font-bold text-red-500 mt-1.5">{accessError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={`w-full h-11 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all ${darkMode
                                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                : "bg-[#505824] hover:bg-[#3e441c] text-white"
                                }`}
                        >
                            Unlock
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
                }`}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {/* HEADER */}
                <div
                    className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${cardBg}`}
                >
                    <div>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-[#505824]"
                                }`}
                        >
                            {COMPANY_NAME}
                        </span>
                        <h1
                            className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"
                                }`}
                        >
                            Projects
                        </h1>
                        <p className={`text-xs font-medium mt-0.5 ${labelBase}`}>
                            Browse every project's links, access panels, and category.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        {/* TYPE FILTER */}
                        <div className="relative min-w-[180px] flex-1 sm:flex-initial">
                            <select
                                value={selectedTypeFilter}
                                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                                className={`w-full h-10 px-3 pr-8 text-xs font-bold rounded-xl border appearance-none outline-none cursor-pointer transition-all ${inputBase}`}
                            >
                                <option value="all">All Project Types</option>
                                {PROJECT_TYPE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                                <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </div>
                        </div>

                        {/* SEARCH */}
                        <div className="relative flex-1 sm:flex-initial min-w-[220px]">
                            <Search className={`absolute inset-y-0 left-3 my-auto w-3.5 h-3.5 pointer-events-none ${labelBase}`} />
                            <input
                                type="text"
                                placeholder="Search project name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full h-10 pl-9 pr-8 text-xs font-bold rounded-xl border outline-none transition-all ${inputBase}`}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-3 flex items-center"
                                >
                                    <X className={`w-4 h-4 ${labelBase}`} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RESULTS COUNT */}
                {!isLoading && (
                    <div className={`px-1 text-[10px] font-bold uppercase tracking-wider ${labelBase}`}>
                        {filteredProjects.length} project{filteredProjects.length === 1 ? "" : "s"}
                    </div>
                )}

                {/* LIST */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div
                            className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide rounded-2xl sm:rounded-3xl border ${cardBg} ${labelBase}`}
                        >
                            Loading projects...
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div
                            className={`p-12 text-center text-xs italic rounded-2xl sm:rounded-3xl border ${cardBg} ${labelBase}`}
                        >
                            No projects found for the selected criteria.
                        </div>
                    ) : (
                        filteredProjects.map((project) => {
                            const isExpanded = expandedProjectId === project.id;
                            return (
                                <div
                                    key={project.id}
                                    className={`rounded-2xl sm:rounded-3xl border overflow-hidden shadow-xs transition-colors duration-300 ${cardBg}`}
                                >
                                    {/* CLICKABLE PROJECT NAME ROW — opens the details downward */}
                                    <button
                                        type="button"
                                        onClick={() => toggleProjectExpand(project.id)}
                                        className={`w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 cursor-pointer transition-colors ${darkMode ? "hover:bg-zinc-800/30" : "hover:bg-slate-50/60"
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={`font-black text-sm truncate ${darkMode ? "text-white" : "text-slate-900"
                                                        }`}
                                                >
                                                    {project.name}
                                                </span>
                                                {project.links?.length ? (
                                                    <span
                                                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${darkMode
                                                            ? "bg-zinc-950 border-zinc-800 text-zinc-400"
                                                            : "bg-slate-100 border-slate-200 text-slate-500"
                                                            }`}
                                                    >
                                                        <Link2 className="w-2.5 h-2.5" />
                                                        {project.links.length}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className={`text-[11px] font-semibold mt-0.5 truncate ${labelBase}`}>
                                                {project.short_description || "No description"}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {project.project_types?.length
                                                    ? project.project_types.map((t) => typeBadge(t))
                                                    : null}
                                            </div>
                                        </div>
                                        <div
                                            className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-transform ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
                                                }`}
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                                            )}
                                        </div>
                                    </button>

                                    {/* EXPANDED DETAILS — opens downward under the name */}
                                    {isExpanded && (
                                        <div
                                            className={`px-5 sm:px-6 pb-6 pt-1 space-y-4 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"
                                                }`}
                                        >
                                            {/* QUICK LINKS */}
                                            <div className="flex flex-wrap items-center gap-2 pt-4">
                                                {project.site_link && (
                                                    <a
                                                        href={project.site_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`h-9 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${darkMode
                                                            ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Open Site
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyProjectPackage(project, `pkg-${project.id}`)}
                                                    className={`h-9 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${copiedId === `pkg-${project.id}`
                                                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
                                                        : darkMode
                                                            ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                                        }`}
                                                >
                                                    {copiedId === `pkg-${project.id}` ? (
                                                        <>
                                                            <Check className="w-3 h-3" /> Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" /> Copy Full Package
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* ADMIN ACCESS */}
                                            {project.admin_link && (
                                                <div>
                                                    <span className={`text-[9px] uppercase font-bold block mb-1.5 ${labelBase}`}>
                                                        Admin Access
                                                    </span>
                                                    <div
                                                        className={`rounded-xl border overflow-hidden ${darkMode ? "border-zinc-800" : "border-slate-200"
                                                            }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setAdminCredsOpen(!adminCredsOpen)}
                                                            className={`w-full flex items-center justify-between px-3 h-10 text-left cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-900" : "bg-white hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            <span className="text-xs font-bold truncate pr-2 flex items-center gap-1.5">
                                                                <ExternalLink className="w-3 h-3" /> Admin Panel
                                                            </span>
                                                            {adminCredsOpen ? (
                                                                <ChevronUp className={`w-3.5 h-3.5 shrink-0 ${labelBase}`} />
                                                            ) : (
                                                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${labelBase}`} />
                                                            )}
                                                        </button>
                                                        {adminCredsOpen && (
                                                            <div
                                                                className={`p-3 space-y-2 border-t ${darkMode ? "border-zinc-800 bg-zinc-950/60" : "border-slate-100 bg-slate-50/70"
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                        URL
                                                                    </span>
                                                                    <a
                                                                        href={project.admin_link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs font-mono font-bold text-indigo-500 hover:underline break-all"
                                                                    >
                                                                        {project.admin_link}
                                                                    </a>
                                                                </div>
                                                                {(project.admin_username || project.admin_password) && (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {project.admin_username && (
                                                                            <div>
                                                                                <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                                    Username
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-xs font-mono font-bold truncate">
                                                                                        {project.admin_username}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            copyGeneric(
                                                                                                project.admin_username || "",
                                                                                                `admin-user-${project.id}`
                                                                                            )
                                                                                        }
                                                                                        className={`shrink-0 p-1 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700"
                                                                                            }`}
                                                                                        title="Copy username"
                                                                                    >
                                                                                        {copiedId === `admin-user-${project.id}` ? (
                                                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                                                        ) : (
                                                                                            <Copy className="w-3 h-3" />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {project.admin_password && (
                                                                            <div>
                                                                                <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                                    Password
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-xs font-mono font-bold text-emerald-500 truncate">
                                                                                        {project.admin_password}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            copyGeneric(
                                                                                                project.admin_password || "",
                                                                                                `admin-pass-${project.id}`
                                                                                            )
                                                                                        }
                                                                                        className={`shrink-0 p-1 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700"
                                                                                            }`}
                                                                                        title="Copy password"
                                                                                    >
                                                                                        {copiedId === `admin-pass-${project.id}` ? (
                                                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                                                        ) : (
                                                                                            <Copy className="w-3 h-3" />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyAdminCreds(project, `admin-creds-${project.id}`)}
                                                                    className={`w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${copiedId === `admin-creds-${project.id}`
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                                                        : darkMode
                                                                            ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                                                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                                                        }`}
                                                                >
                                                                    {copiedId === `admin-creds-${project.id}` ? (
                                                                        <>
                                                                            <Check className="w-3 h-3" /> Copied
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy className="w-3 h-3" /> Copy Admin Login
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ADDITIONAL LINKS */}
                                            <div>
                                                <span className={`text-[9px] uppercase font-bold block mb-1.5 ${labelBase}`}>
                                                    Additional Links
                                                </span>
                                                {!project.links || project.links.length === 0 ? (
                                                    <p className="text-xs">No additional links.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {project.links.map((link) => {
                                                            const isOpen = expandedLinkId === link.id;
                                                            const hasCreds = link.username || link.password;
                                                            return (
                                                                <div
                                                                    key={link.id}
                                                                    className={`rounded-xl border overflow-hidden ${darkMode ? "border-zinc-800" : "border-slate-200"
                                                                        }`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedLinkId(isOpen ? null : link.id)}
                                                                        className={`w-full flex items-center justify-between px-3 h-10 text-left cursor-pointer ${darkMode ? "bg-zinc-950 hover:bg-zinc-900" : "bg-white hover:bg-slate-50"
                                                                            }`}
                                                                    >
                                                                        <span className="text-xs font-bold truncate pr-2">
                                                                            {link.title || "Untitled Link"}
                                                                        </span>
                                                                        {isOpen ? (
                                                                            <ChevronUp className={`w-3.5 h-3.5 shrink-0 ${labelBase}`} />
                                                                        ) : (
                                                                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${labelBase}`} />
                                                                        )}
                                                                    </button>
                                                                    {isOpen && (
                                                                        <div
                                                                            className={`p-3 space-y-2 border-t ${darkMode ? "border-zinc-800 bg-zinc-950/60" : "border-slate-100 bg-slate-50/70"
                                                                                }`}
                                                                        >
                                                                            <div>
                                                                                <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                                    URL
                                                                                </span>
                                                                                <a
                                                                                    href={link.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-xs font-mono font-bold text-indigo-500 hover:underline break-all"
                                                                                >
                                                                                    {link.url}
                                                                                </a>
                                                                            </div>
                                                                            {hasCreds && (
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {link.username && (
                                                                                        <div>
                                                                                            <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                                                Username
                                                                                            </span>
                                                                                            <span className="text-xs font-mono font-bold">
                                                                                                {link.username}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {link.password && (
                                                                                        <div>
                                                                                            <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                                                Password
                                                                                            </span>
                                                                                            <span className="text-xs font-mono font-bold text-emerald-500">
                                                                                                {link.password}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCopyLink(link, link.id)}
                                                                                className={`w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${copiedId === link.id
                                                                                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                                                                    : darkMode
                                                                                        ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                                                                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                                                                    }`}
                                                                            >
                                                                                {copiedId === link.id ? (
                                                                                    <>
                                                                                        <Check className="w-3 h-3" /> Copied
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Copy className="w-3 h-3" /> Copy Link{hasCreds ? " & Credentials" : ""}
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}