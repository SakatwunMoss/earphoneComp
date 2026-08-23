import { EarphoneListSkeleton } from "@/components/EarphoneListSkeleton";

export default function SearchLoading() {
  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <div className="mb-6 h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mb-2 h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mb-8 h-4 w-20 animate-pulse rounded bg-gray-100" />
        <EarphoneListSkeleton />
      </main>
    </div>
  );
}
