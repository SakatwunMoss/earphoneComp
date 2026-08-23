"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputId = useId();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

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
      <label htmlFor={inputId} className="sr-only">
        検索
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="機種・ブランドを検索"
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500 transition-colors hover:text-teal-700"
          aria-label="検索"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
