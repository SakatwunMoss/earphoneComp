"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import { BilingualText } from "@/components/BilingualText";
import { SearchBox } from "@/components/SearchBox";
import { diagnoseCopy, type BilingualCopy } from "@/lib/diagnose/copy";

function SearchBoxFallback() {
  return (
    <div
      className="h-9 w-full max-w-md animate-pulse rounded-xl border border-gray-200 bg-white"
      aria-hidden="true"
      />
  );
}

type NavLink = {
  href: string;
  label: string | BilingualCopy;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "ホーム" },
  { href: "/diagnose", label: diagnoseCopy.nav.label },
  { href: "/columns", label: "コラム" },
  { href: "/about", label: "サイトについて" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isBilingual(label: string | BilingualCopy): label is BilingualCopy {
  return typeof label === "object" && "en" in label && "ja" in label;
}

function NavLabel({
  label,
  active,
}: {
  label: string | BilingualCopy;
  active: boolean;
}) {
  if (isBilingual(label)) {
    return (
      <BilingualText
        copy={label}
        size="xs"
        enClassName={
          active ? "font-medium text-teal-700" : "font-medium text-gray-700"
        }
        jaClassName={active ? "!text-teal-700/75" : "!text-gray-500"}
      />
    );
  }
  return <span>{label}</span>;
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-teal-100/80 bg-teal-50/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
        <Link
          href="/"
          onClick={closeMenu}
          className="shrink-0 text-sm font-semibold tracking-tight text-gray-900 transition-colors hover:text-teal-700 sm:text-base"
        >
          Earphone Compare
        </Link>

        <nav
          aria-label="メインナビゲーション"
          className="hidden items-center gap-5 md:flex"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`transition-colors ${
                  isBilingual(label)
                    ? ""
                    : `text-sm ${
                        active
                          ? "font-medium text-teal-700"
                          : "text-gray-700 hover:text-teal-700"
                      }`
                }`}
                aria-current={active ? "page" : undefined}
              >
                <NavLabel label={label} active={active} />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden min-w-0 w-full max-w-md md:block">
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/80 text-gray-700 transition-colors hover:border-teal-300 hover:text-teal-700 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">
            {menuOpen ? "メニューを閉じる" : "メニューを開く"}
          </span>
          {menuOpen ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="border-t border-teal-100/80 px-6 py-3 md:hidden">
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="モバイルナビゲーション"
          className="border-t border-teal-100/80 px-6 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMenu}
                    className={`block rounded-xl px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-teal-100/70"
                        : "hover:bg-teal-100/60"
                    } ${
                      isBilingual(label)
                        ? ""
                        : `text-sm ${
                            active
                              ? "font-medium text-teal-700"
                              : "text-gray-700 hover:text-teal-700"
                          }`
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavLabel label={label} active={active} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
