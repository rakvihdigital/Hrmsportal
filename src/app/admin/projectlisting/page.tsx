"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";
import {
    Plus,
    Pencil,
    Trash2,
    Eye,
    ExternalLink,
    Link2,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    X,
} from "lucide-react";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ---- CONSTANTS ----
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

interface ProjectFormData {
    id: string;
    name: string;
    short_description: string;
    site_link: string;
    admin_link: string;
    admin_username: string;
    admin_password: string;
    links: ProjectLink[];
    project_types: string[];
}

const emptyForm: ProjectFormData = {
    id: "",
    name: "",
    short_description: "",
    site_link: "",
    admin_link: "",
    admin_username: "",
    admin_password: "",
    links: [],
    project_types: [],
};

const emptyLinkDraft: ProjectLink = {
    id: "",
    title: "",
    url: "",
    username: "",
    password: "",
};

const makeId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ProjectsPage() {
    const { darkMode } = useTheme();

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<ProjectFormData>(emptyForm);

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
    const [adminCredsOpen, setAdminCredsOpen] = useState(false);

    // --- LINK POPUP STATE (add/edit a single link on top of the project modal) ---
    const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false);
    const [linkDraft, setLinkDraft] = useState<ProjectLink>(emptyLinkDraft);
    const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);

    // --- FILTERING STATE ---
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

    useEffect(() => {
        fetchProjects();
    }, []);

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

    // ---- FORM HELPERS ----
    const toggleProjectType = (type: string) => {
        setFormData((prev) => {
            const has = prev.project_types.includes(type);
            return {
                ...prev,
                project_types: has
                    ? prev.project_types.filter((t) => t !== type)
                    : [...prev.project_types, type],
            };
        });
    };

    const removeLinkRow = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            links: prev.links.filter((l) => l.id !== id),
        }));
    };

    // ---- LINK POPUP HELPERS ----
    const openAddLinkPopup = () => {
        setLinkDraft({ ...emptyLinkDraft, id: makeId() });
        setEditingLinkIndex(null);
        setIsLinkPopupOpen(true);
    };

    const openEditLinkPopup = (link: ProjectLink, index: number) => {
        setLinkDraft({ ...link });
        setEditingLinkIndex(index);
        setIsLinkPopupOpen(true);
    };

    const closeLinkPopup = () => {
        setIsLinkPopupOpen(false);
        setLinkDraft(emptyLinkDraft);
        setEditingLinkIndex(null);
    };

    const updateLinkDraft = (field: keyof ProjectLink, value: string) => {
        setLinkDraft((prev) => ({ ...prev, [field]: value }));
    };

    const saveLinkDraft = () => {
        // ignore completely empty drafts
        if (!linkDraft.title.trim() && !linkDraft.url.trim()) {
            closeLinkPopup();
            return;
        }
        setFormData((prev) => {
            const links = [...prev.links];
            if (editingLinkIndex !== null) {
                links[editingLinkIndex] = linkDraft;
            } else {
                links.push(linkDraft);
            }
            return { ...prev, links };
        });
        closeLinkPopup();
    };

    const openCreateModal = () => {
        setFormData(emptyForm);
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEditModal = (project: Project) => {
        setFormData({
            id: project.id,
            name: project.name,
            short_description: project.short_description || "",
            site_link: project.site_link || "",
            admin_link: project.admin_link || "",
            admin_username: project.admin_username || "",
            admin_password: project.admin_password || "",
            links: project.links || [],
            project_types: project.project_types || [],
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // ---- SUBMIT / DELETE ----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const cleanLinks = formData.links
            .filter((l) => l.title.trim() || l.url.trim())
            .map((l) => ({
                id: l.id,
                title: l.title.trim(),
                url: l.url.trim(),
                username: l.username?.trim() || "",
                password: l.password?.trim() || "",
            }));

        const payload = {
            name: formData.name.trim(),
            short_description: formData.short_description.trim(),
            site_link: formData.site_link.trim(),
            admin_link: formData.admin_link.trim(),
            admin_username: formData.admin_username.trim(),
            admin_password: formData.admin_password.trim(),
            links: cleanLinks,
            project_types: formData.project_types,
        };

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from("projects")
                    .update(payload)
                    .eq("id", formData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("projects").insert([payload]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchProjects();
        } catch (err: any) {
            console.error("Error saving project:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                hint: err?.hint,
            });
            alert(`Save Failed: ${err?.message || "Check network/database configuration."}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this project?")) return;
        try {
            const { error } = await supabase.from("projects").delete().eq("id", id);
            if (error) throw error;
            fetchProjects();
        } catch (err) {
            console.error("Error deleting project:", err);
        }
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

    // Small inline "copy" button that sits inside an input (absolute positioned).
    // Pass the current field value + a unique keyId so the check-mark state is independent per field.
    const CopyMiniButton = ({ text, keyId }: { text: string; keyId: string }) => (
        <button
            type="button"
            onClick={() => copyGeneric(text, keyId)}
            disabled={!text}
            title={text ? "Copy" : "Nothing to copy"}
            className={`absolute inset-y-0 right-1.5 flex items-center px-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700"
                }`}
        >
            {copiedId === keyId ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
        </button>
    );

    return (
        <div
            className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
                }`}
        >
            <div className="max-w-7xl mx-auto space-y-6">
                {/* TOP HEADER BAR */}
                <div
                    className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${cardBg}`}
                >
                    <div>
                        <h1
                            className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"
                                }`}
                        >
                            Projects
                        </h1>
                        <p className={`text-xs font-medium mt-0.5 ${labelBase}`}>
                            Track every project's links, access panels, and category in one place.
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
                        <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search project name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full h-10 px-4 text-xs font-bold rounded-xl border outline-none transition-all ${inputBase}`}
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

                        {/* ADD PROJECT (header CTA) */}
                        <button
                            onClick={openCreateModal}
                            className={`h-10 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${darkMode
                                    ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                                    : "bg-[#505824] hover:bg-[#3e441c] text-white"
                                }`}
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            Add Project
                        </button>
                    </div>
                </div>

                {/* TABLE / CARD WRAPPER */}
                <div
                    className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${cardBg}`}
                >
                    {isLoading ? (
                        <div
                            className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${labelBase}`}
                        >
                            Loading projects...
                        </div>
                    ) : (
                        <>
                            {/* DESKTOP TABLE */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                                    <thead>
                                        <tr
                                            className={`font-bold uppercase text-[10px] border-b h-12 ${darkMode
                                                    ? "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                                                    : "bg-slate-50 text-slate-400 border-slate-100"
                                                }`}
                                        >
                                            <th className="px-6">Project</th>
                                            <th className="px-6">Type</th>
                                            <th className="px-6">Quick Access</th>
                                            <th className="px-6 text-center">Links</th>
                                            <th className="px-6 text-right pr-8">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        className={`divide-y font-medium ${darkMode
                                                ? "divide-zinc-800 text-zinc-300"
                                                : "divide-slate-100 text-slate-700"
                                            }`}
                                    >
                                        {filteredProjects.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className={`text-center p-12 italic ${labelBase}`}
                                                >
                                                    No projects found for the selected criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredProjects.map((project) => (
                                                <tr
                                                    key={project.id}
                                                    className={`h-16 transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"
                                                        }`}
                                                >
                                                    <td className="px-6 max-w-xs">
                                                        <div
                                                            className={`font-black whitespace-normal ${darkMode ? "text-white" : "text-slate-900"
                                                                }`}
                                                        >
                                                            {project.name}
                                                        </div>
                                                        <div
                                                            className={`text-[10px] font-semibold mt-0.5 whitespace-normal line-clamp-1 ${labelBase}`}
                                                        >
                                                            {project.short_description || "No description"}
                                                        </div>
                                                    </td>
                                                    <td className="px-6">
                                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                            {project.project_types?.length ? (
                                                                project.project_types.map((t) => typeBadge(t))
                                                            ) : (
                                                                <span className={`text-[10px] ${labelBase}`}>—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6">
                                                        <div className="flex items-center gap-2">
                                                            {project.site_link ? (
                                                                <a
                                                                    href={project.site_link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`h-8 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${darkMode
                                                                            ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                                                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                                                        }`}
                                                                >
                                                                    <ExternalLink className="w-3 h-3" /> Site
                                                                </a>
                                                            ) : null}
                                                            {project.admin_link ? (
                                                                <a
                                                                    href={project.admin_link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`h-8 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${darkMode
                                                                            ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                                                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                                                        }`}
                                                                >
                                                                    <ExternalLink className="w-3 h-3" /> Admin
                                                                </a>
                                                            ) : null}
                                                            {!project.site_link && !project.admin_link && (
                                                                <span className={`text-[10px] ${labelBase}`}>—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProject(project);
                                                                setExpandedLinkId(null);
                                                                setAdminCredsOpen(false);
                                                                setIsViewModalOpen(true);
                                                            }}
                                                            className={`h-8 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${darkMode
                                                                    ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                                                    : "bg-slate-50 hover:bg-[#ffcf0f] hover:text-[#505824] border-slate-200 text-slate-700"
                                                                }`}
                                                        >
                                                            <Link2 className="w-3 h-3" />
                                                            {project.links?.length || 0} Link
                                                            {project.links?.length === 1 ? "" : "s"}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 pr-8 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedProject(project);
                                                                    setExpandedLinkId(null);
                                                                    setAdminCredsOpen(false);
                                                                    setIsViewModalOpen(true);
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode
                                                                        ? "text-zinc-500 hover:text-blue-400 hover:bg-zinc-950"
                                                                        : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                                    }`}
                                                                title="Inspect Project"
                                                            >
                                                                <Eye className="w-4 h-4" strokeWidth={2.25} />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(project)}
                                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode
                                                                        ? "text-zinc-500 hover:text-amber-400 hover:bg-zinc-950"
                                                                        : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                                    }`}
                                                                title="Edit Project"
                                                            >
                                                                <Pencil className="w-4 h-4" strokeWidth={2.25} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(project.id)}
                                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${darkMode
                                                                        ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-950"
                                                                        : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                    }`}
                                                                title="Delete Project"
                                                            >
                                                                <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE CARDS */}
                            <div className={`block sm:hidden divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
                                {filteredProjects.length === 0 ? (
                                    <div className={`text-center p-8 italic text-xs ${labelBase}`}>
                                        No projects found for the selected criteria.
                                    </div>
                                ) : (
                                    filteredProjects.map((project) => (
                                        <div key={project.id} className="p-4 space-y-3 text-xs">
                                            <div>
                                                <span
                                                    className={`font-black block text-sm ${darkMode ? "text-white" : "text-slate-900"
                                                        }`}
                                                >
                                                    {project.name}
                                                </span>
                                                <span className={`text-[10px] font-semibold block mt-0.5 ${labelBase}`}>
                                                    {project.short_description || "No description"}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                {project.project_types?.length
                                                    ? project.project_types.map((t) => typeBadge(t))
                                                    : <span className={`text-[10px] ${labelBase}`}>—</span>}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                {project.site_link && (
                                                    <a
                                                        href={project.site_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`h-8 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${darkMode
                                                                ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                                                                : "bg-slate-50 border-slate-200 text-slate-700"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Site
                                                    </a>
                                                )}
                                                {project.admin_link && (
                                                    <a
                                                        href={project.admin_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`h-8 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${darkMode
                                                                ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                                                                : "bg-slate-50 border-slate-200 text-slate-700"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Admin
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setExpandedLinkId(null);
                                                        setAdminCredsOpen(false);
                                                        setIsViewModalOpen(true);
                                                    }}
                                                    className={`h-8 px-3 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${darkMode
                                                            ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                                                            : "bg-slate-50 border-slate-200 text-slate-700"
                                                        }`}
                                                >
                                                    <Link2 className="w-3 h-3" />
                                                    {project.links?.length || 0} Links
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() => openEditModal(project)}
                                                    className={`flex-1 h-9 border rounded-xl flex items-center justify-center cursor-pointer ${darkMode
                                                            ? "border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-800"
                                                            : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                                                        }`}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(project.id)}
                                                    className={`h-9 px-3 border rounded-xl flex items-center justify-center cursor-pointer ${darkMode
                                                            ? "border-zinc-800 text-red-400 bg-zinc-950 hover:bg-zinc-800"
                                                            : "border-slate-200 text-red-600 bg-white hover:bg-red-50"
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

                {/* ADD / EDIT MODAL */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div
                            className={`w-full max-w-4xl border rounded-3xl p-6 shadow-xl my-8 transition-all duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                                }`}
                        >
                            <h3
                                className={`text-base font-black tracking-tight mb-4 ${darkMode ? "text-white" : "text-slate-900"
                                    }`}
                            >
                                {isEditing ? "Edit Project" : "Add New Project"}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* ROW 1: Project Name & Site Link */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 ${labelBase}`}>
                                            Project Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Rakvih Corporate Website"
                                            className={`w-full h-10 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${inputBase}`}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1 ${labelBase}`}>
                                            Site Link
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://example.com"
                                            className={`w-full h-10 border rounded-xl px-4 font-medium text-sm outline-none transition-all ${inputBase}`}
                                            value={formData.site_link}
                                            onChange={(e) => setFormData({ ...formData, site_link: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* SHORT DESCRIPTION */}
                                <div>
                                    <label className={`text-[10px] font-bold uppercase block mb-1 ${labelBase}`}>
                                        Short Description
                                    </label>
                                    <textarea
                                        placeholder="One or two lines about the project..."
                                        rows={2}
                                        className={`w-full border rounded-xl px-4 py-2 font-medium text-sm outline-none transition-all resize-none ${inputBase}`}
                                        value={formData.short_description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, short_description: e.target.value })
                                        }
                                    />
                                </div>

                                {/* ROW 2: Admin Link + Credentials Side-by-Side (with copy buttons) */}
                                <div
                                    className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-slate-50/70 border-slate-100"
                                        }`}
                                >
                                    <div>
                                        <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                            Admin Link
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://example.com/admin"
                                            className={`w-full h-9 border rounded-lg px-3 text-xs font-medium outline-none ${inputBase}`}
                                            value={formData.admin_link}
                                            onChange={(e) => setFormData({ ...formData, admin_link: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                            Admin Username
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Username (optional)"
                                                className={`w-full h-9 border rounded-lg px-3 pr-8 text-xs font-medium outline-none ${inputBase}`}
                                                value={formData.admin_username}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, admin_username: e.target.value })
                                                }
                                            />
                                            <CopyMiniButton text={formData.admin_username} keyId="draft-admin-username" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                            Admin Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Password (optional)"
                                                className={`w-full h-9 border rounded-lg px-3 pr-8 text-xs font-medium outline-none ${inputBase}`}
                                                value={formData.admin_password}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, admin_password: e.target.value })
                                                }
                                            />
                                            <CopyMiniButton text={formData.admin_password} keyId="draft-admin-password" />
                                        </div>
                                    </div>
                                </div>

                                {/* PROJECT TYPE CHECKBOXES */}
                                <div>
                                    <label className={`text-[10px] font-bold uppercase block mb-2 ${labelBase}`}>
                                        Project Type
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {PROJECT_TYPE_OPTIONS.map((type) => {
                                            const checked = formData.project_types.includes(type);
                                            return (
                                                <label
                                                    key={type}
                                                    className={`flex items-center gap-2 h-9 px-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${checked
                                                            ? darkMode
                                                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-300"
                                                                : "bg-[#ffcf0f]/20 border-[#505824] text-[#505824]"
                                                            : darkMode
                                                                ? "bg-zinc-950 border-zinc-800 text-zinc-400"
                                                                : "bg-slate-50 border-slate-200 text-slate-600"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="accent-[#505824] w-3.5 h-3.5 cursor-pointer"
                                                        checked={checked}
                                                        onChange={() => toggleProjectType(type)}
                                                    />
                                                    <span className="truncate">{type}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* MULTIPLE LINKS — compact list + popup editor.
                                    Instead of the form growing taller every time you add a link,
                                    "Add Link" opens a small popup on top; saved links show as a
                                    short scrollable list here. */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={`text-[10px] font-bold uppercase ${labelBase}`}>
                                            Additional Links
                                        </label>
                                        <button
                                            type="button"
                                            onClick={openAddLinkPopup}
                                            className={`h-7 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${darkMode
                                                    ? "bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                                                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                }`}
                                        >
                                            <Plus className="w-3 h-3" /> Add Link
                                        </button>
                                    </div>

                                    {formData.links.length === 0 ? (
                                        <p className={`text-[10px] font-medium ${labelBase}`}>
                                            No extra links yet — e.g. staging panel, hosting dashboard, repo.
                                        </p>
                                    ) : (
                                        <div
                                            className={`rounded-xl border divide-y overflow-hidden max-h-56 overflow-y-auto ${darkMode ? "border-zinc-800 divide-zinc-800" : "border-slate-200 divide-slate-100"
                                                }`}
                                        >
                                            {formData.links.map((link, idx) => {
                                                const rowCopyKey = `draft-link-row-${link.id}`;
                                                return (
                                                    <div
                                                        key={link.id}
                                                        className={`flex items-center justify-between gap-2 px-3 h-12 ${darkMode ? "bg-zinc-950/60" : "bg-slate-50/70"
                                                            }`}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs font-bold truncate">
                                                                {link.title || "Untitled Link"}
                                                            </div>
                                                            <div className={`text-[10px] font-medium truncate ${labelBase}`}>
                                                                {link.url || "—"}
                                                                {(link.username || link.password) && (
                                                                    <span className="ml-1.5 opacity-70">• has credentials</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    copyGeneric(
                                                                        `*${link.title || "Link"}*\n*URL:* ${link.url}${link.username ? `\n*Username:* ${link.username}` : ""
                                                                        }${link.password ? `\n*Password:* ${link.password}` : ""}`,
                                                                        rowCopyKey
                                                                    )
                                                                }
                                                                className={`p-1.5 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-emerald-400" : "text-slate-400 hover:text-emerald-600"
                                                                    }`}
                                                                title="Copy link & credentials"
                                                            >
                                                                {copiedId === rowCopyKey ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditLinkPopup(link, idx)}
                                                                className={`p-1.5 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"
                                                                    }`}
                                                                title="Edit link"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLinkRow(link.id)}
                                                                className={`p-1.5 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-red-400" : "text-slate-400 hover:text-red-600"
                                                                    }`}
                                                                title="Delete link"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* FORM ACTIONS */}
                                <div
                                    className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"
                                        }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className={`h-9 px-4 text-xs font-bold cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                                            }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`h-9 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${darkMode
                                                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                                : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                                            }`}
                                    >
                                        {isSubmitting ? "Saving..." : "Save Project"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ADD / EDIT LINK POPUP — stacked ABOVE the project modal (higher z-index).
                    This is the "popup that covers over the top" for adding a link, so the
                    project modal itself never keeps growing taller as links are added. */}
                {isLinkPopupOpen && (
                    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
                        <div
                            className={`w-full max-w-md border rounded-3xl p-5 shadow-2xl transition-all duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-sm font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                                    {editingLinkIndex !== null ? "Edit Link" : "Add Link"}
                                </h4>
                                <button
                                    type="button"
                                    onClick={closeLinkPopup}
                                    className={`p-1.5 rounded-lg cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                        }`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Hosting Panel"
                                        autoFocus
                                        className={`w-full h-9 border rounded-lg px-3 text-xs font-semibold outline-none ${inputBase}`}
                                        value={linkDraft.title}
                                        onChange={(e) => updateLinkDraft("title", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                        URL
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        className={`w-full h-9 border rounded-lg px-3 text-xs font-semibold outline-none ${inputBase}`}
                                        value={linkDraft.url}
                                        onChange={(e) => updateLinkDraft("url", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                        Username
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Username (optional)"
                                            className={`w-full h-9 border rounded-lg px-3 pr-8 text-xs font-medium outline-none ${inputBase}`}
                                            value={linkDraft.username}
                                            onChange={(e) => updateLinkDraft("username", e.target.value)}
                                        />
                                        <CopyMiniButton text={linkDraft.username || ""} keyId="draft-link-username" />
                                    </div>
                                </div>
                                <div>
                                    <label className={`text-[9px] font-bold uppercase block mb-1 ${labelBase}`}>
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Password (optional)"
                                            className={`w-full h-9 border rounded-lg px-3 pr-8 text-xs font-medium outline-none ${inputBase}`}
                                            value={linkDraft.password}
                                            onChange={(e) => updateLinkDraft("password", e.target.value)}
                                        />
                                        <CopyMiniButton text={linkDraft.password || ""} keyId="draft-link-password" />
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`flex justify-end gap-2 pt-4 mt-2 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={closeLinkPopup}
                                    className={`h-9 px-4 text-xs font-bold cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveLinkDraft}
                                    className={`h-9 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all ${darkMode
                                            ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                            : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                                        }`}
                                >
                                    {editingLinkIndex !== null ? "Update Link" : "Save Link"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW / INSPECT MODAL */}
                {isViewModalOpen && selectedProject && (
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div
                            className={`w-full max-w-lg border rounded-3xl p-6 shadow-xl relative my-8 transition-all duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                                }`}
                        >
                            <h3 className={`text-[10px] font-black uppercase tracking-wider mb-4 ${labelBase}`}>
                                Project Inspection
                            </h3>

                            <div
                                className={`p-4 rounded-2xl border space-y-3 ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-150"
                                    }`}
                            >
                                <div>
                                    <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                        Project Name
                                    </span>
                                    <div className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                                        {selectedProject.name}
                                    </div>
                                </div>

                                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                                    <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                        Description
                                    </span>
                                    <div className="text-xs font-semibold">
                                        {selectedProject.short_description || "—"}
                                    </div>
                                </div>

                                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                                    <span className={`text-[9px] uppercase font-bold block mb-1 ${labelBase}`}>
                                        Type
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedProject.project_types?.length
                                            ? selectedProject.project_types.map((t) => typeBadge(t))
                                            : <span className="text-xs">—</span>}
                                    </div>
                                </div>

                                {selectedProject.site_link && (
                                    <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                                        <a
                                            href={selectedProject.site_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-full h-9 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700"
                                                }`}
                                        >
                                            <ExternalLink className="w-3 h-3" /> Open Site
                                        </a>
                                    </div>
                                )}

                                {/* ADMIN LINK + CREDENTIALS - expand to reveal */}
                                {selectedProject.admin_link && (
                                    <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
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
                                                            href={selectedProject.admin_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-mono font-bold text-indigo-500 hover:underline break-all"
                                                        >
                                                            {selectedProject.admin_link}
                                                        </a>
                                                    </div>
                                                    {(selectedProject.admin_username || selectedProject.admin_password) && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {selectedProject.admin_username && (
                                                                <div>
                                                                    <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                        Username
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-mono font-bold truncate">
                                                                            {selectedProject.admin_username}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                copyGeneric(selectedProject.admin_username || "", "admin-username-view")
                                                                            }
                                                                            className={`shrink-0 p-1 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700"
                                                                                }`}
                                                                            title="Copy username"
                                                                        >
                                                                            {copiedId === "admin-username-view" ? (
                                                                                <Check className="w-3 h-3 text-emerald-500" />
                                                                            ) : (
                                                                                <Copy className="w-3 h-3" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {selectedProject.admin_password && (
                                                                <div>
                                                                    <span className={`text-[9px] uppercase font-bold block ${labelBase}`}>
                                                                        Password
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-mono font-bold text-emerald-500 truncate">
                                                                            {selectedProject.admin_password}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                copyGeneric(selectedProject.admin_password || "", "admin-password-view")
                                                                            }
                                                                            className={`shrink-0 p-1 rounded-md cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-700"
                                                                                }`}
                                                                            title="Copy password"
                                                                        >
                                                                            {copiedId === "admin-password-view" ? (
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
                                                        onClick={() => handleCopyAdminCreds(selectedProject, "admin-creds")}
                                                        className={`w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${copiedId === "admin-creds"
                                                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                                                : darkMode
                                                                    ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                                                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                                            }`}
                                                    >
                                                        {copiedId === "admin-creds" ? (
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

                                {/* ADDITIONAL LINKS - click to expand credentials */}
                                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                                    <span className={`text-[9px] uppercase font-bold block mb-1.5 ${labelBase}`}>
                                        Additional Links
                                    </span>
                                    {!selectedProject.links || selectedProject.links.length === 0 ? (
                                        <p className="text-xs">No additional links.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedProject.links.map((link) => {
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

                            <div className="mt-5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleCopyProjectPackage(selectedProject, "project-package")}
                                    className={`flex-1 h-11 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${copiedId === "project-package"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : darkMode
                                                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                                                : "bg-[#505824] text-white hover:bg-[#3e441c]"
                                        }`}
                                >
                                    {copiedId === "project-package" ? (
                                        <>
                                            <Check className="w-4 h-4" /> Package Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" /> Copy Full Package
                                        </>
                                    )}
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