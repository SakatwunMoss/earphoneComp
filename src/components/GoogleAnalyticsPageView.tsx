"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GoogleAnalyticsPageViewProps = {
  gaId: string;
};

/**
 * App Router のクライアント遷移では gtag('config') が自動再発火しないため、
 * pathname / searchParams の変化に合わせて page_path を送信する。
 * 初回マウントは Script 側の config で計測済みなのでスキップする。
 */
export function GoogleAnalyticsPageView({ gaId }: GoogleAnalyticsPageViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window.gtag !== "function") return;

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", gaId, {
      page_path: pagePath,
    });
  }, [gaId, pathname, searchParams]);

  return null;
}
