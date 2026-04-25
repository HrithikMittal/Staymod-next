"use client";

import { useEffect, useRef, useState } from "react";

const MAX_PULL_DISTANCE = 110;
const REFRESH_THRESHOLD = 72;

export function MobilePullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [armed, setArmed] = useState(false);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    const isCoarsePointer =
      typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (!isCoarsePointer) return;

    function onTouchStart(event: TouchEvent) {
      if (reloadingRef.current) return;
      if (event.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      startYRef.current = event.touches[0]?.clientY ?? 0;
      trackingRef.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!trackingRef.current || reloadingRef.current) return;
      if (window.scrollY > 0) {
        trackingRef.current = false;
        setPullDistance(0);
        setArmed(false);
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        setArmed(false);
        return;
      }

      const normalized = Math.min(MAX_PULL_DISTANCE, delta * 0.5);
      setPullDistance(normalized);
      setArmed(normalized >= REFRESH_THRESHOLD);
      event.preventDefault();
    }

    function onTouchEnd() {
      if (!trackingRef.current || reloadingRef.current) return;
      trackingRef.current = false;

      if (armed) {
        reloadingRef.current = true;
        setPullDistance(REFRESH_THRESHOLD);
        window.setTimeout(() => {
          window.location.reload();
        }, 80);
        return;
      }

      setPullDistance(0);
      setArmed(false);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [armed]);

  if (pullDistance <= 0) return null;

  return (
    <div className="pointer-events-none fixed top-3 left-1/2 z-[70] -translate-x-1/2">
      <div className="rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        {armed ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
