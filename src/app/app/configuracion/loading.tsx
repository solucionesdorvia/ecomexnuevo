export default function ConfiguracionLoading() {
  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[780px]">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
            <div className="h-7 w-40 rounded-lg bg-white/[0.06]" />
            <div className="h-3 w-56 rounded bg-white/[0.03]" />
          </div>
        </div>

        {/* Account info skeleton */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
          <div className="h-10 border-b border-white/[0.04] bg-white/[0.02]" />
          <div className="grid gap-px bg-white/[0.03] sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-[#0B1622] px-5 py-4">
                <div className="h-2.5 w-16 rounded bg-white/[0.04]" />
                <div className="mt-2 h-3.5 w-28 rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </div>

        {/* Documents section skeleton */}
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-white/[0.04]" />
          <div className="h-24 rounded-xl border border-white/[0.04] bg-[#0B1622]" />
        </div>
      </div>
    </div>
  );
}
