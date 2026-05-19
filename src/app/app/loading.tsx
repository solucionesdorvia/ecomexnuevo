export default function AppLoading() {
  return (
    <div className="relative px-safe pb-6 pt-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="h-[100px] rounded-2xl bg-white/[0.03]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[88px] rounded-xl bg-white/[0.03]" />
          ))}
        </div>
        <div className="mt-10 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}
