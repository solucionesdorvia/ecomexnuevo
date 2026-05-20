export default function OperacionDetalleLoading() {
  return (
    <div className="relative px-safe pb-8 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto max-w-[1000px]">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-20 rounded bg-white/[0.04]" />
          <div className="h-3 w-2 rounded bg-white/[0.04]" />
          <div className="h-3 w-14 rounded bg-white/[0.04]" />
        </div>

        {/* Header card skeleton */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="h-7 w-3/4 rounded-lg bg-white/[0.06]" />
              <div className="flex gap-2">
                <div className="h-5 w-20 rounded-full bg-white/[0.04]" />
                <div className="h-5 w-16 rounded-full bg-white/[0.04]" />
                <div className="h-5 w-24 rounded-full bg-white/[0.04]" />
              </div>
              <div className="h-3 w-40 rounded bg-white/[0.03]" />
            </div>
            <div className="h-9 w-32 shrink-0 rounded-lg bg-white/[0.04]" />
          </div>
        </div>

        {/* Content grid skeleton */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Cost cards */}
            <div className="space-y-3">
              <div className="h-3 w-32 rounded bg-white/[0.04]" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="rounded-xl border border-white/[0.05] bg-[#0B1622] p-4 space-y-2">
                    <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
                    <div className="h-5 w-28 rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
            {/* Description */}
            <div className="space-y-3">
              <div className="h-3 w-36 rounded bg-white/[0.04]" />
              <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-4 space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.03]" />
                <div className="h-3 w-5/6 rounded bg-white/[0.03]" />
                <div className="h-3 w-4/6 rounded bg-white/[0.03]" />
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-3">
            <div className="rounded-xl border border-[#d4a843]/15 bg-[#d4a843]/[0.04] p-5 space-y-2">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="h-8 w-32 rounded-lg bg-white/[0.06]" />
            </div>
            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5 space-y-3">
              <div className="h-2.5 w-16 rounded bg-white/[0.04]" />
              <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
              <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
