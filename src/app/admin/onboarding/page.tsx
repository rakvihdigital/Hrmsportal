"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "@/app/providers/ThemeProvider";

export default function AdminOnboardingForm() {
  const { darkMode } = useTheme();

  // Main Navigation Tabs
  const [activeTab, setActiveTab] = useState<"offer" | "onboarding">("offer");

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [backupText, setBackupText] = useState("");

  // Copy feedback state
  const [copiedTab, setCopiedTab] = useState<"offer" | "onboarding" | null>(null);

  // Candidate Data States
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email Type Selector
  const [emailType, setEmailType] = useState<"offer" | "onboarding">("offer");

  // Fixed Templates
  const getOfferTemplate = (name: string) => `Dear ${name || "(name)"},

Welcome to Rakvih!
We are excited to have you join us as an intern starting on 22 April 2026. Congratulations on being selected, and we look forward to supporting you through this learning journey.
During your two-month internship, you will have the opportunity to work on real-time projects, enhance your skills, and gain practical industry experience. A monthly stipend of ₹8,000 will be provided based on your performance and contributions.
We will also conduct regular one-on-one review sessions each month to guide you, provide feedback, and track your progress throughout the program.
At the end of the internship, based on your performance, work quality, and alignment with our expectations, you may be considered for a full-time opportunity with Rakvih.

Thanks and Regards,
Vijay Kumar 
Director
RAKVIH Solutions Private Limited.

Mobile No. +91 8296392047
Website: https://rakvih.in/

HR CONSULTING AND SERVICES | TALENT ACQUISITION | BUSINESS SOLUTIONS

Disclaimer: This email and any attachments may contain confidential and privileged information. If you are not the intended recipient, please notify the sender immediately, delete the message, and do not disclose or distribute its contents. Any views or opinions expressed are solely those of the author and do not necessarily represent those of the company.`;

  const getOnboardingTemplate = (name: string, role: string) => `Dear ${name || "(Name)"},

Greetings!
We are delighted to welcome you to RAKVIH Solutions Private. Limited as a ${role || "web Developer"} on our team. Your enthusiasm and potential will be a valuable addition to our team.
To complete your internship onboarding formalities, we request you to kindly share the following scanned documents (clearly visible) as attachments in your response email:

*Aadhaar Card (Front & Back)

*PAN Card

*Mark Sheets

*Degree Certificates (all sem marksheet)(if applicable)

*Any Additional Certifications (if applicable)



Please note: If you have prior experience, you may also share your relieving letter from a previous company (if applicable).

Should you have any questions or require assistance during this process, please do not hesitate to reach out.
We look forward to having you on board and wish you a successful internship journey with us.

Thanks and Regards,
Vijay Kumar 
Talent Acquisition and HR Manager
RAKVIH Solutions Private Limited.

Mobile No. +91 8296392047
Website: https://rakvih.in/

HR CONSULTING AND SERVICES | TALENT ACQUISITION | BUSINESS SOLUTIONS

Disclaimer: This email and any attachments may contain confidential and privileged information. If you are not the intended recipient, please notify the sender immediately, delete the message, and do not disclose or distribute its contents. Any views or opinions expressed are solely those of the author and do not necessarily represent those of the company.`;

  // Text States
  const [offerLetterText, setOfferLetterText] = useState(getOfferTemplate(""));
  const [onboardingText, setOnboardingText] = useState(getOnboardingTemplate("", ""));

  const handleTabChange = (tab: "offer" | "onboarding") => {
    setActiveTab(tab);
    setIsEditing(false);
    setBackupText("");
  };

  const applyDetailsToTemplates = () => {
    setOfferLetterText(getOfferTemplate(candidateName));
    setOnboardingText(getOnboardingTemplate(candidateName, candidateRole));
    setIsEditing(false);
  };

  const startEditing = () => {
    setBackupText(activeTab === "offer" ? offerLetterText : onboardingText);
    setIsEditing(true);
  };

  const saveInlineChanges = () => {
    setIsEditing(false);
    setBackupText("");
  };

  const cancelInlineChanges = () => {
    if (activeTab === "offer") setOfferLetterText(backupText);
    else setOnboardingText(backupText);
    setIsEditing(false);
    setBackupText("");
  };

  const handleCopy = async (tab: "offer" | "onboarding") => {
    const textToCopy = tab === "offer" ? offerLetterText : onboardingText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 2000);
    }
  };

  const handleSaveAndSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateName || !candidateEmail || !candidateRole) {
      alert("Please enter the candidate's name, email, and role.");
      return;
    }
    if (isEditing) {
      alert("Please update or cancel your current edits before saving.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: existing } = await supabase
        .from("employee_onboarding")
        .select("id")
        .eq("email", candidateEmail)
        .single();

      let recordId: string;

      if (existing) {
        recordId = existing.id;
        const { error: updateError } = await supabase
          .from("employee_onboarding")
          .update({
            name: candidateName,
            role: candidateRole,
            ...(emailType === "offer" && { offer_letter_text: offerLetterText }),
            status: "emails_sent",
          })
          .eq("id", recordId);
        if (updateError) throw new Error(`Update Error: ${updateError.message}`);
      } else {
        const { data: newRecord, error: dbError } = await supabase
          .from("employee_onboarding")
          .insert([{
            name: candidateName,
            email: candidateEmail,
            role: candidateRole,
            offer_letter_text: offerLetterText,
            status: "emails_sent",
          }])
          .select("id")
          .single();
        if (dbError) throw new Error(`Database Error: ${dbError.message}`);
        recordId = newRecord.id;
      }

      const candidateLink = `${process.env.NEXT_PUBLIC_APP_URL}/employee/documentationprocess?id=${recordId}`;
      const emailBody =
        emailType === "offer"
          ? offerLetterText
          : `${onboardingText}\n\n---\nComplete your documentation here:\n${candidateLink}`;

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: candidateEmail,
          name: candidateName,
          emailType,
          body: emailBody,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email.");

      alert(`Success! ${emailType === "offer" ? "Offer Letter" : "Onboarding Email"} sent to ${candidateEmail}.`);

      setCandidateName("");
      setCandidateEmail("");
      setCandidateRole("");
      setOfferLetterText(getOfferTemplate(""));
      setOnboardingText(getOnboardingTemplate("", ""));
      setEmailType("offer");
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable Tab Action Buttons
  const TabActionButtons = ({ tab }: { tab: "offer" | "onboarding" }) => (
    <div className="flex gap-2">
      <button
        onClick={() => handleCopy(tab)}
        className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all shadow-sm flex items-center gap-1.5 ${copiedTab === tab
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40"
          : darkMode
            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
          }`}
        title="Copy all content"
      >
        {copiedTab === tab ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
         
          </>
        )}
      </button>

      {!isEditing ? (
        <button
          onClick={startEditing}
          className={`text-xs font-bold px-4 py-2 rounded-lg border transition-colors shadow-sm ${darkMode
            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
        >
           Edit
        </button>
      ) : (
        <>
          <button
            onClick={cancelInlineChanges}
            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-3 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveInlineChanges}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            Update Changes
          </button>
        </>
      )}
    </div>
  );

  // Shared input class
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none transition-all shadow-sm ${darkMode
    ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600"
    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400 focus:bg-white"
    }`;

  return (
    <div className={`min-h-screen antialiased p-4 md:p-8 pt-6 space-y-6 transition-colors duration-300 ${darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
      }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className={`w-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xs transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            {/* Left Side: Header & Subtext */}
            <div className="text-left">
              <h1 className={`text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                New Joinee Registration
              </h1>
              <p className={`text-sm mt-1 max-w-xl ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                Enter candidate details, select which email to send, and dispatch.
              </p>
            </div>

            {/* Right Side: Action Button */}
            <div className="w-full sm:w-auto shrink-0 flex justify-start sm:justify-end">
              <button
                onClick={handleSaveAndSend}
                disabled={isSubmitting}
                className={`w-full sm:w-auto font-bold text-sm px-6 h-12 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${darkMode
                    ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <span>
                  {isSubmitting ? "Sending..." : `Send ${emailType === "offer" ? "Offer Letter" : "Onboarding Email"}`}
                </span>
              </button>
            </div>

          </div>
        </div>

<main className="px-4 py-4 md:px-12 md:py-6 lg:py-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Basic Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 border rounded-3xl shadow-sm space-y-5 transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200/80"
              }`}>
              <div>
                <h2 className={`text-base font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  Basic Information
                </h2>
                <p className={`text-xs mb-4 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                  Fill these out, then click "Apply Details" to update the templates automatically.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`text-[11px] font-bold tracking-wider uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-500"
                    }`}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Jane Doe"
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-bold tracking-wider uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-500"
                    }`}>
                    Personal Email Address
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className={inputClass}
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-bold tracking-wider uppercase block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-500"
                    }`}>
                    Designated Role
                  </label>
                  <input
                    type="text"
                    value={candidateRole}
                    onChange={(e) => setCandidateRole(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Web Developer"
                  />
                </div>

                <button
                  type="button"
                  onClick={applyDetailsToTemplates}
                  className={`w-full mt-2 font-bold text-xs px-4 py-3 rounded-xl border transition-colors ${darkMode
                    ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                >
                  Apply Details to Templates →
                </button>

                {/* EMAIL TYPE SELECTOR */}
                <div className={`space-y-2 pt-2 border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <label className={`text-[11px] font-bold tracking-wider uppercase block ${darkMode ? "text-zinc-500" : "text-slate-500"
                    }`}>
                    Select Email to Send
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailType("offer")}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${emailType === "offer"
                        ? darkMode
                          ? "bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm"
                          : "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : darkMode
                          ? "bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      Offer Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailType("onboarding")}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${emailType === "onboarding"
                        ? darkMode
                          ? "bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm"
                          : "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : darkMode
                          ? "bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      Onboarding
                    </button>
                  </div>
                  <p className={`text-[10px] font-medium ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                    {emailType === "offer"
                      ? "Only the Offer Letter will be sent."
                      : "Only the Onboarding email will be sent."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tabbed Data Entry */}
          <div className="lg:col-span-8">
            <div className={`border rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[500px] transition-colors duration-300 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200/80"
              }`}>

              {/* Tabs */}
              <div className={`p-2 border-b flex flex-wrap gap-2 ${darkMode ? "border-zinc-800 bg-zinc-900/50" : "border-slate-100 bg-slate-50/50"
                }`}>
                {(["offer", "onboarding"] as const).map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border ${activeTab === tab
                      ? darkMode
                        ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                        : "bg-white text-slate-900 border-slate-200 shadow-sm"
                      : darkMode
                        ? "text-zinc-500 hover:text-zinc-300 border-transparent"
                        : "text-slate-500 hover:text-slate-800 border-transparent"
                      }`}
                  >
                    {i + 1}. {tab === "offer" ? "Offer Letter" : "Onboarding"}
                  </button>
                ))}
              </div>

              <div className={`p-6 flex-1 ${darkMode ? "bg-zinc-900/20" : "bg-slate-50/20"}`}>

                {/* TAB 1: OFFER LETTER */}
                {activeTab === "offer" && (
                  <div className="animate-in fade-in space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        Offer Letter Content
                      </h3>
                      <TabActionButtons tab="offer" />
                    </div>
                    <textarea
                      value={offerLetterText}
                      onChange={(e) => setOfferLetterText(e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full h-[450px] p-4 border rounded-2xl text-sm font-medium focus:outline-none transition-all shadow-sm resize-none ${isEditing
                        ? darkMode
                          ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-2 focus:ring-zinc-700"
                          : "bg-white border-slate-400 text-slate-800 focus:ring-2 focus:ring-slate-100"
                        : darkMode
                          ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 cursor-not-allowed"
                          : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                        }`}
                    />
                  </div>
                )}

                {/* TAB 2: ONBOARDING */}
                {activeTab === "onboarding" && (
                  <div className="animate-in fade-in space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-extrabold ${darkMode ? "text-white" : "text-slate-900"}`}>
                        Onboarding Content
                      </h3>
                      <TabActionButtons tab="onboarding" />
                    </div>
                    <textarea
                      value={onboardingText}
                      onChange={(e) => setOnboardingText(e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full h-[450px] p-4 border rounded-2xl text-sm font-medium focus:outline-none transition-all shadow-sm resize-none ${isEditing
                        ? darkMode
                          ? "bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-2 focus:ring-zinc-700"
                          : "bg-white border-slate-400 text-slate-800 focus:ring-2 focus:ring-slate-100"
                        : darkMode
                          ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 cursor-not-allowed"
                          : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                        }`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}