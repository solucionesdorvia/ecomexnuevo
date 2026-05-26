export default function NuevaLoading() {
  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="relative mx-auto w-full max-w-[780px]">
        {/* Stepper skeleton */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white/[0.06]" />
              {i < 2 && <div className="h-px w-12 bg-white/[0.04]" />}
            </div>
          ))}
        </div>

        {/* Chat container skeleton */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
          {/* Messages area */}
          <div className="space-y-4 p-5">
            {/* Assistant message */}
            <div className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-[#18C3D6]/[0.12]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-[80%] rounded bg-white/[0.05]" />
                <div className="h-3 w-[60%] rounded bg-white/[0.04]" />
                <div className="h-3 w-[70%] rounded bg-white/[0.03]" />
              </div>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 border-t border-white/[0.04] px-5 py-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-28 rounded-full bg-white/[0.04]" />
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-white/[0.04] p-4">
            <div className="h-12 rounded-xl bg-white/[0.04]" />
            <div className="mt-2 flex items-center justify-between">
              <div className="h-6 w-24 rounded bg-white/[0.03]" />
              <div className="h-9 w-24 rounded-lg bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
