"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from "@/app/providers/ThemeProvider";

interface TemplateContent {
    subject: string;
    body: string;
    name: string;
    email: string;
    role: string;
    date: string;
    stipend: string;
    duration: string;
}

interface EmployeeRecord {
    id: string;
    name: string;
    email: string;
    role: string;
    has_received_email: boolean;
    sent_email_type: string | null;
}

const TEMPLATE_TYPES = [
    { id: 'onboarding', label: 'Onboarding Email' },
    { id: 'commencement', label: 'Commencement Email' },
    { id: 'confirmation', label: 'Confirmation Email' },
    { id: 'offer_letter', label: 'Offer Letter Email' },
    { id: 'bank_details', label: 'Request for Bank Details Email' },
    { id: 'appointment', label: 'Appointment Email' },
    { id: 'policy_document', label: 'Policy Document Email' },
] as const;

type TemplateId = (typeof TEMPLATE_TYPES)[number]['id'];

const blankInitialState = TEMPLATE_TYPES.reduce((acc, curr) => {
    acc[curr.id] = { name: "", email: "", role: "", date: "", stipend: "", duration: "", subject: "", body: "" };
    return acc;
}, {} as Record<TemplateId, TemplateContent>);

export default function EmailTemplateManager() {
    const { darkMode } = useTheme();

    const [selectedType, setSelectedType] = useState<TemplateId>('onboarding');
    const [isEditing, setIsEditing] = useState(false);
    const [backupText, setBackupText] = useState("");
    const [backupSubject, setBackupSubject] = useState("");
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const [templates, setTemplates] = useState<Record<TemplateId, TemplateContent>>(blankInitialState);
    const [employeeDatabase, setEmployeeDatabase] = useState<EmployeeRecord[]>([]);

    // Custom High-Quality Popup Notification Engine State
    const [statusNotification, setStatusNotification] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    // Context Controller States
    const [inputName, setInputName] = useState("");
    const [inputEmail, setInputEmail] = useState("");
    const [inputRole, setInputRole] = useState("");
    const [inputDate, setInputDate] = useState("");
    const [inputStipend, setInputStipend] = useState("");
    const [inputDuration, setInputDuration] = useState("");

    // Policy Document Attachment States
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Unified Real-time Email Delivery Audit Trail State
    const [deliveryLogs, setDeliveryLogs] = useState<Array<{
        id: string;
        timestamp: string;
        templateLabel: string;
        recipient: string;
        status: 'SUCCESS' | 'FAILED';
    }>>([]);

    async function fetchDatabaseState() {
        try {
            const resTemplates = await fetch('/api/email-templates');
            if (resTemplates.ok) {
                const dbData = await resTemplates.json();
                if (Array.isArray(dbData)) {
                    setTemplates(prev => {
                        const updated = { ...prev };
                        dbData.forEach((row: { type: TemplateId; subject: string; body: string }) => {
                            if (updated[row.type]) {
                                updated[row.type] = {
                                    ...updated[row.type],
                                    subject: row.subject || "",
                                    body: row.body || ""
                                };
                            }
                        });
                        return updated;
                    });
                }
            }

            const resEmployees = await fetch('/api/employees-list');
            if (resEmployees.ok) {
                const data = await resEmployees.json();
                setEmployeeDatabase(data);
            }
        } catch (err) {
            console.error("Pipeline fetching error:", err);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchDatabaseState();
    }, []);

    useEffect(() => {
        const active = templates[selectedType];
        if (!active) return;
        // Only override fields if an explicit employee hasn't been mapped yet
        setInputName(prev => prev || active.name || "");
        setInputEmail(prev => prev || active.email || "");
        setInputRole(prev => prev || active.role || "");
        setInputDate(prev => prev || active.date || "");
        setInputStipend(prev => prev || active.stipend || "");
        setInputDuration(prev => prev || active.duration || "");
    }, [selectedType]);

    const selectEmployeeFromRegistry = (emp: EmployeeRecord) => {
        setInputName(emp.name);
        setInputEmail(emp.email);
        setInputRole(emp.role || "");
    };

    const handleFieldChange = (field: 'subject' | 'body', value: string) => {
        setTemplates(prev => ({
            ...prev,
            [selectedType]: { ...prev[selectedType], [field]: value }
        }));
    };

    const applyVariablesToCurrentTemplate = () => {
        setTemplates(prev => {
            const target = prev[selectedType];
            let currentBody = target.body;

            if (inputName) currentBody = currentBody.replace(/{name}/g, inputName);
            if (inputRole) currentBody = currentBody.replace(/{role}/g, inputRole);
            if (inputDate) currentBody = currentBody.replace(/{date}/g, inputDate);
            if (inputStipend) currentBody = currentBody.replace(/{stipend}/g, inputStipend);
            if (inputDuration) currentBody = currentBody.replace(/{duration}/g, inputDuration);

            return {
                ...prev,
                [selectedType]: {
                    ...target,
                    name: inputName,
                    email: inputEmail,
                    role: inputRole,
                    date: inputDate,
                    stipend: inputStipend,
                    duration: inputDuration,
                    body: currentBody
                }
            };
        });
    };

    const startEditing = () => {
        setBackupText(templates[selectedType].body);
        setBackupSubject(templates[selectedType].subject);
        setIsEditing(true);
    };

    const cancelInlineChanges = () => {
        setTemplates(prev => ({
            ...prev,
            [selectedType]: {
                ...prev[selectedType],
                body: backupText,
                subject: backupSubject
            }
        }));
        setIsEditing(false);
    };

    const handleCopy = async () => {
        const combinedPayload = `Subject: ${templates[selectedType].subject}\n\n${templates[selectedType].body}`;
        try {
            await navigator.clipboard.writeText(combinedPayload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const executeDatabaseSave = async (targetType: TemplateId, subjectValue: string, bodyValue: string) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/email-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: targetType,
                    subject: subjectValue,
                    body: bodyValue
                }),
            });

            if (!response.ok) throw new Error("Database network update rejected");
            setIsEditing(false);

            setStatusNotification({
                show: true,
                title: "Blueprint Saved Successfully",
                message: `${TEMPLATE_TYPES.find(t => t.id === targetType)?.label} design matrix locked down and securely backed up to your system pools.`,
                type: 'success'
            });
        } catch (err) {
            console.error(err);
            setStatusNotification({
                show: true,
                title: "Database Sync Defect",
                message: "Pipeline synchronization failure occurred while attempting to save template changes.",
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const triggerOutboundEmailDispatch = async () => {
        if (!inputEmail) {
            setStatusNotification({
                show: true,
                title: "Missing Parameter Alert",
                message: "Please enter a valid target Candidate Email address before executing network transmissions.",
                type: 'error'
            });
            return;
        }

        setIsSending(true);
        const currentActiveTemplate = templates[selectedType];
        const templateFriendlyLabel = TEMPLATE_TYPES.find(t => t.id === selectedType)?.label || "Document Packet";

        try {
            const formData = new FormData();
            formData.append("to", inputEmail);
            formData.append("recipientName", inputName || "Candidate");
            formData.append("subject", currentActiveTemplate.subject);
            formData.append("body", currentActiveTemplate.body);
            formData.append("templateType", selectedType);
            formData.append("assignedRole", inputRole || "Web Developer");

            if (selectedType === 'policy_document' && attachedFile) {
                formData.append("attachment", attachedFile);
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                body: formData,
            });

            const timestampString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (!response.ok) throw new Error("Mailing engine server handshake rejected authorization parameters");

            setDeliveryLogs(prev => [
                { id: Math.random().toString(), timestamp: timestampString, templateLabel: templateFriendlyLabel, recipient: inputEmail, status: 'SUCCESS' },
                ...prev
            ]);

            setStatusNotification({
                show: true,
                title: "Email Sent Successfully!",
                message: `The communication packet has been successfully sent out. A trackable status update log record has been recorded directly into the employee matrix table list.`,
                type: 'success'
            });

            fetchDatabaseState();
        } catch (err) {
            console.error(err);
            const timestampString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setDeliveryLogs(prev => [
                { id: Math.random().toString(), timestamp: timestampString, templateLabel: templateFriendlyLabel, recipient: inputEmail, status: 'FAILED' },
                ...prev
            ]);

            setStatusNotification({
                show: true,
                title: "SMTP Transmission Error",
                message: "A critical transmission handshake failure occurred. Please make sure your EMAIL_APP_PASSWORD details are correctly loaded into your secure environment configs.",
                type: 'error'
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleFileDropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };

    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all duration-200 shadow-sm ${darkMode
        ? "bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-[#505824] focus:ring-1 focus:ring-[#505824]"
        : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#505824] focus:ring-1 focus:ring-[#505824]"
        }`;

    return (
        <div className={`min-h-screen antialiased p-4 md:p-8 pt-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"}`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* MODULAR COMPONENT HEADER */}
                <div className={`w-full p-6 rounded-2xl border shadow-xl backdrop-blur-xl transition-all ${darkMode ? "bg-[#2b2652]/10 border-zinc-800/80 shadow-black/20" : "bg-white/80 border-slate-200/60 shadow-slate-200/50"}`}>
                    <div>
                        <h1 className={`text-2xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                            System Email Template Control Center
                        </h1>
                        <p className={`text-sm mt-1 font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                            Dynamic employee communication network powered directly from your credentials registry database.
                        </p>
                    </div>
                </div>

                {/* WORKSPACE GRID */}
                <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* SIDEBAR CONTEXT FIELD ROUTER PANEL (LEFT COLUMN) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className={`p-6 border rounded-2xl shadow-md space-y-5 transition-all ${darkMode ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-slate-200/60"}`}>
                            <div>
                                <h2 className={`text-base font-extrabold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                                    Adaptive Context Controls
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {/* DYNAMIC ACTIVE TEMPLATE FILTER DROPDOWN SELECTOR ARRAY */}
                                <div
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold shadow-sm select-none ${darkMode
                                        ? "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                                        : "bg-slate-100 border-slate-200 text-slate-500"
                                        }`}
                                >
                                    {TEMPLATE_TYPES.find((tmpl) => tmpl.id === selectedType)?.label || "Selected Template"}
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                        Candidate Name / Target Recipient
                                    </label>
                                    <input
                                        type="text"
                                        value={inputName}
                                        onChange={(e) => setInputName(e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. name"
                                    />
                                </div>

                                {/* CRITICAL DISPATCH EMAIL ADDRESS INTERFACE TARGET */}
                                <div>
                                    <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                        Candidate Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={inputEmail}
                                        onChange={(e) => setInputEmail(e.target.value)}
                                        className={inputClass}
                                        placeholder="name@gmail.com"
                                    />
                                </div>

                                {/* 1. ONBOARDING CONTROLS */}
                                {selectedType === 'onboarding' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                            Designated Work Role
                                        </label>
                                        <input
                                            type="text"
                                            value={inputRole}
                                            onChange={(e) => setInputRole(e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Web Developer"
                                        />
                                    </div>
                                )}

                                {/* 2. COMMENCEMENT CONTROLS */}
                                {selectedType === 'commencement' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Commencement Date
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDate}
                                                onChange={(e) => setInputDate(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. 22 April 2026"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Monthly Stipend
                                            </label>
                                            <input
                                                type="text"
                                                value={inputStipend}
                                                onChange={(e) => setInputStipend(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. ₹8,000"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Duration Timeline
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDuration}
                                                onChange={(e) => setInputDuration(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. two months"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 3. CONFIRMATION CONTROLS */}
                                {selectedType === 'confirmation' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Employment Type / Status
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDuration}
                                                onChange={(e) => setInputDuration(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. Full-Time Employment"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Assigned Engineering Role
                                            </label>
                                            <input
                                                type="text"
                                                value={inputRole}
                                                onChange={(e) => setInputRole(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. full-stack web Developer"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. OFFER LETTER CONTROLS */}
                                {selectedType === 'offer_letter' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Job Position Role
                                            </label>
                                            <input
                                                type="text"
                                                value={inputRole}
                                                onChange={(e) => setInputRole(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. Full Stack Web Developer"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Department Name
                                            </label>
                                            <input
                                                type="text"
                                                value={inputStipend}
                                                onChange={(e) => setInputStipend(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. IT Department"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Scheduled Joining Date
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDate}
                                                onChange={(e) => setInputDate(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. 07 December 2025"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 5. BANK DETAILS NOTICE */}
                                {selectedType === 'bank_details' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                            ✓ Request for Bank Details uses global candidate variables. No specialized inputs required.
                                        </p>
                                    </div>
                                )}

                                {/* 6. APPOINTMENT CONTROLS */}
                                {selectedType === 'appointment' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Confirmed Designation
                                            </label>
                                            <input
                                                type="text"
                                                value={inputRole}
                                                onChange={(e) => setInputRole(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. Web Developer"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Assigned Department
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDuration}
                                                onChange={(e) => setInputDuration(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. IT Department"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Monthly Salary
                                            </label>
                                            <input
                                                type="text"
                                                value={inputStipend}
                                                onChange={(e) => setInputStipend(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. ₹18,500/-"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold tracking-wider uppercase block mb-1.5 text-slate-400">
                                                Annual CTC
                                            </label>
                                            <input
                                                type="text"
                                                value={inputDate}
                                                onChange={(e) => setInputDate(e.target.value)}
                                                className={inputClass}
                                                placeholder="e.g. ₹2,22,000/-"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 7. POLICY ATTACHMENT SLOTS CONTROLS */}
                                {selectedType === 'policy_document' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold tracking-wider uppercase block text-slate-400">
                                            Attach Official Document Packet (PDF/Docx)
                                        </label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all group"
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileDropChange}
                                                accept=".pdf,.docx"
                                            />
                                            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                                                {attachedFile ? attachedFile.name : "Select or Drop Company Policy Document"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        onClick={applyVariablesToCurrentTemplate}
                                        className="w-full font-bold text-xs px-4 py-3 rounded-xl border transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 text-white border-transparent shadow-sm active:scale-[0.99]"
                                    >
                                        Inject Fields into Content Blueprint →
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSending || isLoading}
                                        onClick={triggerOutboundEmailDispatch}
                                        className="w-full font-black text-xs px-4 py-3.5 rounded-xl transition-all duration-200 bg-[#2b2652] hover:bg-[#1e1a3a] text-white shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSending ? (
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4 text-[#c4a174]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                            </svg>
                                        )}
                                        <span>{isSending ? "Executing Node Transmission..." : "Transmit Live Email to Candidate"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LIVE HANDSHAKE LOG PANEL */}
                        <div className={`p-5 border rounded-2xl shadow-md space-y-4 transition-all ${darkMode ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-slate-200/60"}`}>
                            <div>
                                <h3 className="text-xs font-black tracking-wider uppercase text-[#c4a174]">
                                    Live Session Handshake Log
                                </h3>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Real-time outbound pipeline network results.</p>
                            </div>

                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {deliveryLogs.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic p-1">No transaction history captured yet this session.</p>
                                ) : (
                                    deliveryLogs.map((log) => (
                                        <div key={log.id} className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${darkMode ? "bg-zinc-950/60 border-zinc-800/80" : "bg-slate-50 border-slate-200"}`}>
                                            <div className="truncate max-w-[75%]">
                                                <p className="font-extrabold text-zinc-300 truncate">{log.recipient}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">{log.templateLabel} • {log.timestamp}</p>
                                            </div>
                                            <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MAIN TEMPLATE VIEWPORT & REGISTRY (RIGHT COLUMN) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className={`border rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[580px] transition-all ${darkMode ? "bg-zinc-900/60 border-zinc-800/80 shadow-black/10" : "bg-white border-slate-200/60 shadow-slate-200/40"}`}>

                            {/* TABS NAVIGATION BAR */}
                            <div className={`p-2.5 border-b flex flex-wrap gap-1.5 ${darkMode ? "border-zinc-800 bg-zinc-900/40" : "border-slate-100 bg-slate-50/60"}`}>
                                {TEMPLATE_TYPES.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        type="button"
                                        disabled={isEditing}
                                        onClick={() => setSelectedType(tmpl.id)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 border disabled:opacity-40 ${selectedType === tmpl.id
                                            ? "bg-[#c4a174] text-[#2b2652] border-transparent shadow-sm"
                                            : darkMode
                                                ? "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800"
                                                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100"
                                            }`}
                                    >
                                        {tmpl.label}
                                    </button>
                                ))}
                            </div>

                            {/* BLUEPRINT INTERACTION LAYER */}
                            <div className={`p-6 flex-1 flex flex-col space-y-4 ${darkMode ? "bg-zinc-900/10" : "bg-slate-50/30"}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-dashed border-slate-200 dark:border-zinc-800">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-widest text-[#c4a174] uppercase block">Active Template Sandbox</span>
                                        <h3 className={`text-lg font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                                            {TEMPLATE_TYPES.find(t => t.id === selectedType)?.label}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all duration-200 shadow-sm ${copied
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                : darkMode
                                                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                                                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                                }`}
                                        >
                                            {copied ? "✓ Payload Copied!" : "Copy Payload"}
                                        </button>

                                        {!isEditing ? (
                                            <button
                                                type="button"
                                                onClick={startEditing}
                                                disabled={isLoading}
                                                className="text-xs font-bold px-4 py-2 rounded-xl bg-[#505824] text-white hover:bg-[#40461d] transition-all duration-200"
                                            >
                                                Modify Blueprint Structure
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                <button type="button" onClick={cancelInlineChanges} className="text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20">
                                                    Discard
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => executeDatabaseSave(selectedType, templates[selectedType].subject, templates[selectedType].body)}
                                                    className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                                                >
                                                    <span>Lock & Save</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Email Headers Subject Line</label>
                                    <input
                                        type="text"
                                        value={templates[selectedType]?.subject || ""}
                                        onChange={(e) => handleFieldChange('subject', e.target.value)}
                                        disabled={!isEditing || isLoading}
                                        className={`w-full font-semibold px-4 py-2.5 rounded-xl border text-sm focus:outline-none ${isEditing
                                            ? "bg-white dark:bg-zinc-950 border-[#505824] text-slate-800 dark:text-zinc-100 shadow-sm ring-1 ring-[#505824]"
                                            : "bg-transparent border-transparent text-slate-500 dark:text-zinc-400 font-bold cursor-not-allowed select-none p-0"
                                            }`}
                                    />
                                </div>

                                <div className="flex-1 flex flex-col min-h-[300px]">
                                    <label className="text-[10px] font-bold tracking-wider uppercase mb-1.5 text-slate-400">Body Output Buffer Content Matrix</label>
                                    {isLoading ? (
                                        <div className="flex-1 w-full border border-dashed rounded-xl flex flex-col items-center justify-center space-y-2 text-zinc-400 bg-slate-100/30 dark:bg-zinc-950/20">
                                            <div className="h-5 w-5 border-2 border-[#c4a174] border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs font-bold">Synchronizing Database Blueprint Layers...</span>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={templates[selectedType]?.body || ""}
                                            onChange={(e) => handleFieldChange('body', e.target.value)}
                                            readOnly={!isEditing}
                                            rows={14}
                                            className={`w-full flex-1 p-4 border rounded-xl text-sm font-medium focus:outline-none transition-all duration-200 font-mono leading-relaxed resize-none ${isEditing
                                                ? "bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 border-[#505824] ring-1 ring-[#505824]"
                                                : darkMode
                                                    ? "bg-zinc-950/40 border-zinc-800/80 text-zinc-300 cursor-not-allowed"
                                                    : "bg-slate-100/60 border-slate-200 text-slate-600 cursor-not-allowed"
                                                }`}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>


                    </div>

                </main>
            </div>

            {/* HIGH FIDELITY POPUP HUD NOTIFICATION DIALOG LAYER */}
            {statusNotification?.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-all scale-in-center ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-900"
                        }`}>
                        <div className="flex items-center gap-3.5 mb-4">
                            {statusNotification.type === 'success' ? (
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            )}
                            <div>
                                <h3 className="text-base font-black tracking-tight">
                                    {statusNotification.title}
                                </h3>
                                <p className={`text-[11px] font-medium tracking-wide uppercase ${statusNotification.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                                    }`}>
                                    System Broadcast Status Matrix
                                </p>
                            </div>
                        </div>

                        <p className={`text-xs font-semibold leading-relaxed mb-5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                            {statusNotification.message}
                        </p>

                        <button
                            type="button"
                            onClick={() => setStatusNotification(null)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.99] border shadow-sm ${statusNotification.type === 'success'
                                ? "bg-[#2b2652] hover:bg-[#1e1a3a] text-white border-transparent"
                                : "bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                                }`}
                        >
                            Acknowledge Protocol Log
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}