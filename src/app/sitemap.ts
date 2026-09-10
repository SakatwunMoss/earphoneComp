import type { MetadataRoute } from "next";

import { brandPagePath, earphonePagePath } from "@/lib/brand-url";
import { getAllEarphones } from "@/lib/earphones-data";
import { SITE_URL } from "@/lib/site-metadata";

function latestDate(dates: string[]): Date | undefined {
  if (dates.length === 0) {
    return undefined;
  }
  return new Date(dates.reduce((a, b) => (a > b ? a : b)));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.origin;
  const earphones = getAllEarphones();

  const brandUpdatedAt = new Map<string, string[]>();
  for (const row of earphones) {
    const list = brandUpdatedAt.get(row.brand) ?? [];
    list.push(row.updated_at);
    brandUpdatedAt.set(row.brand, list);
  }

  const allUpdated = earphones.map((row) => row.updated_at);
  const homeLastMod = latestDate(allUpdated);

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: homeLastMod,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const [brand, dates] of [...brandUpdatedAt.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  )) {
    entries.push({
      url: `${base}${brandPagePath(brand)}`,
      lastModified: latestDate(dates),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const row of earphones) {
    entries.push({
      url: `${base}${earphonePagePath(row.brand, row.id)}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
