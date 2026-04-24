"use client";

import { DownloadIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import type { ListBookingOptionsResponse } from "@/api-clients/booking-options";
import type { ListRoomsResponse } from "@/api-clients/rooms";
import {
  computePurposal,
  defaultPurposalForm,
} from "@/components/global/purposal-builder/calculations";
import { PurposalForm } from "@/components/global/purposal-builder/purposal-form";
import { PurposalPreview } from "@/components/global/purposal-builder/purposal-preview";
import type { PurposalBuilderFormState } from "@/components/global/purposal-builder/types";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";

type PropertyPurposalBuilderPageProps = {
  propertyId: string;
};

export function PropertyPurposalBuilderPage({ propertyId }: PropertyPurposalBuilderPageProps) {
  const [form, setForm] = useState<PurposalBuilderFormState>(defaultPurposalForm);
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["purposal-rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );
  const bookingOptionsQuery = useApiQuery<ListBookingOptionsResponse>(
    ["purposal-booking-options", propertyId],
    `/api/properties/${propertyId}/booking-options`,
    undefined,
    { enabled: Boolean(propertyId) },
  );
  const rooms = useMemo(
    () => (roomsQuery.data?.rooms ?? []).filter((room) => room.isActive),
    [roomsQuery.data?.rooms],
  );
  const bookingOptions = useMemo(
    () => (bookingOptionsQuery.data?.bookingOptions ?? []).filter((opt) => opt.isActive),
    [bookingOptionsQuery.data?.bookingOptions],
  );
  const computed = useMemo(() => computePurposal(form, rooms, bookingOptions), [form, rooms, bookingOptions]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.roomSelections.length > 0) return prev;
      const firstRoomId = rooms[0]?._id;
      if (!firstRoomId) return prev;
      return { ...prev, roomSelections: [{ roomId: firstRoomId, quantity: 1 }] };
    });
  }, [rooms]);

  async function handleDownload() {
    if (!captureRef.current) return;
    setDownloadPending(true);
    setDownloadError(null);
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `purposal-${propertyId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate image.";
      setDownloadError(`${message} Please try again.`);
    } finally {
      setDownloadPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-3 pb-10 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Purposal builder</h1>
        <p className="text-sm text-muted-foreground">
          Fill the details, compare normal vs B2B pricing, and download a shareable image.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <PurposalForm value={form} onChange={setForm} rooms={rooms} bookingOptions={bookingOptions} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleDownload} disabled={downloadPending}>
              <DownloadIcon data-icon="inline-start" />
              {downloadPending ? "Generating..." : "Download image"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(defaultPurposalForm)}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          </div>
          {roomsQuery.isLoading || bookingOptionsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading rooms and booking options...</p>
          ) : null}
          {roomsQuery.isError ? <p className="text-xs text-destructive">{roomsQuery.error.message}</p> : null}
          {bookingOptionsQuery.isError ? (
            <p className="text-xs text-destructive">{bookingOptionsQuery.error.message}</p>
          ) : null}
          {downloadError ? <p className="text-sm text-destructive">{downloadError}</p> : null}
        </div>
        <div ref={captureRef}>
          <PurposalPreview form={form} computed={computed} />
        </div>
      </div>
    </main>
  );
}
