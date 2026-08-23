export function EarphoneListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="hidden w-full max-w-xs shrink-0 animate-pulse rounded-xl border border-gray-200 bg-teal-50/40 p-4 lg:block">
        <div className="mb-6 h-4 w-20 rounded bg-teal-100" />
        <div className="space-y-3">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="h-4 w-4/6 rounded bg-gray-200" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-10 w-full rounded-xl bg-gray-200" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 w-14 rounded bg-gray-200" />
          <div className="h-10 w-full rounded-xl bg-gray-200" />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="h-10 w-full animate-pulse rounded-xl bg-teal-50 lg:hidden" />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: count }, (_, index) => (
            <li
              key={index}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 h-5 w-3/4 rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-3.5 w-1/2 rounded bg-gray-100" />
                <div className="h-3.5 w-2/3 rounded bg-gray-100" />
                <div className="h-3.5 w-1/3 rounded bg-gray-100" />
              </div>
              <div className="mt-4 h-8 w-full rounded bg-gray-50" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
