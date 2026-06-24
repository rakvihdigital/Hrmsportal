"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider"; // Imported your theme hook

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

interface RoleItem {
  id: string;
  role_name: string;
  role_code: string;
}

export default function RolesPage() {
  const { darkMode } = useTheme(); // Consume your global theme state
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: "", role_name: "", role_code: "" });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("company_roles").select("*").order("role_name", { ascending: true });
    setRoles(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uppercaseCode = formData.role_code.toUpperCase().trim();
    
    if (isEditing) {
      await supabase.from("company_roles").update({ role_name: formData.role_name, role_code: uppercaseCode }).eq("id", formData.id);
    } else {
      await supabase.from("company_roles").insert([{ role_name: formData.role_name, role_code: uppercaseCode }]);
    }
    setIsModalOpen(false);
    fetchRoles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this designation role option?")) return;
    await supabase.from("company_roles").delete().eq("id", id);
    fetchRoles();
  };

  return (
     <div
      className={`min-h-screen antialiased p-4 md:p-8 pt-2 space-y-6 transition-colors duration-300 ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}
    >
    <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-300">
      
      {/* HEADER ACTION BANNER */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors duration-300 shadow-sm ${
        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
      }`}>
        <div>
          <h1 className={`text-xl font-extrabold tracking-tight transition-colors ${
            darkMode ? "text-zinc-100" : "text-slate-900"
          }`}>Designation Role Configurations</h1>
          <p className={`text-xs font-semibold mt-1 transition-colors ${
            darkMode ? "text-zinc-500" : "text-slate-400"
          }`}>Manage standard company positions and system bracket codes.</p>
        </div>
        <button
          onClick={() => { setFormData({ id: "", role_name: "", role_code: "" }); setIsEditing(false); setIsModalOpen(true); }}
          className={`h-11 px-5 font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 ${
            darkMode ? "bg-[#ffcf0f] text-zinc-950 hover:bg-[#e0b60d]" : "bg-[#505824] text-white hover:bg-[#3d431b]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add New Position
        </button>
      </div>

      {/* ROLES SELECTION CONTAINER */}
      <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors duration-300 ${
        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
      }`}>
        {isLoading ? (
          <div className="p-12 text-center font-bold text-slate-400 dark:text-zinc-500 text-sm">Syncing system layers...</div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center font-bold text-slate-400 dark:text-zinc-500 text-sm">No configured company roles available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider h-12 transition-colors duration-300 ${
                  darkMode ? "bg-zinc-950/40 border-zinc-800 text-zinc-500" : "bg-slate-50/70 border-slate-200 text-slate-400"
                }`}>
                  <th className="px-6">Designation Title</th>
                  <th className="px-6">Bracket Code</th>
                  <th className="px-6 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm font-semibold transition-colors duration-300 ${
                darkMode ? "divide-zinc-800/60 text-zinc-300" : "divide-slate-100 text-slate-700"
              }`}>
                {roles.map((role) => (
                  <tr key={role.id} className={`h-16 transition-colors ${
                    darkMode ? "hover:bg-zinc-850/30" : "hover:bg-slate-50/40"
                  }`}>
                    <td className={`px-6 font-bold text-base transition-colors ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}>{role.role_name}</td>
                    <td className="px-6">
                      <span className={`font-mono text-xs px-3 py-1.5 rounded-lg border font-black tracking-wide transition-colors duration-300 ${
                        darkMode 
                          ? "bg-zinc-950/60 border-zinc-800 text-zinc-400" 
                          : "bg-slate-50 border-slate-200/60 text-slate-700"
                      }`}>
                        ({role.role_code})
                      </span>
                    </td>
                    
                    {/* ACTION BUTTONS WITH THEME SWITCHES */}
                    <td className="px-6 text-right pr-8">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* EDIT POSITION */}
                        <button 
                          onClick={() => { setFormData(role); setIsEditing(true); setIsModalOpen(true); }} 
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode ? "text-zinc-500 hover:text-[#ffcf0f] hover:bg-zinc-800" : "text-slate-400 hover:text-[#505824] hover:bg-slate-100"
                          }`}
                          title="Edit Position Schema"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* DELETE POSITION */}
                        <button 
                          onClick={() => handleDelete(role.id)} 
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode ? "text-zinc-500 hover:text-red-400 hover:bg-red-950/30" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title="Remove Configuration"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DYNAMIC DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md border rounded-3xl p-6 shadow-xl relative overflow-hidden transition-colors duration-300 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffcf0f]" />

            <h3 className={`text-lg font-extrabold mb-4 mt-1 transition-colors ${
              darkMode ? "text-white" : "text-slate-900"
            }`}>
              {isEditing ? "Edit Position Configuration" : "Add Layout Position"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-bold uppercase block mb-1 transition-colors ${
                  darkMode ? "text-zinc-500" : "text-slate-500"
                }`}>Role Title Name</label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Development"
                  className={`w-full h-11 border rounded-xl px-4 font-semibold text-sm outline-none transition-all ${
                    darkMode 
                      ? "border-zinc-800 bg-zinc-950 focus:border-[#ffcf0f] focus:bg-zinc-900 text-white" 
                      : "border-slate-200 bg-slate-50 focus:border-[#505824] focus:bg-white text-slate-900"
                  }`}
                  value={formData.role_name}
                  onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className={`text-xs font-bold uppercase block mb-1 transition-colors ${
                  darkMode ? "text-zinc-500" : "text-slate-500"
                }`}>Role Code (System Bracket Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. FSD"
                  maxLength={6}
                  className={`w-full h-11 border rounded-xl px-4 font-mono font-bold text-sm uppercase outline-none transition-all tracking-wider ${
                    darkMode 
                      ? "border-zinc-800 bg-zinc-950 focus:border-[#ffcf0f] focus:bg-zinc-900 text-white" 
                      : "border-slate-200 bg-slate-50 focus:border-[#505824] focus:bg-white text-slate-900"
                  }`}
                  value={formData.role_code}
                  onChange={e => setFormData({ ...formData, role_code: e.target.value })}
                  required
                />
              </div>

              <div className={`flex justify-end gap-3 pt-4 border-t transition-colors ${
                darkMode ? "border-zinc-800" : "border-slate-100"
              }`}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className={`h-10 px-4 font-bold text-xs transition-colors ${
                    darkMode ? "text-zinc-400 hover:text-zinc-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="h-10 px-5 bg-[#ffcf0f] hover:bg-[#e0b60d] text-slate-950 font-black text-xs rounded-xl shadow-sm transition-colors"
                >
                  Save Configuration
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