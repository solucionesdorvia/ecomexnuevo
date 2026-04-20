"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShellClient({ userEmail, userRole, children }: { userEmail?: string; userRole?: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div
      className="flex h-[100dvh] max-h-[100dvh] bg-[#07111A] text-[#b0b8c9]"
      style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
    >
      <Sidebar userEmail={userEmail} userRole={userRole} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar userRole={userRole} mobileNavOpen={mobileOpen} onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#070e17]">
          <div
            className="pointer-events-none fixed inset-0 left-0 opacity-30 lg:left-[240px]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 60% 40% at 50% 30%, black, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 40% at 50% 30%, black, transparent 80%)",
            }}
          />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain pb-safe [scrollbar-gutter:stable]">
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
