"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { MobileInstallPrompt } from "@/components/global/mobile-install-prompt";
import { MobilePullToRefresh } from "@/components/global/mobile-pull-to-refresh";
import TopProgressBar from "@/components/global/top-progress-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={0}>
        <TopProgressBar />
        {children}
        <MobileInstallPrompt />
        <MobilePullToRefresh />
        <ToastContainer position="top-right" autoClose={2500} newestOnTop closeOnClick />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
