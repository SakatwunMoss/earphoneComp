"use client";

import { useState } from "react";

import { getBrandLogoUrl } from "@/lib/brandLogos";
import { getBrandWordmarkTextClass } from "@/lib/brandWordmark";

type BrandLogoProps = {
  brand: string;
  /** 画像要素の className */
  className?: string;
  /** ロゴ表示領域（コンテナ）の className */
  containerClassName?: string;
};

const DEFAULT_CONTAINER_CLASS =
  "mb-3 flex h-16 w-full shrink-0 items-center justify-center overflow-hidden";
const DEFAULT_IMAGE_CLASS = "max-h-full h-full w-auto max-w-full object-contain";

function BrandWordmark({ brand }: { brand: string }) {
  return (
    <span
      className={`block max-w-full truncate px-1 text-center font-semibold tracking-widest text-gray-500 ${getBrandWordmarkTextClass(brand)}`}
      title={brand}
    >
      {brand}
    </span>
  );
}

export function BrandLogo({
  brand,
  className = DEFAULT_IMAGE_CLASS,
  containerClassName = DEFAULT_CONTAINER_CLASS,
}: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(brand);
  const [failed, setFailed] = useState(false);

  if (!logoUrl?.trim() || failed) {
    return (
      <div className={containerClassName}>
        <BrandWordmark brand={brand} />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 外部 URL / data URI を最適化なしで直接表示 */}
      <img
        src={logoUrl.trim()}
        alt={`${brand} ロゴ`}
        className={className}
        width={160}
        height={64}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
