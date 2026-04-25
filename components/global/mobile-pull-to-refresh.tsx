"use client";

import { useEffect, useRef, useState } from "react";

const MAX_PULL_DISTANCE = 110;
const REFRESH_THRESHOLD = 72;

export function MobilePullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [armed, setArmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const reloadingRef = useRef(false);
  const armedRef = useRef(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const desktopDebugEnabled = new URLSearchParams(window.location.search).get("ptr-debug") === "1";
    const allowTouch = isCoarsePointer;
    const allowDesktopPointer = !isCoarsePointer && desktopDebugEnabled;
    if (!allowTouch && !allowDesktopPointer) return;

    function applyOffset(distance: number) {
      const offset = Math.round(Math.min(100, distance * 0.35));
      if (offsetRef.current === offset) return;
      offsetRef.current = offset;
      document.body.style.transform = offset > 0 ? `translateY(${offset}px)` : "";
    }

    function resetOffset() {
      offsetRef.current = 0;
      document.body.style.transform = "";
    }

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
        applyOffset(0);
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        setArmed(false);
        applyOffset(0);
        return;
      }

      const normalized = Math.min(MAX_PULL_DISTANCE, delta * 0.5);
      setPullDistance(normalized);
      applyOffset(normalized);
      const isArmed = normalized >= REFRESH_THRESHOLD;
      armedRef.current = isArmed;
      setArmed(isArmed);
      event.preventDefault();
    }

    function onTouchEnd() {
      if (!trackingRef.current || reloadingRef.current) return;
      trackingRef.current = false;

      if (armedRef.current) {
        reloadingRef.current = true;
        setRefreshing(true);
        setPullDistance(REFRESH_THRESHOLD);
        applyOffset(REFRESH_THRESHOLD);
        window.location.reload();
        return;
      }

      setPullDistance(0);
      setArmed(false);
      armedRef.current = false;
      resetOffset();
    }

    function onPointerDown(event: PointerEvent) {
      if (!allowDesktopPointer) return;
      if (reloadingRef.current || event.pointerType !== "mouse") return;
      if (window.scrollY > 0) return;
      startYRef.current = event.clientY;
      trackingRef.current = true;
    }

    function onPointerMove(event: PointerEvent) {
      if (!allowDesktopPointer) return;
      if (!trackingRef.current || reloadingRef.current || event.pointerType !== "mouse") return;
      if (window.scrollY > 0) {
        trackingRef.current = false;
        setPullDistance(0);
        setArmed(false);
        armedRef.current = false;
        applyOffset(0);
        return;
      }
      const delta = event.clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        setArmed(false);
        armedRef.current = false;
        applyOffset(0);
        return;
      }
      const normalized = Math.min(MAX_PULL_DISTANCE, delta * 0.45);
      const isArmed = normalized >= REFRESH_THRESHOLD;
      setPullDistance(normalized);
      applyOffset(normalized);
      setArmed(isArmed);
      armedRef.current = isArmed;
    }

    function onPointerUp(event: PointerEvent) {
      if (!allowDesktopPointer || event.pointerType !== "mouse") return;
      onTouchEnd();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    return () => {
      resetOffset();
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (pullDistance <= 0) return null;

  return (
    <div className="pointer-events-none fixed top-3 left-1/2 z-[70] -translate-x-1/2">
      <div className="rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        {refreshing ? "Refreshing..." : armed ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
