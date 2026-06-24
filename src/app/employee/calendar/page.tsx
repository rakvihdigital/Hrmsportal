"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CompanyHoliday {
  id: string;
  title: string;
  holiday_date: string; // Format: YYYY-MM-DD
  category: string;
  description: string | null;
}

export default function EmployeeCalendarPage() {
  const { darkMode } = useTheme();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_holidays")
        .select("id, title, holiday_date, category, description")
        .order("holiday_date", { ascending: true });

      if (error) throw error;
      if (data) setHolidays(data as CompanyHoliday[]);
    } catch (err: any) {
      console.error("Error reading database:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const startOffsetDays = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarCells: (number | null)[] = [
    ...Array(startOffsetDays).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1)
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const getHolidaysForDay = (day: number) => {
    const formattedDay = String(day).padStart(2, "0");
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const targetQueryString = `${currentYear}-${formattedMonth}-${formattedDay}`;
    return holidays.filter((h) => h.holiday_date === targetQueryString);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case "restricted":
        return darkMode 
          ? "bg-amber-950/40 text-amber-400 border-amber-900/50" 
          : "bg-amber-50 text-amber-700 border-amber-100";
      case "corporate":
        return darkMode 
          ? "bg-blue-950/40 text-blue-400 border-blue-900/50" 
          : "bg-blue-50 text-blue-700 border-blue-100";
      default:
        return darkMode 
          ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" 
          : "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
  };

  return (
    <main className={`p-4 md:p-8 lg:p-10 min-h-screen transition-colors duration-300 mt-16 xl:mt-0 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Page Title Header */}
      <div className={`border-b pb-5 mb-6 md:mb-8 ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
        <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
          Workspace Calendar
        </h1>
        <p className={`text-xs md:text-sm mt-1 font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
          Observe upcoming public, restricted, and corporate holidays.
        </p>
      </div>

      {loading ? (
        <div className={`h-96 flex flex-col items-center justify-center border rounded-3xl shadow-sm ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
        }`}>
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
            darkMode ? "border-zinc-700 border-t-zinc-400" : "border-slate-300 border-t-slate-800"
          }`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:grid-cols-1 lg:gap-8 items-start">
          
          {/* Calendar Box Main Section */}
          <div className={`border rounded-3xl p-4 md:p-6 shadow-sm lg:col-span-2 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 md:pb-5 md:mb-6 ${
              darkMode ? "border-zinc-800" : "border-slate-100"
            }`}>
              <h2 className={`text-base md:text-lg font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                {months[currentMonth]} <span className={darkMode ? "text-zinc-500 font-bold" : "text-slate-400 font-bold"}>{currentYear}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth} 
                  className={`w-9 h-9 border rounded-xl flex items-center justify-center text-xs active:scale-95 transition-transform ${
                    darkMode ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ◀
                </button>
                <button 
                  onClick={handleNextMonth} 
                  className={`w-9 h-9 border rounded-xl flex items-center justify-center text-xs active:scale-95 transition-transform ${
                    darkMode ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Weekdays Labels Header */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
              {weekdays.map(day => (
                <div key={day} className={`text-[10px] md:text-[11px] font-black uppercase tracking-wider ${
                  darkMode ? "text-zinc-500" : "text-slate-400"
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Days Mapping */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      className={`h-14 sm:h-20 border rounded-xl ${
                        darkMode ? "bg-zinc-950/20 border-zinc-900/50" : "bg-slate-50/40 border-slate-100/50"
                      }`} 
                    />
                  );
                }
                
                const dailyHolidays = getHolidaysForDay(day);
                const hasHolidays = dailyHolidays.length > 0;
                const today = isToday(day);

                return (
                  <div 
                    key={`day-${day}`} 
                    onClick={() => hasHolidays && setSelectedHoliday(dailyHolidays[0])}
                    className={`relative h-14 sm:h-20 p-1 md:p-2 border rounded-xl flex flex-col justify-between transition-all group cursor-pointer ${
                      hasHolidays 
                        ? (darkMode ? "bg-zinc-800 border-zinc-600" : "bg-slate-50/80 border-slate-300") 
                        : today 
                        ? (darkMode ? "bg-indigo-950/30 border-indigo-500/50" : "bg-indigo-50/50 border-indigo-200") 
                        : (darkMode ? "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700" : "bg-white border-slate-100 hover:border-slate-200")
                    }`}
                  >
                    <span className={`text-[11px] sm:text-xs font-black self-start ${
                      today 
                        ? (darkMode ? "text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded-md" : "text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-md") 
                        : hasHolidays 
                        ? (darkMode ? "text-white" : "text-slate-900") 
                        : (darkMode ? "text-zinc-500" : "text-slate-400")
                    }`}>
                      {day}
                    </span>
                    
                    {/* Desktop Tooltip Mode */}
                    {hasHolidays && (
                      <div className="hidden sm:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl border dark:border-zinc-700">
                        {dailyHolidays.map(h => (
                          <div key={h.id} className="mb-1">
                            <span className="text-[#ffcf0f]">{h.category}:</span> {h.title}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Desktop Display Flag Label / Mobile Small Indicator Dot */}
                    {hasHolidays && (
                      <div className="w-full">
                        {/* Dot indicator for small mobile screens */}
                        <div className="block sm:hidden h-1.5 w-1.5 rounded-full bg-amber-500 mx-auto mb-1" />
                        
                        {/* Text labels for tablets and desktops */}
                        <div className="hidden sm:block space-y-1">
                          {dailyHolidays.slice(0, 1).map(h => (
                            <div 
                              key={h.id} 
                              className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border truncate bg-zinc-950 text-white dark:bg-zinc-800 dark:border-zinc-700"
                            >
                              🎉 {h.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content Panel Group Widgets */}
          <div className="space-y-4 md:space-y-6 lg:col-span-1 w-full">
            
            {/* Dynamic Card Item Selection View Details */}
            {selectedHoliday ? (
              <div className={`rounded-3xl p-5 md:p-6 shadow-md border ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-900 text-white"
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase border rounded ${
                    darkMode ? "bg-zinc-800 text-[#ffcf0f] border-zinc-700" : "bg-white/10 text-[#ffcf0f] border-white/10"
                  }`}>
                    {selectedHoliday.category} Break
                  </span>
                  <button 
                    onClick={() => setSelectedHoliday(null)} 
                    className={`text-xs font-bold ${darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    ✕ Dismiss
                  </button>
                </div>
                <h3 className="text-sm md:text-base font-black mb-1">🎉 {selectedHoliday.title}</h3>
                <p className={`text-xs font-bold mb-4 ${darkMode ? "text-zinc-400" : "text-slate-300"}`}>
                  🗓️ {selectedHoliday.holiday_date}
                </p>
                <div className={`border-t pt-4 ${darkMode ? "border-zinc-800" : "border-white/10"}`}>
                  <p className={`text-xs leading-relaxed ${darkMode ? "text-zinc-300" : "text-slate-200"}`}>
                    {selectedHoliday.description || "No specific dynamic event guidelines reported."}
                  </p>
                </div>
              </div>
            ) : (
              <div className={`border border-dashed rounded-3xl p-6 text-center text-xs font-medium h-24 md:h-32 flex items-center justify-center transition-colors ${
                darkMode ? "bg-zinc-900/30 border-zinc-800 text-zinc-500" : "bg-white border-slate-200 text-slate-400"
              }`}>
                💡 Tap a holiday cell or timeline event element to see additional summary notes.
              </div>
            )}

            {/* Sidebar Master Agenda Feed Pipeline */}
            <div className={`border rounded-3xl p-5 md:p-6 shadow-sm ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}>
              <h3 className={`text-xs md:text-sm font-black border-b pb-3 mb-4 ${
                darkMode ? "text-white border-zinc-800" : "text-slate-900 border-slate-100"
              }`}>
                Upcoming Master Holidays
              </h3>
              <div className="space-y-3 max-h-[280px] md:max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {holidays.map(h => (
                  <div 
                    key={h.id} 
                    onClick={() => setSelectedHoliday(h)} 
                    className={`p-3 border rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      darkMode 
                        ? "bg-zinc-950 border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700" 
                        : "bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-100"
                    }`}
                  >
                    <div className="truncate min-w-0 flex-1">
                      <h4 className={`text-xs font-bold truncate ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>
                        {h.title}
                      </h4>
                      <span className={`text-[10px] block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                        🗓️ {h.holiday_date}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded shrink-0 ${getCategoryBadgeClass(h.category)}`}>
                      {h.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </main>
  );
}