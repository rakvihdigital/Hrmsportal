'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/app/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeData {
  id: string;
  employee_id: string;
  name: string;
  sent_emails: string[];
}

interface BankDetails {
  account_holder: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}

interface DocItem {
  key: string;
  label: string;
  required: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_LIST: DocItem[] = [
  { key: 'Aadhaar', label: 'Aadhaar Card', required: true },
  { key: 'PAN', label: 'PAN Card', required: true },
  { key: '10th', label: '10th Certificate', required: true },
  { key: '12th', label: '12th Certificate', required: true },
  { key: 'College', label: 'College Certificate', required: true },
  { key: 'Other', label: 'Other Document', required: false },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentationProcess() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [docSubmitted, setDocSubmitted] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSubmitted, setBankSubmitted] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_holder: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });

  // ── Fetch employee + check existing submissions ───────────────────────────
  useEffect(() => {
    if (authLoading || !authUser?.id) return;

    async function fetchData() {
      const { data: emp } = await supabase
        .from('employee_credentials')
        .select('*')
        .eq('id', authUser!.id)
        .single();

      if (!emp) return;
      setEmployeeData(emp as EmployeeData);

      const { data: existingDocs } = await supabase
        .from('employee_documents')
        .select('document_type')
        .eq('employee_id', emp.employee_id);
      if (existingDocs && existingDocs.length >= 5) setDocSubmitted(true);

      const { data: existingBank } = await supabase
        .from('employee_bank_details')
        .select('employee_id')
        .eq('employee_id', emp.employee_id)
        .maybeSingle();
      if (existingBank) setBankSubmitted(true);
    }

    fetchData();
  }, [authUser, authLoading]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileSelect = (file: File, docKey: string) => {
    setDocFiles((prev) => ({ ...prev, [docKey]: file }));
  };

  const handleSubmitDocuments = async () => {
    if (docSubmitted || !employeeData) return;

    const missing = DOC_LIST.filter((d) => d.required && !docFiles[d.key]).map((d) => d.label);
    if (missing.length > 0) { alert(`Please upload: ${missing.join(', ')}`); return; }

    setUploading(true);

    for (const [docKey, file] of Object.entries(docFiles)) {
      if (!file) continue;
      const ext = file.name.split('.').pop();
      const cleanKey = docKey.toLowerCase().replace(/\s/g, '_');
      const filePath = `${employeeData.employee_id}/${cleanKey}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('employee-docs')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        alert(`Upload failed for ${docKey}: ${uploadErr.message}`);
        setUploading(false);
        return;
      }

      const { data: existingDoc } = await supabase
        .from('employee_documents')
        .select('id')
        .eq('employee_id', employeeData.employee_id)
        .eq('document_type', docKey)
        .maybeSingle();

      if (existingDoc) {
        await supabase
          .from('employee_documents')
          .update({ file_path: filePath })
          .eq('employee_id', employeeData.employee_id)
          .eq('document_type', docKey);
      } else {
        await supabase
          .from('employee_documents')
          .insert({ employee_id: employeeData.employee_id, document_type: docKey, file_path: filePath });
      }
    }

    setUploading(false);
    setDocSubmitted(true);
  };

  const handleSubmitBank = async () => {
    if (bankSubmitted || !employeeData) return;

    if (!bankDetails.account_holder.trim()) { alert('Enter account holder name.'); return; }
    if (!bankDetails.bank_name.trim()) { alert('Enter bank name.'); return; }
    if (bankDetails.account_number.length < 8) { alert('Enter a valid account number (min 8 digits).'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifsc_code.toUpperCase())) { alert('Enter a valid IFSC code (e.g. SBIN0001234).'); return; }

    setBankSaving(true);

    const payload = {
      employee_id: employeeData.employee_id,
      account_holder: bankDetails.account_holder.trim(),
      bank_name: bankDetails.bank_name.trim(),
      account_number: bankDetails.account_number,
      ifsc_code: bankDetails.ifsc_code.toUpperCase(),
    };

    const { data: existing } = await supabase
      .from('employee_bank_details')
      .select('employee_id')
      .eq('employee_id', employeeData.employee_id)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from('employee_bank_details').update(payload).eq('employee_id', employeeData.employee_id)
      : await supabase.from('employee_bank_details').insert(payload);

    setBankSaving(false);
    if (error) alert('Error saving bank details: ' + error.message);
    else setBankSubmitted(true);
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (authLoading || !employeeData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors ${darkMode ? 'bg-[#000000]' : 'bg-[#f7f8f3]'}`}>
        <div className="w-8 h-8 rounded-full border-2 border-[#505824]/30 border-t-[#505824] animate-spin" />
        <p className={`mt-3 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {authLoading ? 'Authenticating…' : 'Loading profile…'}
        </p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#000000]' : 'bg-[#f7f8f3]'}`}>
        <p className="text-gray-500 text-sm">Please log in to continue.</p>
      </div>
    );
  }

  const showDocs = employeeData.sent_emails?.includes('onboarding');
  const showBank = employeeData.sent_emails?.includes('bank_details');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#000000]' : 'bg-[#f7f8f3]'}`}>


      {/* ── Page Content ── */}
      <main className="px-4 sm:px-6 py-6 md:py-10">
        <div className="max-w-7xl mx-auto">

          {/* Updated Profile Card */}
          <div className={`flex items-center gap-4 rounded-xl px-5 py-4 mb-7 mt-10 md:mt-0 border-l-4 border-l-[#505824] shadow-sm transition-colors duration-300
  ${darkMode ? 'bg-[#0a0a0a] border border-[#222222]' : 'bg-white border border-[#e5e7d8]'}`}>

            <div className="w-11 h-11 rounded-full bg-[#505824] text-white flex items-center justify-center text-lg font-bold shrink-0">
              {employeeData.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Employee</p>
              <p className={`text-base font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{employeeData.name}</p>
            </div>

            <div className={`rounded-lg px-3 py-1.5 text-center shrink-0 border
    ${darkMode ? 'bg-[#141414] border-[#505824]/30' : 'bg-[#f4f5ee] border-[#505824]/20'}`}>
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${darkMode ? 'text-[#888888]' : 'text-[#555555]'}`}>ID</p>
              <p className="text-sm font-bold text-[#505824] font-mono">{employeeData.employee_id}</p>
            </div>
          </div>
          {/* Page Heading */}
          <h1 className={`text-xl sm:text-2xl font-extrabold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Documentation Process
          </h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Complete each section below.{' '}
            <span className="text-amber-500 font-medium">
              ⚠ Entries cannot be changed after submission.
            </span>
          </p>

          {/* Documents Section */}
          {showDocs && (
            <SectionCard
              step="01"
              title="Required Documents"
              subtitle="Upload PDF copies of all marked documents."
              submitted={docSubmitted}
              submittedNote="Documents submitted. No further changes allowed."
              darkMode={darkMode}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {DOC_LIST.map((doc) => (
                  <FileUploadSlot
                    key={doc.key}
                    label={doc.label}
                    required={doc.required}
                    locked={docSubmitted}
                    file={docFiles[doc.key] ?? null}
                    darkMode={darkMode}
                    onSelect={(f) => handleFileSelect(f, doc.key)}
                  />
                ))}
              </div>
              {!docSubmitted && (
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleSubmitDocuments}
                    disabled={uploading}
                    className="w-full sm:w-auto bg-[#505824] hover:bg-[#3a4019] disabled:bg-[#8a9448] text-white text-sm font-semibold px-7 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading…' : 'Submit All Documents'}
                  </button>
                </div>
              )}
            </SectionCard>
          )}

          {/* Bank Details Section */}
          {showBank && (
            <SectionCard
              step="02"
              title="Bank Account Details"
              subtitle="Enter your salary account information."
              submitted={bankSubmitted}
              submittedNote="Bank details saved. No further changes allowed."
              darkMode={darkMode}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <BankInput label="Account Holder Name" placeholder="e.g. Rahul Sharma" required locked={bankSubmitted} value={bankDetails.account_holder} darkMode={darkMode} onChange={(v) => setBankDetails({ ...bankDetails, account_holder: v })} />
                <BankInput label="Bank Name" placeholder="e.g. State Bank of India" required locked={bankSubmitted} value={bankDetails.bank_name} darkMode={darkMode} onChange={(v) => setBankDetails({ ...bankDetails, bank_name: v })} />
                <BankInput label="Account Number" placeholder="Min. 8 digits" required locked={bankSubmitted} value={bankDetails.account_number} darkMode={darkMode} type="number" onChange={(v) => setBankDetails({ ...bankDetails, account_number: v })} />
                <BankInput label="IFSC Code" placeholder="e.g. SBIN0001234" required locked={bankSubmitted} value={bankDetails.ifsc_code} darkMode={darkMode} className="uppercase font-mono tracking-wider" onChange={(v) => setBankDetails({ ...bankDetails, ifsc_code: v.toUpperCase() })} />
              </div>
              {!bankSubmitted && (
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleSubmitBank}
                    disabled={bankSaving}
                    className="w-full sm:w-auto bg-[#505824] hover:bg-[#3a4019] disabled:bg-[#8a9448] text-white text-sm font-semibold px-7 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {bankSaving ? 'Saving…' : 'Save Bank Details'}
                  </button>
                </div>
              )}
            </SectionCard>
          )}

          {/* Empty state */}
          {!showDocs && !showBank && (
            <div className={`border border-dashed rounded-xl p-10 text-center text-sm transition-colors
              ${darkMode ? 'border-[#222222] text-gray-500 bg-[#0a0a0a]' : 'border-gray-200 text-gray-400 bg-white'}`}>
              No actions required. Check back after receiving your onboarding email.
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  step: string;
  title: string;
  subtitle: string;
  submitted: boolean;
  submittedNote: string;
  darkMode: boolean;
  children: React.ReactNode;
}

function SectionCard({ step, title, subtitle, submitted, submittedNote, darkMode, children }: SectionCardProps) {
  return (
    <div className={`rounded-xl p-5 sm:p-6 mb-5 border shadow-sm transition-colors duration-300
      ${darkMode ? 'bg-[#0a0a0a] border-[#222222]' : 'bg-white border-[#e5e7d8]'}
      ${submitted ? 'opacity-90' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`text-xs font-extrabold tracking-wider px-2.5 py-1 rounded-md shrink-0 mt-0.5
          ${darkMode ? 'bg-[#141414] text-[#888888]' : 'bg-[#f4f5ee] text-[#555555]'}`}>
          {step}
        </span>
        <div className="flex-1">
          <h2 className={`text-sm sm:text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>
        </div>
        {submitted && (
          <span className="shrink-0 bg-green-900/30 text-green-400 border border-green-800/40 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            ✓ Submitted
          </span>
        )}
      </div>
      {submitted ? (
        <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm border border-dashed
          ${darkMode ? 'bg-[#000000] border-[#222222] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>🔒</span>
          <span>{submittedNote}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── FileUploadSlot ───────────────────────────────────────────────────────────

interface FileUploadSlotProps {
  label: string;
  required: boolean;
  locked: boolean;
  file: File | null;
  darkMode: boolean;
  onSelect: (f: File) => void;
}

function FileUploadSlot({ label, required, locked, file, darkMode, onSelect }: FileUploadSlotProps) {
  const hasFile = !!file;

  return (
    <label className={[
      'flex items-center gap-3 rounded-lg border px-3 py-3 transition-all',
      locked
        ? `cursor-not-allowed ${darkMode ? 'bg-[#000000] border-[#222222]' : 'bg-gray-50 border-gray-200'}`
        : hasFile
          ? `cursor-pointer ${darkMode ? 'bg-[#141414] border-[#505824]/60' : 'bg-[#f4f5ee] border-[#505824]/50'}`
          : `cursor-pointer border-dashed ${darkMode
            ? 'bg-[#000000] border-[#222222] hover:border-[#505824]/50 hover:bg-[#0a0a0a]'
            : 'bg-white border-gray-300 hover:border-[#505824]/60 hover:bg-[#fafaf6]'}`,
    ].join(' ')}>
      <div className="shrink-0 text-lg">
        {hasFile ? '📄' : <span className={darkMode ? 'text-gray-600' : 'text-gray-300'}>⬆</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
        {hasFile ? (
          <>
            <p className="text-[11px] text-[#505824] font-medium truncate mt-0.5" title={file.name}>{file.name}</p>
            <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {locked ? 'Not uploaded' : 'Click to upload PDF'}
          </p>
        )}
      </div>
      {hasFile && <div className="shrink-0 w-2 h-2 rounded-full bg-[#505824]" />}
      <input type="file" accept="application/pdf" className="hidden" disabled={locked}
        onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
    </label>
  );
}

// ─── BankInput ────────────────────────────────────────────────────────────────

interface BankInputProps {
  label: string;
  placeholder: string;
  required: boolean;
  locked: boolean;
  value: string;
  darkMode: boolean;
  type?: string;
  className?: string;
  onChange: (v: string) => void;
}

function BankInput({ label, placeholder, required, locked, value, darkMode, type = 'text', className = '', onChange }: BankInputProps) {
  return (
    <div>
      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors',
          locked
            ? `cursor-not-allowed ${darkMode ? 'bg-[#000000] border-[#222222] text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`
            : darkMode
              ? 'bg-[#000000] border-[#222222] text-white placeholder-gray-600 focus:border-[#505824] focus:ring-1 focus:ring-[#505824]/30'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#505824] focus:ring-1 focus:ring-[#505824]/20',
          className,
        ].join(' ')}
      />
    </div>
  );
}