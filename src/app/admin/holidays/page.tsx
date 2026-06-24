"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface HolidayItem {
  id: string;
  title: string;
  holiday_date: string;
  category: "Public" | "Restricted" | "Company Off" | string;
  description?: string;
  created_at?: string;
}

export default function HolidaysManagementPage() {
  const { darkMode } = useTheme();

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    holiday_date: "",
    category: "Public",
    description: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    holiday_date: "",
    category: "Public",
    description: "",
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("company_holidays")
        .select("*")
        .order("holiday_date", { ascending: true });
      if (error) throw error;
      setHolidays(data || []);
    } catch (err: any) {
      console.error("Error retrieving holidays matrix:", err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.holiday_date)
      return alert("Please complete required parameters.");
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("company_holidays").insert([
        {
          title: formData.title.trim(),
          holiday_date: formData.holiday_date,
          category: formData.category,
          description: formData.description.trim() || null,
        },
      ]);
      if (error) throw error;
      setFormData({ title: "", holiday_date: "", category: "Public", description: "" });
      setIsModalOpen(false);
      await fetchHolidays();
    } catch (err: any) {
      console.error("Detailed Database Failure Context:", err);
      alert(`Database tracking failure: ${err.message || "Check RLS Permissions"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (item: HolidayItem) => {
    setEditingId(item.id);
    setEditFormData({
      title: item.title,
      holiday_date: item.holiday_date,
      category: item.category,
      description: item.description || "",
    });
  };

  const handleUpdateHoliday = async (id: string) => {
    if (!editFormData.title || !editFormData.holiday_date)
      return alert("Title and date parameters are required.");
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("company_holidays")
        .update({
          title: editFormData.title.trim(),
          holiday_date: editFormData.holiday_date,
          category: editFormData.category,
          description: editFormData.description.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
      setEditingId(null);
      await fetchHolidays();
    } catch (err: any) {
      console.error("Failed executing calendar cell overwrite:", err.message);
      alert(`Could not update structural entry: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Are you sure you want to remove this calendar holiday item?")) return;
    try {
      const { error } = await supabase.from("company_holidays").delete().eq("id", id);
      if (error) throw error;
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      console.error("Failed executing calendar wipe:", err.message || err);
      alert(`Could not remove row item: ${err.message}`);
    }
  };

  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case "Public":
        return darkMode
          ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
          : "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "Company Off":
        return darkMode
          ? "bg-amber-950/40 text-amber-400 border-amber-900/60"
          : "bg-amber-50 text-amber-700 border-amber-200/60";
      default:
        return darkMode
          ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
          : "bg-blue-50 text-blue-700 border-blue-200/60";
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  const filteredHolidays = holidays.filter((item) => {
    if (activeFilter === "All") return true;
    return item.category === activeFilter;
  });

  return (
    <div
      className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER PANEL ── */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${
            darkMode
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <h1
              className={`text-lg sm:text-xl font-black tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Corporate Calendar &amp; Holidays
            </h1>
            <p
              className={`text-xs font-medium mt-0.5 ${
                darkMode ? "text-zinc-400" : "text-slate-400"
              }`}
            >
              Manage paid holidays, observation dates, and calendar closures.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className={`h-10 px-5 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                darkMode
                  ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                  : "bg-[#505824] hover:bg-[#3e441c] text-white"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Holiday
            </button>
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div
          className={`flex border-b gap-1 text-sm font-bold overflow-x-auto ${
            darkMode ? "border-zinc-800" : "border-slate-200"
          }`}
        >
          {["All", "Public", "Restricted", "Company Off"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveFilter(tab);
                setEditingId(null);
              }}
              className={`pb-3 px-4 relative transition-colors shrink-0 cursor-pointer ${
                activeFilter === tab
                  ? darkMode
                    ? "text-white"
                    : "text-slate-900"
                  : darkMode
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "All" ? "All Holidays" : tab}
              {activeFilter === tab && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full ${
                    darkMode ? "bg-zinc-100" : "bg-[#ffcf0f]"
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── TABLE WRAPPER ── */}
        <div
          className={`border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs transition-colors duration-300 ${
            darkMode
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-slate-200"
          }`}
        >
          {isLoading ? (
            <div
              className={`p-12 text-center text-xs font-bold animate-pulse tracking-wide ${
                darkMode ? "text-zinc-500" : "text-slate-400"
              }`}
            >
              Syncing Corporate Calendar Timelines...
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr
                      className={`font-bold uppercase text-[10px] border-b h-12 ${
                        darkMode
                          ? "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}
                    >
                      <th className="px-6">Holiday Event Name</th>
                      <th className="px-6">Scheduled Date</th>
                      <th className="px-6">Category</th>
                      <th className="px-6">Notes</th>
                      <th className="px-6 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y font-medium ${
                      darkMode
                        ? "divide-zinc-800 text-zinc-300"
                        : "divide-slate-100 text-slate-700"
                    }`}
                  >
                    {filteredHolidays.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={`p-12 text-center italic text-xs ${
                            darkMode ? "text-zinc-500" : "text-slate-400"
                          }`}
                        >
                          No matching records under &quot;{activeFilter}&quot; category.
                        </td>
                      </tr>
                    ) : (
                      filteredHolidays.map((item) => {
                        const isInlineEditing = editingId === item.id;
                        return (
                          <tr
                            key={item.id}
                            className={`h-16 transition-colors ${
                              isInlineEditing
                                ? darkMode
                                  ? "bg-amber-950/10"
                                  : "bg-amber-50/20"
                                : darkMode
                                ? "hover:bg-zinc-800/20"
                                : "hover:bg-slate-50/40"
                            }`}
                          >
                            {/* Title */}
                            <td className={`px-6 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                              {isInlineEditing ? (
                                <input
                                  type="text"
                                  name="title"
                                  value={editFormData.title}
                                  onChange={handleEditInputChange}
                                  className={`w-full h-9 px-2 text-sm font-semibold border rounded-lg outline-none transition-all ${
                                    darkMode
                                      ? "bg-zinc-950 border-zinc-700 text-white focus:border-indigo-500"
                                      : "bg-white border-slate-200 text-slate-800 focus:border-slate-400"
                                  }`}
                                />
                              ) : (
                                item.title
                              )}
                            </td>

                            {/* Date */}
                            <td className={`px-6 font-mono text-[11px] ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                              {isInlineEditing ? (
                                <input
                                  type="date"
                                  name="holiday_date"
                                  value={editFormData.holiday_date}
                                  onChange={handleEditInputChange}
                                  className={`w-full h-9 px-2 text-xs font-mono border rounded-lg outline-none ${
                                    darkMode
                                      ? "bg-zinc-950 border-zinc-700 text-zinc-300"
                                      : "bg-white border-slate-200 text-slate-700"
                                  }`}
                                />
                              ) : (
                                formatDate(item.holiday_date)
                              )}
                            </td>

                            {/* Category */}
                            <td className="px-6">
                              {isInlineEditing ? (
                                <select
                                  name="category"
                                  value={editFormData.category}
                                  onChange={handleEditInputChange}
                                  className={`w-full h-9 px-2 text-xs font-bold border rounded-lg outline-none cursor-pointer ${
                                    darkMode
                                      ? "bg-zinc-950 border-zinc-700 text-zinc-300"
                                      : "bg-white border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <option value="Public">Public</option>
                                  <option value="Restricted">Restricted</option>
                                  <option value="Company Off">Company Off</option>
                                </select>
                              ) : (
                                <span
                                  className={`text-[11px] px-2.5 py-1 rounded-md border font-bold ${getCategoryBadgeStyles(item.category)}`}
                                >
                                  {item.category}
                                </span>
                              )}
                            </td>

                            {/* Description */}
                            <td className={`px-6 text-[11px] ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                              {isInlineEditing ? (
                                <input
                                  type="text"
                                  name="description"
                                  value={editFormData.description}
                                  onChange={handleEditInputChange}
                                  placeholder="Notes..."
                                  className={`w-full h-9 px-2 text-xs font-semibold border rounded-lg outline-none ${
                                    darkMode
                                      ? "bg-zinc-950 border-zinc-700 text-zinc-300"
                                      : "bg-white border-slate-200 text-slate-800"
                                  }`}
                                />
                              ) : (
                                item.description || "—"
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 pr-8 text-right">
                              {isInlineEditing ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleUpdateHoliday(item.id)}
                                    disabled={isSubmitting}
                                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className={`h-8 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                      darkMode
                                        ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => startEditing(item)}
                                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                      darkMode
                                        ? "text-zinc-500 hover:text-amber-400 hover:bg-zinc-950"
                                        : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    }`}
                                    title="Edit entry"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteHoliday(item.id)}
                                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                      darkMode
                                        ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-950"
                                        : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    }`}
                                    title="Delete record"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD VIEW ── */}
              <div
                className={`block sm:hidden divide-y ${
                  darkMode ? "divide-zinc-800" : "divide-slate-100"
                }`}
              >
                {filteredHolidays.length === 0 ? (
                  <div
                    className={`text-center p-8 italic text-xs ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    No records under &quot;{activeFilter}&quot; category.
                  </div>
                ) : (
                  filteredHolidays.map((item) => {
                    const isInlineEditing = editingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 space-y-3 text-xs transition-colors ${
                          isInlineEditing
                            ? darkMode
                              ? "bg-amber-950/10"
                              : "bg-amber-50/30"
                            : ""
                        }`}
                      >
                        {/* Name + Category */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {isInlineEditing ? (
                              <input
                                type="text"
                                name="title"
                                value={editFormData.title}
                                onChange={handleEditInputChange}
                                className={`w-full h-9 px-2 text-sm font-semibold border rounded-lg outline-none ${
                                  darkMode
                                    ? "bg-zinc-950 border-zinc-700 text-white"
                                    : "bg-white border-slate-200 text-slate-800"
                                }`}
                              />
                            ) : (
                              <span
                                className={`font-black block text-sm truncate ${
                                  darkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {item.title}
                              </span>
                            )}
                          </div>
                          {isInlineEditing ? (
                            <select
                              name="category"
                              value={editFormData.category}
                              onChange={handleEditInputChange}
                              className={`shrink-0 h-8 px-2 text-[10px] font-bold border rounded-lg outline-none cursor-pointer ${
                                darkMode
                                  ? "bg-zinc-950 border-zinc-700 text-zinc-300"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <option value="Public">Public</option>
                              <option value="Restricted">Restricted</option>
                              <option value="Company Off">Company Off</option>
                            </select>
                          ) : (
                            <span
                              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border font-bold ${getCategoryBadgeStyles(item.category)}`}
                            >
                              {item.category}
                            </span>
                          )}
                        </div>

                        {/* Date + Notes */}
                        <div
                          className={`p-3 rounded-xl space-y-2 border ${
                            darkMode
                              ? "bg-zinc-950/40 border-zinc-800/60"
                              : "bg-slate-50/70 border-slate-100"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-[9px] uppercase font-bold ${
                                darkMode ? "text-zinc-500" : "text-slate-400"
                              }`}
                            >
                              Scheduled Date
                            </span>
                            {isInlineEditing ? (
                              <input
                                type="date"
                                name="holiday_date"
                                value={editFormData.holiday_date}
                                onChange={handleEditInputChange}
                                className={`w-full h-9 px-2 text-xs font-mono border rounded-lg outline-none ${
                                  darkMode
                                    ? "bg-zinc-900 border-zinc-700 text-zinc-300"
                                    : "bg-white border-slate-200 text-slate-700"
                                }`}
                              />
                            ) : (
                              <span
                                className={`font-mono font-bold ${
                                  darkMode ? "text-zinc-300" : "text-slate-700"
                                }`}
                              >
                                {formatDate(item.holiday_date)}
                              </span>
                            )}
                          </div>

                          <div
                            className={`flex flex-col gap-1 pt-1.5 border-t ${
                              darkMode ? "border-zinc-800/60" : "border-slate-100"
                            }`}
                          >
                            <span
                              className={`text-[9px] uppercase font-bold ${
                                darkMode ? "text-zinc-500" : "text-slate-400"
                              }`}
                            >
                              Notes
                            </span>
                            {isInlineEditing ? (
                              <input
                                type="text"
                                name="description"
                                value={editFormData.description}
                                onChange={handleEditInputChange}
                                placeholder="Notes..."
                                className={`w-full h-9 px-2 text-xs font-semibold border rounded-lg outline-none ${
                                  darkMode
                                    ? "bg-zinc-900 border-zinc-700 text-zinc-300"
                                    : "bg-white border-slate-200 text-slate-800"
                                }`}
                              />
                            ) : (
                              <span
                                className={`font-medium ${
                                  darkMode ? "text-zinc-400" : "text-slate-500"
                                }`}
                              >
                                {item.description || "—"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {isInlineEditing ? (
                            <>
                              <button
                                onClick={() => handleUpdateHoliday(item.id)}
                                disabled={isSubmitting}
                                className="flex-1 h-9 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className={`h-9 px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                  darkMode
                                    ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(item)}
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
                                onClick={() => handleDeleteHoliday(item.id)}
                                className={`h-9 px-4 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                  darkMode
                                    ? "border-zinc-800 text-red-400 bg-zinc-950 hover:bg-zinc-800"
                                    : "border-slate-200 text-red-500 bg-white hover:bg-red-50"
                                }`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── CREATE MODAL ── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className={`w-full max-w-md border rounded-3xl p-6 shadow-xl transition-all duration-300 ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 mb-4 ${
                  darkMode ? "border-zinc-800" : "border-slate-100"
                }`}
              >
                <h3
                  className={`text-base font-black tracking-tight ${
                    darkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Register Calendar Closure
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`text-sm font-bold cursor-pointer ${
                    darkMode
                      ? "text-zinc-500 hover:text-white"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateHoliday} className="space-y-4">
                <div>
                  <label
                    className={`text-[10px] font-bold uppercase block mb-1 ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Independence Day"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[10px] font-bold uppercase block mb-1 ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    Observation Date *
                  </label>
                  <input
                    type="date"
                    name="holiday_date"
                    required
                    value={formData.holiday_date}
                    onChange={handleInputChange}
                    className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all font-mono ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 focus:border-[#505824]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[10px] font-bold uppercase block mb-1 ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    Classification Group
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full h-11 border rounded-xl px-4 font-bold text-sm outline-none cursor-pointer transition-all ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 focus:border-[#505824]"
                    }`}
                  >
                    <option value="Public">Mandatory Public Holiday</option>
                    <option value="Restricted">Restricted Leave Option</option>
                    <option value="Company Off">Custom Company Day Off</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`text-[10px] font-bold uppercase block mb-1 ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    Description Notes (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Briefly add context or internal policy notes here..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`w-full p-3 border rounded-xl text-sm font-medium outline-none transition-all resize-none ${
                      darkMode
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#505824]"
                    }`}
                  />
                </div>

                <div
                  className={`flex justify-end gap-3 pt-4 border-t ${
                    darkMode ? "border-zinc-800" : "border-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className={`h-10 px-4 text-xs font-bold cursor-pointer disabled:opacity-50 ${
                      darkMode
                        ? "text-zinc-400 hover:text-white"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`h-10 px-5 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 ${
                      darkMode
                        ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                        : "bg-[#ffcf0f] text-[#505824] hover:bg-[#ebd052]"
                    }`}
                  >
                    {isSubmitting ? "Writing to Database..." : "Commit Holiday Entry"}
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