"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabase";

interface OnboardingRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  bank_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  uploaded_docs: {
    docType: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    timestamp: string;
  }[] | null;
}

export default function OnboardingListPage() {
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);
  const [reviewTab, setReviewTab] = useState<"bank" | "mergedDocs">("bank");

  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchOnboardingList = useCallback(async () => {
    try {
      setLoadingList(true);
      const { data, error } = await supabase
        .from("employee_onboarding")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching list:", error.message);
        return;
      }

      if (data) {
        setRecords(data as OnboardingRecord[]);
      }
    } catch (err) {
      console.error("Dashboard state sync error:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboardingList();
  }, [fetchOnboardingList]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== "All") {
        if (statusFilter === "pending") {
          matchesStatus = r.status !== "completed";
        } else {
          matchesStatus = r.status === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const exportToExcel = () => {
    const headers = ["Employee ID", "Full Name", "Employee Email", "Designation", "Status", "Entry Date", "Bank Account Holder"];
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map(r => [
        `"${r.id}"`,
        `"${r.name}"`, 
        `"${r.email}"`, 
        `"${r.role}"`, 
        `"${r.status}"`, 
        `"${new Date(r.created_at).toLocaleDateString()}"`,
        `"${r.bank_holder_name || "Not Submitted"}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Employee_Directory_Export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMasterPdf = async (record: OnboardingRecord) => {
    setLoadingPdf(true);
    setPdfUrl(null);

    try {
      const { data: existing } = await supabase.storage
        .from("onboarding-docs")
        .createSignedUrl(`${record.id}/Master_Docs.pdf`, 3600);

      if (existing?.signedUrl) {
        setPdfUrl(existing.signedUrl);
        setLoadingPdf(false);
        return;
      }
    } catch (_) {}

    try {
      const response = await fetch("/api/merge-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: record.id,
          uploadedDocs: record.uploaded_docs,
        }),
      });

      const result = await response.json();
      if (result.url) {
        setPdfUrl(result.url);
      } else {
        console.error("Merge failed:", result.error);
      }
    } catch (err) {
      console.error("Error merging docs:", err);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleOpenRecord = (row: OnboardingRecord) => {
    setSelectedRecord(row);
    setReviewTab("bank");
    getMasterPdf(row);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "emails_sent":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  // Helper to make long UUIDs look like short IDs (e.g., "RS001")
  const formatEmployeeId = (id: string) => {
    if (!id) return "—";
    // If your DB uses short IDs, this just returns it. If it uses long UUIDs, it slices it.
    return id.includes("-") ? id.split("-")[0].toUpperCase() : id.toUpperCase();
  };

  return (
    <div className="bg-slate-50/50 min-h-screen text-slate-800 antialiased selection:bg-emerald-100 relative">

      {/* VIEW MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {selectedRecord.name} - Employee File
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {selectedRecord.email} | {selectedRecord.role}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Navigation */}
            <div className="flex border-b border-slate-100 px-6 bg-white shrink-0">
              {[
                { id: "bank", label: "Bank Details" },
                { id: "mergedDocs", label: "Compiled Documents PDF" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setReviewTab(tab.id as any)}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    reviewTab === tab.id
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
              {/* BANK DETAILS TAB */}
              {reviewTab === "bank" && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 mt-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg">Payroll Account Details</h4>
                  </div>

                  {!selectedRecord.bank_holder_name && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Candidate has not submitted bank details yet.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        Account Holder Name
                      </span>
                      <span className="text-base font-semibold text-slate-900">
                        {selectedRecord.bank_holder_name || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        Bank Name
                      </span>
                      <span className="text-base font-semibold text-slate-900">
                        {selectedRecord.bank_name || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        Account Number
                      </span>
                      <span className="text-base font-mono font-bold text-slate-800 tracking-wider">
                        {selectedRecord.bank_account_number || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        IFSC Code
                      </span>
                      <span className="text-base font-mono font-bold text-slate-800 tracking-wider">
                        {selectedRecord.bank_ifsc || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MERGED DOCS TAB */}
              {reviewTab === "mergedDocs" && (
                <div className="h-full flex flex-col gap-4">
                  <div className="bg-slate-800 text-slate-200 text-xs font-semibold p-4 rounded-xl flex items-center justify-between shadow-inner shrink-0">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>
                        <span className="text-white font-bold tracking-wide">
                          Compiled Document Verification File
                        </span>
                        <br />
                        Contains: Identity, PAN, and Academic Marksheets securely merged.
                      </span>
                    </div>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-100 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Open PDF in New Tab
                      </a>
                    )}
                  </div>

                  <div className="flex-1 border-2 border-slate-200 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3 shadow-inner min-h-[400px] overflow-hidden">
                    {loadingPdf ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin"></div>
                        <span className="text-sm font-bold text-slate-500">Retrieving secure document...</span>
                      </div>
                    ) : pdfUrl ? (
                      <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full border-none"
                        title="Candidate Master Documents"
                      />
                    ) : (
                      <div className="text-center p-6">
                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="block font-bold text-slate-600 mb-1">No Document Available</span>
                        <span className="block text-sm">
                          The merged PDF has not been generated or uploaded yet.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW REDESIGNED HEADER */}
      {/* REDESIGNED CURVED HEADER BOX */}
<div className="max-w-7xl mx-auto pt-8 px-6 md:px-12">
  <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-inner">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Employee Directory
        </h1>
      </div>
      <p className="text-sm text-slate-500 font-medium sm:ml-12">
        Manage team access, documentation, and onboarding statuses.
      </p>
    </div>
  </div>
</div>

      {/* MAIN CONTENT AREA */}
      <main className="p-6 md:p-12 max-w-7xl mx-auto">
        
        {/* TOP CONTROLS: SEARCH, FILTERS, & EXPORT */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text"
              placeholder="Search by candidate name or email..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <select 
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="completed">Completed (Docs Submitted)</option>
              <option value="pending">Pending / Not Submitted</option>
              <option value="emails_sent">Emails Sent</option>
            </select>
            
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel Export ({filteredRecords.length})
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
          {loadingList ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3].map((v) => (
                <div key={v} className="h-12 bg-slate-50 animate-pulse rounded-xl w-full" />
              ))}
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Candidate Profile</th>
                    {/* NEW EMPLOYEE ID COLUMN HEADER */}
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Assigned Role</th>
                    <th className="py-4 px-6">Entry Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{row.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{row.email}</div>
                      </td>
                      
                      {/* NEW EMPLOYEE ID COLUMN */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-bold border border-slate-200">
                          {formatEmployeeId(row.id)}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-600">{row.role}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        {new Date(row.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenRecord(row)}
                          className="px-4 py-2 text-xs font-bold rounded-xl transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                        >
                          View File
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <p className="text-sm font-semibold text-slate-700">No matching records found.</p>
              <button 
                onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}
                className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-bold underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}