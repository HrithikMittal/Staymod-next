"use client";

import { useApiQuery } from "@/hooks";
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, LoaderIcon } from "lucide-react";

type InboundSyncStatsProps = {
  propertyId: string;
};

export function InboundSyncStats({ propertyId }: InboundSyncStatsProps) {
  const statsQuery = useApiQuery<{
    processed: number;
    pending: number;
    failed: number;
  }>(
    ["inbound-stats", propertyId],
    `/api/properties/${propertyId}/inbound-stats`,
    undefined,
    { enabled: Boolean(propertyId) }
  );

  if (statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (statsQuery.isError) {
    return null; // Silently fail - stats are not critical
  }

  const stats = statsQuery.data || { processed: 0, pending: 0, failed: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Last 30 Days</h3>
        <p className="text-xs text-muted-foreground">
          Email processing statistics
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="size-5" />
            <span className="text-2xl font-bold">{stats.processed}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Imported Successfully
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircleIcon className="size-5" />
            <span className="text-2xl font-bold">{stats.pending}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Failed to Import
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircleIcon className="size-5" />
            <span className="text-2xl font-bold">{stats.failed}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Not Confirmations
          </p>
        </div>
      </div>
    </div>
  );
}
