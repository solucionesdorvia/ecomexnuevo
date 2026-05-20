export default function DocumentosLoading() {
  return (
    <div className="relative px-safe pb-8 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[1000px]">
        {/* KPI strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-white/[0.04] bg-[#0B1622] p-4 sm:p-5">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="mt-3 h-8 w-16 rounded-lg bg-white/[0.06]" />
              <div className="mt-2 h-2.5 w-32 rounded bg-white/[0.03]" />
            </div>
          ))}
        </div>

        {/* Document sections skeleton */}
        <div className="mt-10 space-y-10">
          {[0, 1].map((i) => (
            <section key={i}>
              <div className="flex items-center gap-2">
                <div className="h-4 w-48 rounded bg-white/[0.05]" />
                <div className="h-5 w-20 rounded-full bg-white/[0.04]" />
              </div>
              <ul className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                {[0, 1, 2].map((j) => (
                  <li key={j} className="rounded-lg border border-white/[0.04] bg-[#0B1622] px-4 py-3">
                    <div className="h-3.5 w-40 rounded bg-white/[0.05]" />
                    <div className="mt-2 h-2.5 w-56 rounded bg-white/[0.03]" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
