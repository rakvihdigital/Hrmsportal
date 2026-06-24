"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/app/providers/ThemeProvider"; 

// Initialize client context mappings
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { darkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const adminEmail = "vijay.rakvih@gmail.com";
  const adminPassword = "VijayRakvih@2026";

  // Sync HTML root for any external global styles
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const enteredEmail = email.trim().toLowerCase();

    try {
      if (enteredEmail === adminEmail.toLowerCase() && password === adminPassword) {
        localStorage.setItem("user_id", "00000000-0000-0000-0000-000000000000"); 
        localStorage.setItem("user_role", "admin");
        localStorage.setItem("user_name", "Vijay Rakvih");
        localStorage.setItem("user_email", enteredEmail);
        localStorage.removeItem("allowed_tabs");

        router.push("/admin/dashboard");
        return;
      }

      const { data: employee, error: empError } = await supabase
        .from("employee_credentials")
        .select("id, auto_pass, role, name")
        .eq("email", enteredEmail)
        .maybeSingle();

      if (empError) throw empError;

      if (employee) {
        if (employee.auto_pass !== password) {
          throw new Error("Invalid password sequence context signature.");
        }

        localStorage.setItem("user_id", employee.id);
        localStorage.setItem("user_role", employee.role);
        localStorage.setItem("user_name", employee.name);
        localStorage.setItem("user_email", enteredEmail);
        localStorage.removeItem("allowed_tabs");

        if (employee.role.toLowerCase() === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/employee/dashboard");
        }
        return;
      }

      const { data: subAdmin, error: subError } = await supabase
        .from("sub_admins")
        .select("id, auto_pass, name, department, allowed_tabs")
        .eq("email", enteredEmail)
        .maybeSingle();

      if (subError) throw subError;

      if (subAdmin) {
        if (subAdmin.auto_pass !== password) {
          throw new Error("Invalid password sequence context signature.");
        }

        const allowedTabs: string[] = subAdmin.allowed_tabs || [];

        localStorage.setItem("user_id", subAdmin.id);
        localStorage.setItem("user_role", "sub-admin");
        localStorage.setItem("user_name", subAdmin.name);
        localStorage.setItem("user_email", enteredEmail);
        localStorage.setItem("user_department", subAdmin.department || "");
        localStorage.setItem("allowed_tabs", JSON.stringify(allowedTabs));

        if (allowedTabs.includes("/admin/dashboard")) {
          router.push("/admin/dashboard");
        } else if (allowedTabs.length > 0) {
          router.push(allowedTabs[0]);
        } else {
          throw new Error("This account has no page access assigned. Contact your administrator.");
        }
        return;
      }

      throw new Error("No user profile sequence mapped to this email profile context.");

    } catch (err: any) {
      console.error("Authentication handshake breakdown:", err);
      setError(err?.message || "Invalid credential properties sequence. Please cross-verify entry properties.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFill = (type: "admin" | "employee") => {
    if (error) setError("");
    if (type === "admin") {
      setEmail(adminEmail);
      setPassword(adminPassword);
    } else {
      setEmail("vyshnavivgowda@gmail.com");
      setPassword("Vysh#$37");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden transition-colors duration-300 ${
      darkMode 
        ? "bg-zinc-950 text-zinc-100" 
        : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#505824]/10 via-slate-50 to-slate-100 text-slate-900"
    }`}>
      
      {/* Ambient background glow accentuation grids */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] blur-[120px] rounded-full pointer-events-none transition-colors duration-300 ${
        darkMode ? "bg-[#505824]/10" : "bg-[#505824]/5"
      }`} />

      {/* Primary user-interaction execution module card layout */}
      <div className={`w-full max-w-md backdrop-blur-xl rounded-3xl p-8 md:p-10 relative z-10 transition-all duration-300 border ${
        darkMode 
          ? "bg-zinc-900/90 border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" 
          : "bg-white/80 border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      }`}>
        
        {/* THEME TOGGLE ELEMENT */}
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm ${
              darkMode
                ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
                : "bg-slate-100/80 border-slate-200/60 text-slate-700"
            }`}
            aria-label="Toggle theme mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.58 1.58m12.42 12.42l1.58 1.58M3 12h2.25m13.5 0H21M4.22 19.78l1.58-1.58M17.64 6.36l1.58-1.58M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
              </svg>
            )}
          </button>
        </div>

        {/* BRAND LOGO DESIGN CONTAINER */}
        <div className="flex justify-center mb-6">
          <div className={`p-3 rounded-2xl border shadow-sm transition-colors duration-300 ${
            darkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-50 border-slate-100"
          }`}>
            <Image
              src="/logo.jpg"
              alt="Rakvih Logo"
              width={80}
              height={80}
              className={`w-20 h-auto object-contain ${darkMode ? "brightness-110 contrast-125" : ""}`} 
              priority
            />
          </div>
        </div>

        {/* COMPONENT META DATA ENTRIES */}
        <div className="text-center mb-8">
          <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
            darkMode ? "text-[#d4dc9b]" : "text-[#505824]"
          }`}>
            HRMS Portal
          </h1>
          <p className={`text-sm mt-2 font-medium transition-colors duration-300 ${
            darkMode ? "text-zinc-400" : "text-slate-500"
          }`}>
            Provide identity vectors to access dashboard utilities
          </p>
        </div>

        {/* INPUT INTERACTION CONTROL PANELS */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className={`text-xs font-bold tracking-wider uppercase mb-2 block transition-colors duration-300 ${
              darkMode ? "text-[#d4dc9b]/80" : "text-[#505824]/80"
            }`}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@rakvih.com"
              disabled={isLoading}
              className={`w-full h-12 rounded-xl px-4 outline-none transition-all duration-200 border disabled:opacity-60 focus:ring-4 ${
                darkMode
                  ? "bg-zinc-800/40 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-[#d4dc9b] focus:bg-zinc-800 focus:ring-[#d4dc9b]/10"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#505824] focus:bg-white focus:ring-[#505824]/10"
              }`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
            />
          </div>

          <div>
            <label className={`text-xs font-bold tracking-wider uppercase mb-2 block transition-colors duration-300 ${
              darkMode ? "text-[#d4dc9b]/80" : "text-[#505824]/80"
            }`}>
              Password
            </label>
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full h-12 rounded-xl pl-4 pr-12 outline-none transition-all duration-200 border disabled:opacity-60 focus:ring-4 ${
                  darkMode
                    ? "bg-zinc-800/40 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-[#d4dc9b] focus:bg-zinc-800 focus:ring-[#d4dc9b]/10"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#505824] focus:bg-white focus:ring-[#505824]/10"
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                required
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors duration-150 rounded-lg focus:outline-none ${
                  darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                }`}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={`text-xs md:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium transition-colors duration-300 border ${
              darkMode ? "bg-red-950/20 border-red-900/30 text-red-400" : "bg-red-50 border-red-100 text-red-600"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl active:scale-[0.98] transition-all duration-200 font-bold tracking-wide mt-2 flex items-center justify-center disabled:opacity-50 ${
              darkMode 
                ? "bg-[#eab308] hover:bg-[#ca8a04] text-zinc-950 shadow-none" 
                : "bg-[#ffcf0f] hover:bg-[#eab308] text-[#505824] shadow-md shadow-[#ffcf0f]/20"
            }`}
          >
            {isLoading ? "Validating Session Vector..." : "Sign In to Workspace"}
          </button>

         {/*  <div className={`mt-6 p-4 border rounded-xl space-y-3 transition-colors duration-300 ${
            darkMode ? "bg-[#505824]/10 border-[#505824]/20" : "bg-[#505824]/5 border-[#505824]/10"
          }`}>
            <span className={`text-xs font-bold uppercase tracking-wider block ${
              darkMode ? "text-[#d4dc9b]" : "text-[#505824]"
            }`}>
              Workspace Simulation Macros
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAutoFill("admin")}
                className={`flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-colors border ${
                  darkMode 
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700" 
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                }`}
              >
                ⚡ Admin Macro
              </button>
              <button
                type="button"
                onClick={() => handleAutoFill("employee")}
                className={`flex-1 text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-colors border ${
                  darkMode 
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700" 
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                }`}
              >
                ⚡ Employee Macro
              </button>
            </div>
          </div> */}

        </form>
      </div>
    </div>
  );
}