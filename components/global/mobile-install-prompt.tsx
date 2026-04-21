"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DISMISS_KEY = "staymod-install-prompt-dismissed-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMatch || iosStandalone;
}

function detectMobilePlatform() {
  if (typeof navigator === "undefined") {
    return { isMobile: false, isIos: false, isAndroid: false, isSafari: false };
  }
  const ua = navigator.userAgent;
  // iPadOS can report a desktop-like UA, so also check touch-capable Mac.
  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/i.test(ua) || isTouchMac;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIos || isAndroid;
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
  return { isMobile, isIos, isAndroid, isSafari };
}

export function MobileInstallPrompt() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"android" | "android_manual" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const { isMobile, isIos, isAndroid } = detectMobilePlatform();
    if (!isMobile) return;

    if (isIos) {
      setMode("ios");
      setOpen(true);
    }

    let androidFallbackTimer: number | null = null;
    if (isAndroid) {
      androidFallbackTimer = window.setTimeout(() => {
        if (window.localStorage.getItem(DISMISS_KEY) === "1" || isStandaloneMode()) return;
        // Fallback when beforeinstallprompt is unavailable (common without full PWA setup).
        setMode((prev) => prev ?? "android_manual");
        setOpen((prev) => prev || true);
      }, 1200);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1" || isStandaloneMode()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode("android");
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (androidFallbackTimer != null) {
        window.clearTimeout(androidFallbackTimer);
      }
    };
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setOpen(false);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DISMISS_KEY, "1");
        }
        setOpen(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Staymod to home screen</DialogTitle>
          <DialogDescription>
            {mode === "android"
              ? "Install the app for a faster full-screen experience."
              : mode === "android_manual"
                ? "Open your browser menu and choose 'Add to Home screen' (or 'Install app')."
              : "Open Share in Safari, then tap 'Add to Home Screen' to install this app."}
          </DialogDescription>
        </DialogHeader>
        {mode === "ios" ? (
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Tap the Share icon in Safari.</li>
            <li>Select "Add to Home Screen".</li>
            <li>Tap Add.</li>
          </ol>
        ) : mode === "android_manual" ? (
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Tap the browser menu (three dots).</li>
            <li>Select "Add to Home screen" or "Install app".</li>
            <li>Confirm install.</li>
          </ol>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            Not now
          </Button>
          {mode === "android" ? (
            <Button type="button" onClick={() => void installAndroid()} disabled={installing}>
              {installing ? "Installing..." : "Install app"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
