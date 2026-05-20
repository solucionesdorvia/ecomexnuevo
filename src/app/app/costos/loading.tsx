export default function CostosLoading() {
  return (
    <div className="relative px-safe pb-8 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[1100px]">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="h-7 w-32 rounded-lg bg-white/[0.06]" />
              <div className="h-3.5 w-48 rounded bg-white/[0.04]" />
            </div>
            <div className="h-10 w-36 rounded-lg bg-white/[0.04]" />
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-white/[0.04] bg-[#0B1622] p-4">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="mt-3 h-8 w-20 rounded-lg bg-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
          <div className="hidden h-10 border-b border-white/[0.04] bg-white/[0.02] sm:block" />
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 rounded bg-white/[0.04]" />
                  <div className="h-2.5 w-24 rounded bg-white/[0.03]" />
                </div>
                <div className="hidden h-3 w-20 rounded bg-white/[0.03] sm:block" />
                <div className="hidden h-3 w-20 rounded bg-white/[0.03] sm:block" />
                <div className="hidden h-3 w-20 rounded bg-white/[0.03] sm:block" />
                <div className="h-4 w-24 rounded bg-white/[0.05]" />
                <div className="h-3 w-10 rounded bg-white/[0.03]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
