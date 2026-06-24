"use client";

import Sidebar from "../components/Sidebar";
import { useTheme } from "@/app/providers/ThemeProvider"; // Import your theme hook
import RouteGuard from "../components/RouteGuard";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { darkMode } = useTheme(); // Consume your global theme state

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-zinc-950" : "bg-[#f8f8f4]"
    }`}>
      
      {/* FIXED POSITION NAVIGATION */}
      <Sidebar />

      {/* FLEXIBLE CONTENT COMPARTMENT CONTAINER */}
      <main className="flex-1 xl:ml-[260px] p-6 md:p-8 min-w-0 mt-16 xl:mt-0">
      <RouteGuard>{children}</RouteGuard>
      </main>

    </div>
  );
}