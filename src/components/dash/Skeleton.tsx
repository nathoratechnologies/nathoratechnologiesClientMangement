/** Placeholder shown instantly while a dashboard page loads its data. */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "detail" }) {
  const bar = "animate-pulse rounded-lg bg-white/[0.07]";
  return (
    <div role="status" aria-label="Loading">
      <div className={`${bar} mb-3 h-4 w-32`} />
      <div className={`${bar} mb-8 h-9 w-64`} />
      {variant === "detail" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card h-[65dvh] min-h-[420px] animate-pulse" />
          <div className="space-y-6">
            <div className="card h-56 animate-pulse" />
            <div className="card h-28 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card h-32 animate-pulse" />
            ))}
          </div>
          <div className="card divide-y divide-white/5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 space-y-2">
                  <div className={`${bar} h-4 w-1/2`} />
                  <div className={`${bar} h-3 w-1/3`} />
                </div>
                <div className={`${bar} h-6 w-16 rounded-full`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
