"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/ThemeProvider"; 

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { darkMode, toggleTheme } = useTheme(); 
  const [isOpen, setIsOpen] = useState(false);
  
  const [employeeName, setEmployeeName] = useState("Employee Workspace");
  const [employeeEmail, setEmployeeEmail] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    const storedEmail = localStorage.getItem("user_email");
    if (storedName) setEmployeeName(storedName);
    if (storedEmail) setEmployeeEmail(storedEmail);
  }, []);

  const menuItems = [
    {
      path: "/employee/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      path: "/employee/documentationprocess",
      label: "Documentation Process",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: "/employee/projects",
      label: "My Projects",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      path: "/employee/attendance",
      label: "Attendance",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: "/employee/leaves",
      label: "Apply Leaves",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      path: "/employee/calendar",
      label: "Holidays & Calendar",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
      ),
    },
    {
      path: "/employee/payroll",
      label: "My Payslips",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out of your workspace session?")) {
      localStorage.clear();
      sessionStorage.clear();
      router.push("/");
    }
  };

  const renderNavLinks = () => menuItems.map((item) => {
    const isActive = pathname === item.path;
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={() => setIsOpen(false)}
        className={`h-11 flex items-center gap-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 group relative shrink-0 ${
          isActive
            ? "text-slate-950 bg-[#ffcf0f] shadow-lg shadow-[#ffcf0f]/10"
            : `${darkMode ? "text-zinc-400 hover:text-white hover:bg-zinc-800/60" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"} hover:translate-x-1`
        }`}
      >
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none rounded-xl" />
        )}
        <div className={isActive ? "text-slate-950" : `${darkMode ? "text-zinc-500 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900"}`}>
          {item.icon}
        </div>
        <span className="tracking-wide text-ellipsis overflow-hidden whitespace-nowrap">{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      {/* 1. MOBILE-FRIENDLY TOP HEADER BAR */}
      <header className={`xl:hidden w-full h-16 fixed top-0 left-0 px-4 flex items-center justify-between z-20 transition-colors duration-300 border-b ${
        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
            <Image src="/logo.jpg" alt="Rakvih Logo" width={28} height={28} className="object-contain" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">HRMS</span>
          </div>
        </div>

        {/* CONTROLS AREA FOR TOGGLE AND DRAWER HAMBURGER */}
        <div className="flex items-center gap-2">
          {/* ICON-ONLY HEADER THEME SWITCHER */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all duration-200 outline-none ${
              darkMode ? "bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            aria-label="Toggle Theme Mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.58 1.58m12.42 12.42l1.58 1.58M3 12h2.25m13.5 0H21M4.22 19.78l1.58-1.58M17.64 6.36l1.58-1.58M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
              </svg>
            )}
          </button>

          {/* MENU BUTTON */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-xl border outline-none ${
              darkMode ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
            aria-label="Toggle Navigation Drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY BACKDROP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* 2. MAIN SIDEBAR COMPONENT CONTAINER */}
      <aside className={`w-[260px] border-r flex flex-col justify-between shrink-0 h-screen fixed top-0 left-0 p-4 shadow-xl z-40 transition-all duration-300 xl:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${
        darkMode
          ? "bg-zinc-900 border-zinc-800 text-zinc-100"
          : "bg-white border-slate-200 text-slate-900"
      }`}>

        <div className="flex flex-col h-[calc(100vh-140px)]">
          {/* BRAND LOGO AREA */}
          <div className={`p-4 mb-5 flex flex-col items-center text-center rounded-2xl border relative backdrop-blur-md shrink-0 transition-colors duration-300 ${
            darkMode ? "bg-zinc-950/40 border-zinc-800/40" : "bg-slate-50 border-slate-200/60"
          }`}>
            {/* Mobile-Only Close Icon Inside Drawer Header */}
            <button 
              onClick={() => setIsOpen(false)}
              className="xl:hidden absolute top-3 right-3 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 mb-2">
              <Image
                src="/logo.jpg"
                alt="Rakvih Logo"
                width={40}
                height={40}
                className="object-contain filter drop-shadow-sm"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm tracking-wide">Rakvih Console</div>
              <span className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 block ${
                darkMode ? "text-zinc-400" : "text-slate-500"
              }`}>HRMS System</span>
            </div>
          </div>

          {/* SECTION HEADER */}
          <div className="px-3 mb-2 shrink-0">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#ffcf0f]">
              Employee Console
            </span>
          </div>

          {/* NAVIGATION LINKS CONTAINER WITH SCROLLBAR */}
          <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {renderNavLinks()}
          </nav>
        </div>

        {/* FOOTER ACTIONS AREA */}
        <div className={`flex flex-col gap-2.5 shrink-0 pt-2 border-t ${
          darkMode ? "border-zinc-800" : "border-slate-100"
        }`}>

          {/* EMPLOYEE PROFILE PANEL */}
          <div className={`rounded-2xl p-3 shadow-inner transition-colors duration-300 border ${
            darkMode ? "bg-zinc-950/60 border-zinc-800/80" : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ffcf0f] text-slate-950 font-black text-xs flex items-center justify-center border border-black/10 shadow-md uppercase shrink-0">
                {employeeName.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-black truncate tracking-wide ${darkMode ? "text-white" : "text-slate-800"}`}>
                  {employeeName}
                </div>
                <span className={`text-[9px] font-bold block truncate tracking-wide mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
                  {employeeEmail || "workspace.user@rakvih.com"}
                </span>
              </div>
            </div>
          </div>

          {/* ACTION TRIGGER FOOTER ROW */}
          <div className="flex items-center gap-2">

            {/* DESKTOP THEME TOGGLER BUTTON */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`h-11 flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                darkMode 
                  ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" 
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              aria-label="Toggle theme viewport"
            >
              {darkMode ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.58 1.58m12.42 12.42l1.58 1.58M3 12h2.25m13.5 0H21M4.22 19.78l1.58-1.58M17.64 6.36l1.58-1.58M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-slate-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* LOGOUT EXIT TRIGGER */}
            <button
              onClick={handleLogout}
              type="button"
              className={`h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-200 border ${
                darkMode
                  ? "bg-rose-950/30 border-rose-900/50 text-rose-400 hover:bg-rose-900/40"
                  : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              }`}
              aria-label="Exit dashboard platform"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

          </div>
        </div>
      </aside>
    </>
  );
}