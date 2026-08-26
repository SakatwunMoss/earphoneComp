import type { Metadata } from "next";

/** 本番ベース URL。NEXT_PUBLIC_SITE_URL があれば優先 */
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://earphone-comp.vercel.app",
);
export const SITE_NAME = "Earphone Compare";
export const SITE_TITLE = "イヤホン比較サイト | Earphone Compare";
export const SITE_DESCRIPTION =
  "ブランドごとに登録機種を一覧できます。気になるメーカーを選んでイヤホンを比較してください。";
export const OG_IMAGE_PATH = "/images/og-image.jpg";

/** OGP / Twitter Card 用。実ファイルは 1584×672 JPEG */
export const OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1584,
  height: 672,
  alt: SITE_TITLE,
  type: "image/jpeg",
} as const;

export function createPageMetadata(options: {
  title: string;
  description?: string;
  /** クエリなしのパス（例: /brands/Sony）。canonical / OGP の正準 URL に使う */
  path?: string;
}): Metadata {
  const description = options.description ?? SITE_DESCRIPTION;
  const canonicalPath = options.path ?? "/";
  const url = new URL(canonicalPath, SITE_URL);
  const fullTitle = `${options.title} | ${SITE_NAME}`;

  return {
    title: options.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}
