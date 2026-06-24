"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from "@/app/providers/ThemeProvider";

interface EmployeeRecord {
    id: string;
    employee_id?: string;
    name: string;
    email: string;
    role: string;
    has_received_email: boolean;
    sent_emails: string[] | string | null;
    created_at?: string;
}

const TEMPLATE_OPTIONS = [
    { id: 'all_templates', label: 'All Layout Types' },
    { id: 'onboarding', label: 'Onboarding Email' },
    { id: 'commencement', label: 'Commencement Email' },
    { id: 'confirmation', label: 'Confirmation Email' },
    { id: 'offer_letter', label: 'Offer Letter Email' },
    { id: 'bank_details', label: 'Request for Bank Details Email' },
    { id: 'appointment', label: 'Appointment Email' },
    { id: 'policy_document', label: 'Policy Document Email' },
    { id: 'general', label: 'General Mail' }
] as const;

const METADATA_BADGE_MAP: Record<string, { label: string; colorClass: string }> = {
    onboarding: { label: "Onboarding", colorClass: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    commencement: { label: "Commencement", colorClass: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    confirmation: { label: "Confirmation", colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    offer_letter: { label: "Offer Letter", colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    bank_details: { label: "Bank Details", colorClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    appointment: { label: "Appointment", colorClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    policy_document: { label: "Policy Doc", colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    general: { label: "General Mail", colorClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" }
};

export default function CommunicationTrackingDashboard() {
    const { darkMode } = useTheme();
    const [employeeDatabase, setEmployeeDatabase] = useState<EmployeeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterTab, setFilterTab] = useState<'all' | 'sent' | 'pending'>('all');
    const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('all_templates');
    const [activePreviewEmployee, setActivePreviewEmployee] = useState<EmployeeRecord | null>(null);

    async function fetchTrackingData() {
        try {
            setIsLoading(true);
            const resEmployees = await fetch('/api/employees-list'); 
            if (resEmployees.ok) {
                const data = await resEmployees.json();
                setEmployeeDatabase(data || []);
            }
        } catch (err) {
            console.error("Error connecting to data layer pools:", err);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchTrackingData();
    }, []);

    const parseSentEmails = (sentEmailsField: any): string[] => {
        if (!sentEmailsField) return [];
        if (Array.isArray(sentEmailsField)) return sentEmailsField;
        try {
            return JSON.parse(sentEmailsField);
        } catch {
            return [];
        }
    };

    const totalCount = employeeDatabase.length;
    const sentCount = employeeDatabase.filter(e => e.has_received_email).length;
    const pendingCount = totalCount - sentCount;

    const filteredEmployees = employeeDatabase.filter(emp => {
        if (filterTab === 'sent' && !emp.has_received_email) return false;
        if (filterTab === 'pending' && emp.has_received_email) return false;

        if (selectedTemplateFilter !== 'all_templates') {
            const list = parseSentEmails(emp.sent_emails);
            if (!list.includes(selectedTemplateFilter)) return false;
        }
        return true;
    });

    return (
        <div className={`min-h-screen p-4 md:p-10 antialiased transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"}`}>
            <div className="max-w-7xl mx-auto space-y-5 md:space-y-8">
                
                {/* HEADER ACTION BANNER */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 rounded-2xl border transition-colors duration-300 shadow-sm ${
                    darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                }`}>
                    <div>
                        <h1 className={`text-lg md:text-xl font-extrabold tracking-tight transition-colors ${
                            darkMode ? "text-zinc-100" : "text-slate-900"
                        }`}>Communication Delivery Dashboard</h1>
                        <p className={`text-[11px] md:text-xs font-semibold mt-0.5 transition-colors ${
                            darkMode ? "text-zinc-500" : "text-slate-400"
                        }`}>Monitor, track, and audit outbound employee communication logs.</p>
                    </div>
                </div>

                {/* STATS ANALYTICS BANNER - MOBILE ADAPTIVE 1 OR 2 ROWS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
                    <div className={`col-span-2 sm:col-span-1 p-4 md:p-6 rounded-2xl border transition-all ${darkMode ? "bg-zinc-900/40 border-zinc-800/50" : "bg-white border-slate-200/80 shadow-sm"}`}>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Recipients</p>
                        <p className="text-2xl md:text-3xl font-black mt-1 md:mt-2 tracking-tight">{isLoading ? "—" : totalCount}</p>
                    </div>
                    <div className={`p-4 md:p-6 rounded-2xl border transition-all ${darkMode ? "bg-zinc-900/40 border-zinc-800/50" : "bg-white border-slate-200/80 shadow-sm"}`}>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-emerald-500">Successfully Delivered</p>
                        <p className="text-2xl md:text-3xl font-black mt-1 md:mt-2 tracking-tight text-emerald-500">{isLoading ? "—" : sentCount}</p>
                    </div>
                    <div className={`p-4 md:p-6 rounded-2xl border transition-all ${darkMode ? "bg-zinc-900/40 border-zinc-800/50" : "bg-white border-slate-200/80 shadow-sm"}`}>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending Deliveries</p>
                        <p className="text-2xl md:text-3xl font-black mt-1 md:mt-2 tracking-tight text-amber-500">{isLoading ? "—" : pendingCount}</p>
                    </div>
                </div>

                {/* FILTER CONTROL BAR */}
                <div className={`border rounded-2xl shadow-sm overflow-hidden transition-all ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-white border-slate-200"}`}>
                    
                    <div className={`p-3 md:p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${darkMode ? "border-zinc-800/80 bg-zinc-900/20" : "border-slate-100 bg-slate-50/50"}`}>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                            <button
                                onClick={() => setFilterTab('all')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold rounded-xl transition-all ${
                                    filterTab === 'all' 
                                        ? darkMode ? "bg-[#ffcf0f] text-zinc-950 shadow-sm" : "bg-[#505824] text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                All Records
                            </button>
                            <button
                                onClick={() => setFilterTab('sent')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold rounded-xl transition-all ${filterTab === 'sent' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-emerald-500"}`}
                            >
                                Delivered ({sentCount})
                            </button>
                            <button
                                onClick={() => setFilterTab('pending')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold rounded-xl transition-all ${filterTab === 'pending' ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-amber-500"}`}
                            >
                                Pending ({pendingCount})
                            </button>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                            <select
                                value={selectedTemplateFilter}
                                onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                                className={`text-[11px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#c4a174]/40 transition-all cursor-pointer flex-1 md:flex-none ${
                                    darkMode 
                                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-700" 
                                        : "bg-white border-slate-200 text-slate-700 focus:border-slate-300"
                                }`}
                            >
                                {TEMPLATE_OPTIONS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <button 
                                onClick={fetchTrackingData}
                                className={`p-2 rounded-xl border transition-all ${darkMode ? "border-zinc-800 hover:bg-zinc-800 text-zinc-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"}`}
                                title="Refresh Database"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* LIVE LIST GRID MATRIX */}
                    <div className="p-4 md:p-6">
                        {isLoading ? (
                            <div className="py-12 md:py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                                <div className="h-6 w-6 border-2 border-[#505824] dark:border-[#ffcf0f] border-t-transparent rounded-full animate-spin" />
                                <span className="text-[11px] md:text-xs font-semibold tracking-wide">Syncing real-time delivery statuses...</span>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-12 md:py-16 text-center text-[11px] md:text-xs font-medium text-slate-400 italic">
                                No records match the current active template and status filter selections.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                {filteredEmployees.map((emp) => {
                                    const historyArray = parseSentEmails(emp.sent_emails);

                                    return (
                                        <div 
                                            key={emp.id} 
                                            className={`p-4 md:p-5 rounded-xl border flex items-start justify-between gap-3 transition-all duration-200 ${
                                                darkMode 
                                                    ? "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700/80" 
                                                    : "bg-slate-50/50 border-slate-200/70 hover:border-slate-300"
                                            } ${emp.has_received_email ? "cursor-pointer" : ""}`}
                                            onClick={() => emp.has_received_email && setActivePreviewEmployee(emp)}
                                        >
                                            <div className="truncate flex-1 space-y-1.5 md:space-y-2">
                                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
                                                    <span className="font-mono text-[8px] md:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/40">
                                                        {emp.employee_id || "NO ID"}
                                                    </span>
                                                    <p className="font-bold text-xs md:text-sm tracking-tight truncate">{emp.name}</p>
                                                </div>
                                                <p className="text-[11px] md:text-xs font-medium text-slate-400 truncate font-mono">{emp.email}</p>
                                                
                                                <div className="pt-0.5">
                                                    <span className={`text-[8px] md:text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded uppercase ${
                                                        darkMode ? "bg-zinc-900/80 text-zinc-400 border border-zinc-800" : "bg-slate-200/60 text-slate-600"
                                                    }`}>
                                                        {emp.role || "Team Member"}
                                                    </span>
                                                </div>

                                                {/* INLINE EMBEDDED NOTIFICATION PILLS */}
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {historyArray.length === 0 ? (
                                                        <span className="text-[9px] md:text-[10px] text-zinc-500 font-medium italic">No dynamic records</span>
                                                    ) : (
                                                        historyArray.map((tmplType, idx) => {
                                                            const badgeMeta = METADATA_BADGE_MAP[tmplType] || METADATA_BADGE_MAP.general;
                                                            return (
                                                                <span
                                                                    key={`${emp.id}-${tmplType}-${idx}`}
                                                                    className={`text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase shadow-sm ${badgeMeta.colorClass}`}
                                                                >
                                                                    {badgeMeta.label}
                                                                </span>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                                                <span className={`text-[8px] md:text-[9px] font-extrabold tracking-wider px-2 py-0.5 md:py-1 rounded-lg border ${
                                                    emp.has_received_email 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {emp.has_received_email ? "DELIVERED" : "PENDING"}
                                                </span>
                                                {emp.has_received_email && (
                                                    <span className="text-[10px] font-medium text-[#c4a174] hover:underline hidden sm:inline">
                                                        View logs →
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AUDIT TIMELINE PREVIEW MODAL */}
            {activePreviewEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all ${
                        darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}>
                        
                        {/* MODAL HEADER */}
                        <div className={`p-4 md:p-5 border-b flex items-center justify-between gap-2 ${darkMode ? "border-zinc-800/80 bg-zinc-900/40" : "border-slate-100 bg-slate-50/50"}`}>
                            <div className="truncate">
                                <h3 className="text-sm md:text-base font-bold tracking-tight flex flex-wrap items-center gap-1.5 md:gap-2">
                                    <span>Outbound Transmission Audit</span>
                                    <span className="text-[8px] md:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                                        Verified
                                    </span>
                                </h3>
                                <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 truncate">
                                    Reviewing communications dispatched to {activePreviewEmployee.name}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActivePreviewEmployee(null)}
                                className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl border text-[11px] md:text-xs font-semibold transition-all shrink-0 ${
                                    darkMode ? "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white" : "border-slate-200 hover:bg-slate-100 text-slate-500"
                                }`}
                            >
                                Dismiss
                            </button>
                        </div>

                        {/* MODAL BODY CONTROLLER */}
                        <div className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] md:text-xs p-4 rounded-xl bg-slate-100/40 dark:bg-zinc-950/40 border border-slate-200/30 dark:border-zinc-800/40">
                                <div className="truncate">
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Primary Recipient</p>
                                    <p className="font-mono mt-1 font-semibold text-xs md:text-sm truncate">{activePreviewEmployee.email}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Historical Dispatches</p>
                                    <p className="font-bold text-[#c4a174] text-xs md:text-sm mt-1 tracking-tight">
                                        {parseSentEmails(activePreviewEmployee.sent_emails).length} Records Transmitted
                                    </p>
                                </div>
                            </div>

                            {/* DETAILED TIMELINE/LIST LOGS */}
                            <div className="space-y-2">
                                <label className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase text-slate-400 block">Complete Historical Activity Log</label>
                                <div className={`p-3 md:p-4 rounded-xl border space-y-2 ${
                                    darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                    {parseSentEmails(activePreviewEmployee.sent_emails).map((emailKey, index) => {
                                        const badgeData = METADATA_BADGE_MAP[emailKey] || METADATA_BADGE_MAP.general;
                                        return (
                                            <div 
                                                key={`modal-${emailKey}-${index}`} 
                                                className={`text-[11px] md:text-xs font-bold px-3 py-2 rounded-xl border flex items-center justify-between gap-2 tracking-wide uppercase ${badgeData.colorClass}`}
                                            >
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
                                                    <span className="truncate">{badgeData.label} Template Layout</span>
                                                </div>
                                                <span className="text-[8px] md:text-[9px] font-medium opacity-60 lowercase font-mono shrink-0">delivered successfully</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}