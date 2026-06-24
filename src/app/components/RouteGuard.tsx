"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_ONLY_PATHS = ["/admin/sub-admin"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role") || "";

    // Full admin and employee roles: no restriction from this guard.
    if (role !== "sub-admin") {
      setChecked(true);
      return;
    }

    // Sub Admin management is never permitted for a sub-admin, regardless
    // of what's stored in allowed_tabs.
    if (ADMIN_ONLY_PATHS.includes(pathname)) {
      setBlocked(true);
      setChecked(true);
      return;
    }

    let allowedTabs: string[] = [];
    try {
      allowedTabs = JSON.parse(localStorage.getItem("allowed_tabs") || "[]");
    } catch {
      allowedTabs = [];
    }

    if (!allowedTabs.includes(pathname)) {
      setBlocked(true);
    }
    setChecked(true);
  }, [pathname]);

  useEffect(() => {
    if (checked && blocked) {
      // Send them somewhere they do have access to, falling back to the
      // login page if they somehow have no access at all.
      let allowedTabs: string[] = [];
      try {
        allowedTabs = JSON.parse(localStorage.getItem("allowed_tabs") || "[]");
      } catch {
        allowedTabs = [];
      }
      router.replace(allowedTabs[0] || "/");
    }
  }, [checked, blocked, router]);

  // Avoid a flash of protected content before the check completes
  if (!checked) return null;

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-black uppercase tracking-widest text-rose-500">Access Denied</p>
          <p className="text-xs font-medium text-slate-400">You don't have permission to view this page. Redirecting…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}