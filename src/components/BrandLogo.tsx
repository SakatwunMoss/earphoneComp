"use client";

import { RemoteImage } from "@/components/RemoteImage";
import { getBrandLogoUrl } from "@/lib/brand-logos";

type BrandLogoProps = {
  brand: string;
  /** 画像要素の className */
  className?: string;
  /** ロゴ表示領域（コンテナ）の className */
  containerClassName?: string;
};

const DEFAULT_CONTAINER_CLASS =
  "mb-3 flex h-16 w-full shrink-0 items-center justify-center overflow-hidden";
const DEFAULT_IMAGE_CLASS = "max-h-full w-auto max-w-full object-contain";

const DEFAULT_PLACEHOLDER_CLASS =
  "flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-500";

export function BrandLogo({
  brand,
  className = DEFAULT_IMAGE_CLASS,
  containerClassName = DEFAULT_CONTAINER_CLASS,
}: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(brand);

  return (
    <div className={containerClassName}>
      <RemoteImage
        src={logoUrl}
        alt={`${brand} ロゴ`}
        className={className}
        width={160}
        height={64}
        placeholderClassName={DEFAULT_PLACEHOLDER_CLASS}
        placeholderLabel={brand.slice(0, 1)}
      />
    </div>
  );
}
