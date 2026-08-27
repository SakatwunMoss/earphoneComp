import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/about", label: "について" },
  { href: "/privacy-policy", label: "プライバシーポリシー" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-sm font-semibold tracking-tight text-gray-900">
              Earphone Compare
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              イヤホンを比較するサイト
            </p>
          </div>

          <nav
            aria-label="フッターナビゲーション"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"
          >
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-teal-700"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="border-t border-gray-200 pt-4 text-xs text-gray-500">
          © 2026 Earphone Compare
        </p>

        {/* Begin Yahoo! JAPAN Web Services Attribution Snippet */}
        <span style={{ margin: "15px 15px 15px 15px" }}>
          <a
            href="https://developer.yahoo.co.jp/sitemap/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 transition-colors hover:text-teal-700"
          >
            Webサービス by Yahoo! JAPAN
          </a>
        </span>
        {/* End Yahoo! JAPAN Web Services Attribution Snippet */}
      </div>
    </footer>
  );
}
