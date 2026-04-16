"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShellClient({ userEmail, userRole, children }: { userEmail?: string; userRole?: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-[#07111A] text-[#b0b8c9]" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      <Sidebar userEmail={userEmail} userRole={userRole} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userRole={userRole} onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="relative flex-1 overflow-y-auto bg-[#070e17]">
          <div className="pointer-events-none fixed inset-0 left-0 opacity-30 lg:left-[240px]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 60% 40% at 50% 30%, black, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 40% at 50% 30%, black, transparent 80%)",
          }} />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
