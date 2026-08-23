import type { Metadata } from "next";

export const SITE_URL = new URL("https://earphone-compare.vercel.app");
export const SITE_NAME = "Earphone Compare";
export const SITE_TITLE = "イヤホン比較サイト | Earphone Compare";
export const SITE_DESCRIPTION =
  "ブランドごとに登録機種を一覧できます。気になるメーカーを選んでイヤホンを比較してください。";
export const OG_IMAGE_PATH = "/images/og-image.jpg";

export function createPageMetadata(options: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const description = options.description ?? SITE_DESCRIPTION;
  const url = options.path ? new URL(options.path, SITE_URL) : SITE_URL;
  const fullTitle = `${options.title} | ${SITE_NAME}`;

  return {
    title: options.title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
      images: [OG_IMAGE_PATH],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}
