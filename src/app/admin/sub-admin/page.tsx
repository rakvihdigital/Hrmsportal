"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  department: string;
  auto_pass: string;
  allowed_tabs: string[];
  is_active: boolean;
  created_at: string;
}

// --- This MUST stay in sync with the `path` values used in Sidebar.tsx's menuItems.
// When you add a new tab to the sidebar later, add it here too so it can be granted.
const AVAILABLE_TABS = [
  { path: "/admin/dashboard", label: "Dashboard" },
  { path: "/admin/roles", label: "Role Configurations" },
  { path: "/admin/projects", label: "Project List" },
  { path: "/admin/employees", label: "Employee List" },
  { path: "/admin/emails", label: "Emails" },
  { path: "/admin/emails/tracking", label: "Email Tracking" },
  { path: "/admin/attendance", label: "Attendance Tracking" },
  { path: "/admin/leaves", label: "Leave Approvals" },
  { path: "/admin/holidays", label: "Holidays & Calendar" },
  { path: "/admin/payroll", label: "Payroll & Salary" },
  { path: "/admin/credentials", label: "Employee Access" },
];

export default function SubAdminPage() {
  const { darkMode } = useTheme();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selections & Toggles
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<SubAdmin | null>(null);
  const [revealPassId, setRevealPassId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    allowed_tabs: [] as string[],
  });

  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    department: "",
    allowed_tabs: [] as string[],
  });

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sub_admins")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubAdmins(data || []);
    } catch (err) {
      console.error("Error fetching sub-admins:", err);
    } finally {
      setIsLoading(false);
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

  // Create Toggle Tab
  const toggleTab = (path: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_tabs: prev.allowed_tabs.includes(path)
        ? prev.allowed_tabs.filter((t) => t !== path)
        : [...prev.allowed_tabs, path],
    }));
  };

  // Edit Toggle Tab
  const toggleEditTab = (path: string) => {
    setEditFormData((prev) => ({
      ...prev,
      allowed_tabs: prev.allowed_tabs.includes(path)
        ? prev.allowed_tabs.filter((t) => t !== path)
        : [...prev.allowed_tabs, path],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.allowed_tabs.length === 0) {
      alert("Select at least one tab this sub-admin should have access to.");
      return;
    }

    setIsSubmitting(true);
    try {
      const complexPassword = generateComplexPassword(formData.name);
      const { error } = await supabase.from("sub_admins").insert([
        {
          name: formData.name,
          email: formData.email,
          department: formData.department,
          auto_pass: complexPassword,
          allowed_tabs: formData.allowed_tabs,
        },
      ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: "", email: "", department: "", allowed_tabs: [] });
      fetchSubAdmins();
    } catch (err: any) {
      console.error("Error creating sub-admin:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      });
      if (err?.code === "23505") {
        alert("A sub-admin with that email already exists.");
      } else {
        alert(`Could not create sub-admin: ${err?.message || "Unknown error"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editFormData.allowed_tabs.length === 0) {
      alert("Select at least one tab this sub-admin should have access to.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("sub_admins")
        .update({
          name: editFormData.name,
          department: editFormData.department,
          allowed_tabs: editFormData.allowed_tabs,
        })
        .eq("id", editFormData.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      fetchSubAdmins();
    } catch (err: any) {
      console.error("Error updating sub-admin:", err);
      alert(`Could not update sub-admin: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("sub_admins")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
      fetchSubAdmins();
    } catch (err) {
      console.error("Error toggling sub-admin status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this sub-admin account?")) return;
    try {
      await supabase.from("sub_admins").delete().eq("id", id);
      fetchSubAdmins();
    } catch (err) {
      console.error("Error deleting sub-admin:", err);
    }
  };

  const handleCopyCredentials = (subAdmin: SubAdmin) => {
    const textBlock = `*Sub-Admin Login Credentials*\n*Name:* ${subAdmin.name}\n*Department:* ${subAdmin.department}\n*Email:* ${subAdmin.email}\n*Password:* ${subAdmin.auto_pass}`;
    navigator.clipboard.writeText(textBlock);
    setCopiedId(subAdmin.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = (sa: SubAdmin) => {
    setEditFormData({
      id: sa.id,
      name: sa.name,
      department: sa.department,
      allowed_tabs: sa.allowed_tabs,
    });
    setIsEditModalOpen(true);
  };

  const labelForPath = (path: string) =>
    AVAILABLE_TABS.find((t) => t.path === path)?.label || path;

  return (
    <div
      className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP BAR */}
        <div
          className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          <div>
            <h1 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Sub-Admin Management
            </h1>
            <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
              Create and edit restricted-access accounts with tab-level permissions.
            </p>
          </div>

          <button
            onClick={() => {
              setFormData({ name: "", email: "", department: "", allowed_tabs: [] });
              setIsModalOpen(true);
            }}
            className={`h-10 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              darkMode ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-950" : "bg-[#505824] hover:bg-[#3e441c] text-white"
            }`}
          >
            Create Sub-Admin Account
          </button>
        </div>

        {/* TABLE */}
        <div
          className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          {isLoading ? (
            <div className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Loading sub-admin records...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr
                    className={`font-bold uppercase text-[10px] border-b h-12 ${
                      darkMode ? "bg-zinc-900/50 text-zinc-500 border-zinc-800" : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}
                  >
                    <th className="px-6">Name / Department</th>
                    <th className="px-6">Email</th>
                    <th className="px-6">Tab Access</th>
                    <th className="px-6">Password</th>
                    <th className="px-6 text-center">Status</th>
                    <th className="px-6 text-center">Copy Credentials</th>
                    <th className="px-6 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${darkMode ? "divide-zinc-800 text-zinc-300" : "divide-slate-100 text-slate-700"}`}>
                  {subAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`text-center p-12 italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                        No sub-admin accounts created yet.
                      </td>
                    </tr>
                  ) : (
                    subAdmins.map((sa) => (
                      <tr key={sa.id} className={`transition-colors ${darkMode ? "hover:bg-zinc-800/20" : "hover:bg-slate-50/40"}`}>
                        <td className="px-6 py-4">
                          <div className={`font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{sa.name}</div>
                          <div className={`text-[10px] font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{sa.department}</div>
                        </td>
                        <td className={`px-6 font-mono ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{sa.email}</td>
                        <td className="px-6">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {sa.allowed_tabs.slice(0, 2).map((path) => (
                              <span
                                key={path}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                  darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-600"
                                }`}
                              >
                                {labelForPath(path)}
                              </span>
                            ))}
                            {sa.allowed_tabs.length > 2 && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                +{sa.allowed_tabs.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[11px] px-2.5 py-1.5 rounded-lg border min-w-[105px] text-center ${
                                darkMode ? "bg-zinc-950 text-zinc-100 border-zinc-800" : "bg-slate-50 text-slate-800 border-slate-200"
                              }`}
                            >
                              {revealPassId === sa.id ? sa.auto_pass : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRevealPassId(revealPassId === sa.id ? null : sa.id)}
                              className="cursor-pointer text-sm transition-all text-slate-500 hover:text-indigo-500"
                            >
                              {revealPassId === sa.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 text-center">
                          <button
                            onClick={() => handleToggleActive(sa.id, sa.is_active)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                              sa.is_active
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30"
                            }`}
                          >
                            {sa.is_active ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-6 text-center">
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(sa)}
                            className={`h-8 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              copiedId === sa.id
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30"
                                : darkMode
                                ? "bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                : "bg-slate-50 hover:bg-[#ffcf0f] hover:text-[#505824] border-slate-200 text-slate-700"
                            }`}
                          >
                            {copiedId === sa.id ? "✓ Copied" : "📋 Copy"}
                          </button>
                        </td>
                        <td className="px-6 pr-8 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedSubAdmin(sa);
                                setIsViewModalOpen(true);
                              }}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                darkMode ? "text-zinc-500 hover:text-blue-400 hover:bg-zinc-950" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              }`}
                              title="View Access"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(sa)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                darkMode ? "text-zinc-500 hover:text-indigo-400 hover:bg-zinc-950" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              }`}
                              title="Edit Access"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(sa.id)}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                darkMode ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-950" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                              title="Delete Sub-Admin"
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
          )}
        </div>

        {/* CREATE MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className={`w-full max-w-lg border rounded-3xl p-6 shadow-xl transition-all duration-300 max-h-[90vh] overflow-y-auto ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <h3 className={`text-base font-black tracking-tight mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
                Create Sub-Admin Account
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Nair"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@rakvih.com"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Human Resources, Finance, Operations"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Tab Access — select which pages this sub-admin can view
                  </label>
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${
                      darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {AVAILABLE_TABS.map((tab) => {
                      const checked = formData.allowed_tabs.includes(tab.path);
                      return (
                        <label
                          key={tab.path}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                            checked
                              ? darkMode
                                ? "bg-[#ffcf0f]/10 border-[#ffcf0f]/40 text-white"
                                : "bg-[#505824]/10 border-[#505824]/30 text-slate-900"
                              : darkMode
                              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTab(tab.path)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              checked
                                ? "bg-[#505824] border-[#505824]"
                                : darkMode
                                ? "border-zinc-700"
                                : "border-slate-300"
                            }`}
                          >
                            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {formData.allowed_tabs.length === 0 && (
                    <p className="text-[10px] font-bold text-amber-500 mt-1.5 ml-1">
                      Select at least one tab to continue.
                    </p>
                  )}
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
                    disabled={isSubmitting || formData.allowed_tabs.length === 0}
                    className={`h-10 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      darkMode ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                    }`}
                  >
                    {isSubmitting ? "Creating..." : "Create Sub-Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className={`w-full max-w-lg border rounded-3xl p-6 shadow-xl transition-all duration-300 max-h-[90vh] overflow-y-auto ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <h3 className={`text-base font-black tracking-tight mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
                Edit Sub-Admin
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Department
                  </label>
                  <input
                    type="text"
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Update Tab Access
                  </label>
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl border ${
                      darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {AVAILABLE_TABS.map((tab) => {
                      const checked = editFormData.allowed_tabs.includes(tab.path);
                      return (
                        <label
                          key={tab.path}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                            checked
                              ? darkMode
                                ? "bg-[#ffcf0f]/10 border-[#ffcf0f]/40 text-white"
                                : "bg-[#505824]/10 border-[#505824]/30 text-slate-900"
                              : darkMode
                              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEditTab(tab.path)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              checked
                                ? "bg-[#505824] border-[#505824]"
                                : darkMode
                                ? "border-zinc-700"
                                : "border-slate-300"
                            }`}
                          >
                            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {editFormData.allowed_tabs.length === 0 && (
                    <p className="text-[10px] font-bold text-amber-500 mt-1.5 ml-1">
                      Select at least one tab to continue.
                    </p>
                  )}
                </div>

                <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={`h-10 px-4 text-xs font-bold cursor-pointer ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || editFormData.allowed_tabs.length === 0}
                    className={`h-10 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      darkMode ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                    }`}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW MODAL */}
        {isViewModalOpen && selectedSubAdmin && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className={`w-full max-w-md border rounded-3xl p-6 shadow-xl relative transition-all duration-300 ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <h3 className={`text-[10px] font-black uppercase tracking-wider mb-4 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                Sub-Admin Inspection
              </h3>

              <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-150"}`}>
                <div>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Name / Department</span>
                  <div className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{selectedSubAdmin.name}</div>
                  <div className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>{selectedSubAdmin.department}</div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Email</span>
                  <div className="font-mono text-xs font-bold">{selectedSubAdmin.email}</div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Tab Access</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubAdmin.allowed_tabs.map((path) => (
                      <span
                        key={path}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md border ${
                          darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {labelForPath(path)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`border-t pt-2 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <span className={`text-[9px] uppercase font-bold block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Password</span>
                  <div className="font-mono text-xs text-emerald-500 font-black tracking-wide">{selectedSubAdmin.auto_pass}</div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(selectedSubAdmin)}
                  className={`flex-1 h-11 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    copiedId === selectedSubAdmin.id
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : darkMode
                      ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                      : "bg-[#505824] text-white hover:bg-[#3e441c]"
                  }`}
                >
                  {copiedId === selectedSubAdmin.id ? "✓ Credentials Copied" : "📋 Copy Credentials"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className={`h-11 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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