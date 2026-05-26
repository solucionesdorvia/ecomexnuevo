export default function OperadorLoading() {
  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[1100px]">
        {/* Header skeleton */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 sm:px-6">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
              <div className="h-7 w-40 rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-72 rounded bg-white/[0.03]" />
            </div>
            <div className="h-6 w-20 rounded bg-white/[0.06]" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b border-white/[0.06] pb-px">
          <div className="h-10 w-32 rounded-t-lg bg-white/[0.06]" />
          <div className="h-10 w-32 rounded-t-lg bg-white/[0.03]" />
        </div>

        {/* Tab content skeleton — budget list */}
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 overflow-hidden rounded-xl border border-white/[0.04] bg-[#0B1622] px-5 py-4"
            >
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 rounded bg-white/[0.05]" />
                <div className="h-2.5 w-32 rounded bg-white/[0.03]" />
              </div>
              <div className="hidden h-3 w-20 rounded bg-white/[0.03] sm:block" />
              <div className="h-8 w-24 rounded-lg bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
