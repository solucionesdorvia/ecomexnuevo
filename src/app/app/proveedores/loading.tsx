export default function ProveedoresLoading() {
  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[900px]">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
            <div className="h-7 w-36 rounded-lg bg-white/[0.06]" />
            <div className="h-3 w-64 rounded bg-white/[0.03]" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
          <div className="h-12 border-b border-white/[0.04] bg-white/[0.02]" />
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-6 px-5 py-4">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-white/[0.04]" />
                  <div className="h-2.5 w-24 rounded bg-white/[0.03]" />
                </div>
                <div className="h-3 w-28 rounded bg-white/[0.03]" />
                <div className="h-3 w-16 rounded bg-white/[0.03]" />
                <div className="h-8 w-20 rounded-lg bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
