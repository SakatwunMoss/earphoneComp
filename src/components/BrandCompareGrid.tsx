"use client";

import { useCallback, useEffect, useState } from "react";

import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { EarphoneGrid } from "@/components/EarphoneGrid";
import type { Earphone } from "@/types/database";

const MAX_COMPARE = 3;

type BrandCompareGridProps = {
  brand: string;
  earphones: Earphone[];
};

export function BrandCompareGrid({ brand, earphones }: BrandCompareGridProps) {
  const [selected, setSelected] = useState<Earphone[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!limitMessage) {
      return;
    }
    const timer = window.setTimeout(() => setLimitMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [limitMessage]);

  const toggleSelection = useCallback((earphone: Earphone) => {
    setSelected((current) => {
      const isSelected = current.some((item) => item.id === earphone.id);
      if (isSelected) {
        return current.filter((item) => item.id !== earphone.id);
      }
      if (current.length >= MAX_COMPARE) {
        setLimitMessage("比較は3機種まで選択できます");
        return current;
      }
      return [...current, earphone];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelected((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  return (
    <>
      {limitMessage ? (
        <p
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {limitMessage}
        </p>
      ) : null}

      <EarphoneGrid
        earphones={earphones}
        compare={{
          selectedIds: selected.map((item) => item.id),
          onToggle: toggleSelection,
        }}
      />

      <CompareFloatingBar
        brand={brand}
        selected={selected.map((item) => ({
          id: item.id,
          name: item.name,
        }))}
        onRemove={removeSelection}
        onClear={clearSelection}
      />

      {selected.length > 0 ? (
        <div className="h-28 sm:h-24" aria-hidden="true" />
      ) : null}
    </>
  );
}
