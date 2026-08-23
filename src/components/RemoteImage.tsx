"use client";

/**
 * 外部 URL をそのまま <img> で表示するコンポーネント。
 * next/image は使用しない（next.config の images.domains / remotePatterns 設定不要）。
 *
 * 注意: 通常の <img> でも、参照元サイトの CORS ポリシーや hotlink 防止設定により
 * 画像が表示できない場合があります（onError でプレースホルダーにフォールバック）。
 */
import { useState } from "react";

import { ImagePlaceholder } from "@/components/ImagePlaceholder";

type RemoteImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderClassName?: string;
  placeholderLabel?: string;
};

function hasImageSrc(src: string | null | undefined): src is string {
  return Boolean(src?.trim());
}

export function RemoteImage({
  src,
  alt,
  className = "",
  width,
  height,
  placeholderClassName,
  placeholderLabel,
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!hasImageSrc(src) || failed) {
    return (
      <ImagePlaceholder
        alt={alt}
        className={placeholderClassName ?? className}
        label={placeholderLabel}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 外部 URL を最適化なしで直接表示
    <img
      src={src.trim()}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
}
