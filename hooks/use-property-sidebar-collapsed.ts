"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "staymod-property-sidebar-collapsed";

export function usePropertySidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      queueMicrotask(() => {
        if (stored === "1") setCollapsedState(true);
        setHydrated(true);
      });
    } catch {
      queueMicrotask(() => setHydrated(true));
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((c) => !c);
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed };
}
