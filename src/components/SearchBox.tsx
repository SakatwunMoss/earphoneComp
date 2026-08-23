"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search",
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md items-center gap-2"
      role="search"
    >
      <label htmlFor="site-search" className="sr-only">
        検索
      </label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="機種・ブランドを検索"
        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        検索
      </button>
    </form>
  );
}
