"use client";

import type { HealthResponse } from "@/api-clients";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";

export default function Home() {
  const health = useApiQuery<HealthResponse>(["health"], "/api/health");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Staymod</h1>
        <p className="mt-2 text-muted-foreground">
          Clerk authentication, organizations, TanStack Query, and MongoDB are wired for
          development.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-6 py-4 text-sm">
        <p className="text-muted-foreground">API health</p>
        {health.isLoading ? (
          <p>Checking…</p>
        ) : health.isError ? (
          <p className="text-destructive">{health.error.message}</p>
        ) : (
          <pre className="text-left text-xs">
            {JSON.stringify(health.data, null, 2)}
          </pre>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => health.refetch()}
        >
          Refresh
        </Button>
      </div>
    </main>
  );
}
