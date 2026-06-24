"use client";

import EmployeeSidebar from "../components/EmployeeSidebar"; 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Simple client-side safeguard to ensure only authorized users access this layout
    const userRole = localStorage.getItem("user_role");
    
    if (!userRole) {
      // If no session exists, bounce them straight back to the login page
      router.push("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    // Optional: Return a clean loading skeleton or nothing to prevent layout flashing during routing redirects
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col xl:flex-row bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Persistent Sidebar / Mobile Navbar Top-Bar Anchor */}
      <EmployeeSidebar />

      {/* Dynamic Content Viewport */}
      {/* FIX: Removed pl-[260px] which breaks mobile devices. 
          Uses xl:pl-[260px] so it safely pads only on desktop layouts, 
          letting mobile views occupy full width under the mobile header bar. */}
      <div className="flex-1 w-full xl:pl-[260px] min-w-0">
        {children}
      </div>
    </div>
  );
}