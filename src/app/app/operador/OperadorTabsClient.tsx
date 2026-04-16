"use client";

import { useState } from "react";
import { OperatorBudgetClient } from "@/app/interno/ui/OperatorBudgetClient";
import { OperatorActionsClient } from "./OperatorActionsClient";

type Tab = "presupuestos" | "importaciones";

export function OperadorTabsClient() {
  const [tab, setTab] = useState<Tab>("presupuestos");

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-px">
        <button
          type="button"
          onClick={() => setTab("presupuestos")}
          className={`min-h-[44px] rounded-t-lg px-4 py-2.5 text-[13px] font-medium transition sm:min-h-0 ${
            tab === "presupuestos"
              ? "bg-[#0B1622] text-white ring-1 ring-white/[0.08]"
              : "text-[#555c6b] hover:text-[#b0b8c9]"
          }`}
        >
          Presupuestos
        </button>
        <button
          type="button"
          onClick={() => setTab("importaciones")}
          className={`min-h-[44px] rounded-t-lg px-4 py-2.5 text-[13px] font-medium transition sm:min-h-0 ${
            tab === "importaciones"
              ? "bg-[#0B1622] text-white ring-1 ring-white/[0.08]"
              : "text-[#555c6b] hover:text-[#b0b8c9]"
          }`}
        >
          Importaciones activas
        </button>
      </div>

      <div className="rounded-b-xl rounded-tr-xl border border-t-0 border-white/[0.06] bg-[#0B1622]/30 p-4 sm:p-6">
        {tab === "presupuestos" ? (
          <OperatorBudgetClient />
        ) : (
          <OperatorActionsClient />
        )}
      </div>
    </div>
  );
}
