import { AppShell } from "@/components/shell/AppShell";

export default function CotizacionesLoading() {
  return (
    <AppShell active="cotizaciones" title="Cotizaciones">
      <div className="animate-pulse space-y-8 p-6 lg:p-8">
        {/* Page header skeleton */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-10 w-56 rounded-lg bg-white/[0.04]" />
            <div className="h-4 w-80 rounded bg-white/[0.03]" />
          </div>
          <div className="h-11 w-40 rounded-xl bg-white/[0.04]" />
        </div>

        {/* Filters skeleton */}
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-28 rounded-xl bg-white/[0.03]" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="h-12 border-b border-white/[0.04] bg-white/[0.02]" />
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-5">
                <div className="h-4 w-16 rounded bg-white/[0.04]" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-48 rounded bg-white/[0.04]" />
                  <div className="h-3 w-32 rounded bg-white/[0.03]" />
                </div>
                <div className="h-4 w-20 rounded bg-white/[0.04]" />
                <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
                <div className="h-4 w-24 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
