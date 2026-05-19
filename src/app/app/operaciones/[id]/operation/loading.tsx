export default function OperationDetailLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mx-auto max-w-[1100px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded bg-white/[0.03]" />
          <div className="h-3 w-2 rounded bg-white/[0.03]" />
          <div className="h-3 w-20 rounded bg-white/[0.03]" />
          <div className="h-3 w-2 rounded bg-white/[0.03]" />
          <div className="h-3 w-24 rounded bg-white/[0.03]" />
        </div>

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-64 rounded-lg bg-white/[0.04]" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 rounded-full bg-white/[0.03]" />
              <div className="h-4 w-16 rounded bg-white/[0.03]" />
            </div>
            <div className="h-3 w-40 rounded bg-white/[0.03]" />
          </div>
          <div className="h-9 w-32 shrink-0 rounded-lg bg-white/[0.03]" />
        </div>

        {/* Pipeline */}
        <div className="mt-8 h-[72px] rounded-xl bg-white/[0.03]" />

        {/* Main grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="h-4 w-32 rounded bg-white/[0.03]" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03]" />
              ))}
            </div>
            <div className="h-40 rounded-xl bg-white/[0.03]" />
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="h-4 w-20 rounded bg-white/[0.03]" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/[0.04]" />
                  <div className="flex-1 space-y-1.5 pb-6">
                    <div className="h-2.5 w-24 rounded bg-white/[0.03]" />
                    <div className="h-3 w-full rounded bg-white/[0.03]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-28 rounded-xl bg-white/[0.03]" />
            <div className="h-28 rounded-xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
