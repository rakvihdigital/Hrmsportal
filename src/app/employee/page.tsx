"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface EmployeeAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  withdrawal_horizon: string;
}

export default function AdminEmployeeDirectory() {
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error } = await supabase
          .from("employee_credentials")
          .select("id, name, email, role, withdrawal_horizon")
          .order("name", { ascending: true });

        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  const translateHorizon = (code: string) => {
    switch (code) {
      case "1m": return "📅 Every Month";
      case "3m": return "📊 Every 3 Months";
      case "6m": return "📈 Every 6 Months";
      case "9m": return "📉 Every 9 Months";
      case "1y": return "💼 Entire Year Cycle";
      default: return "Not Specified";
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-800 font-medium">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-900 text-white font-bold text-sm">
          Management Console — Employee Withdrawal Frequency Overviews
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-slate-400 animate-pulse">Loading directory entries...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-bold uppercase text-slate-400 border-b border-slate-100 text-[10px]">
                <th className="p-4">Employee Name</th>
                <th className="p-4">Email Workspace</th>
                <th className="p-4">System Role</th>
                <th className="p-4 text-right">Active Lock-in Horizon Preference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900">{emp.name}</td>
                  <td className="p-4 text-slate-500 font-mono">{emp.email}</td>
                  <td className="p-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{emp.role}</span></td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-1 rounded-xl bg-slate-900 text-white font-bold text-[11px] tracking-wide">
                      {translateHorizon(emp.withdrawal_horizon)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}