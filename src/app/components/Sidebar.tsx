"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/ThemeProvider"; 

// Paths that must NEVER be granted to a sub-admin, no matter what is
// stored in their allowed_tabs. Sub-admin management is a full-admin-only
// capability and is intentionally not delegable from the creation form.
const ADMIN_ONLY_PATHS = ["/admin/sub-admin"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { darkMode, toggleTheme } = useTheme(); 
  const [isOpen, setIsOpen] = useState(false);

  // --- CURRENT USER CONTEXT (read once on mount; logout/login navigates away anyway) ---
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [allowedTabs, setAllowedTabs] = useState<string[] | null>(null); // null = unrestricted (admin/employee)

  useEffect(() => {
    const role = localStorage.getItem("user_role") || "";
    const name = localStorage.getItem("user_name") || "";
    const email = localStorage.getItem("user_email") || "";
    setUserRole(role);
    setUserName(name);
    setUserEmail(email);

    if (role === "sub-admin") {
      try {
        const raw = localStorage.getItem("allowed_tabs");
        setAllowedTabs(raw ? JSON.parse(raw) : []);
      } catch {
        setAllowedTabs([]);
      }
    } else {
      setAllowedTabs(null); // admin / employee see everything this sidebar defines
    }
  }, []);

  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      path: "/admin/roles",
      label: "Role Configurations",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      path: "/admin/projects",
      label: "Project List",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      path: "/admin/employees",
      label: "Employee List",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5 5 0 115.586 0M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      path: "/admin/emails",
      label: "Emails",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      path: "/admin/emails/tracking",
      label: "Email Tracking",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      path: "/admin/attendance",
      label: "Attendance Tracking",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: "/admin/leaves",
      label: "Leave Approvals",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      path: "/admin/holidays",
      label: "Holidays & Calendar",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
    {
      path: "/admin/payroll",
      label: "Payroll & Salary",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: "/admin/credentials",
      label: "Employee Access",
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      path: "/admin/sub-admin",
      label: "Sub Admin",
      adminOnly: true, // never shown to sub-admins, see filtering logic below
      icon: (
        <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // --- VISIBILITY FILTER ---
  // - Full admin & employee roles: see every item (unchanged behavior).
  // - Sub-admin: only sees items whose path is in their allowed_tabs,
  //   AND Sub Admin management is always excluded regardless of allowed_tabs.
  const visibleMenuItems = menuItems.filter((item) => {
    if (userRole !== "sub-admin") return true; // admin / employee: unrestricted

    if (ADMIN_ONLY_PATHS.includes(item.path)) return false; // hard block, ignores allowed_tabs entirely
    if (!allowedTabs) return false; // still loading/unset — render nothing until known
    return allowedTabs.includes(item.path);
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out of the management panel?")) {
      localStorage.clear();
      sessionStorage.clear();
      router.push("/");
    }
  };

  const renderNavLinks = () => visibleMenuItems.map((item) => {
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

  // --- PROFILE PANEL DISPLAY VALUES ---
  const displayName = userName || "Vijay Rakvih";
  const displayEmail = userEmail || "vijay.rakvih@gmail.com";
  const avatarLetter = (displayName || "?").charAt(0).toUpperCase();

  return (
    <>
      {/* 1. MOBILE-FRIENDLY TOP HEADER BAR (Lowered z-index to z-20 so sidebar covers it) */}
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

        {/* COMBINED CONTAINER FOR TOGGLE AND DRAWER HAMBURGER */}
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

      {/* MOBILE DRAWER OVERLAY BACKDROP (Raised to z-30) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* 2. THE MAIN SIDEBAR COMPONENT CONTAINER (Raised to z-40 to go completely over the header) */}
      <aside className={`w-[260px] border-r flex flex-col justify-between shrink-0 h-screen fixed top-0 left-0 p-4 shadow-xl z-40 transition-all duration-300 xl:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${
        darkMode
          ? "bg-zinc-900 border-zinc-800 text-zinc-100"
          : "bg-white border-slate-200 text-slate-900"
      }`}>

        <div className="flex flex-col h-[calc(100vh-140px)]">
          {/* BRAND LOGO AREA (Includes close button inside drawer for better mobile flow) */}
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
              <span className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 block ${
                darkMode ? "text-[#d4dc9b]" : "text-[#505824]"
              }`}>HRMS System</span>
            </div>
          </div>

          {/* SECTION HEADER */}
          <div className="px-3 mb-2 shrink-0">
            <span className={`text-[10px] font-extrabold tracking-widest uppercase ${
              darkMode ? "text-[#d4dc9b]/70" : "text-[#505824]"
            }`}>
              {userRole === "sub-admin" ? "Sub-Admin Panel" : "Management Panel"}
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

          {/* PROFILE PANEL (now reflects logged-in user, including sub-admins) */}
          <div className={`rounded-2xl p-3 shadow-inner transition-colors duration-300 border ${
            darkMode ? "bg-zinc-950/60 border-zinc-800/80" : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#505824] text-white font-black text-xs flex items-center justify-center border border-[#505824]/30 shadow-md uppercase shrink-0">
                {avatarLetter}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-black truncate tracking-wide ${darkMode ? "text-white" : "text-slate-800"}`}>
                  {displayName}
                </div>
                <span className={`text-[9px] font-bold block truncate tracking-wide mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-400"}`}>
                  {displayEmail}
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