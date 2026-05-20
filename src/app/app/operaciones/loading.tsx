export default function OperacionesLoading() {
  return (
    <div className="px-safe pb-6 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mx-auto w-full max-w-[1000px] space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-lg bg-white/[0.04]" />
          <div className="h-10 w-36 rounded-xl bg-white/[0.04]" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="h-12 border-b border-white/[0.04] bg-white/[0.02]" />
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-5">
                <div className="h-4 w-24 rounded bg-white/[0.04]" />
                <div className="h-4 flex-1 rounded bg-white/[0.04]" />
                <div className="h-4 w-20 rounded bg-white/[0.04]" />
                <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
                <div className="h-4 w-24 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
