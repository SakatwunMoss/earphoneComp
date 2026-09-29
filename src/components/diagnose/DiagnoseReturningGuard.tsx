"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  clearDiagnoseReturningOnForeignPath,
  isDiagnoseRetainPath,
} from "@/lib/diagnose/persist";

/**
 * 診断・詳細・比較以外のルートに入ったら returning フラグを消す。
 * 「詳細 → ホーム → 診断」で古い結果が復元されるのを防ぐ。
 */
export function DiagnoseReturningGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isDiagnoseRetainPath(pathname)) {
      clearDiagnoseReturningOnForeignPath();
    }
  }, [pathname]);

  return null;
}
