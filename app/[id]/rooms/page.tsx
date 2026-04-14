"use client";

import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import type { ListRoomsResponse } from "@/api-clients";
import { CreateRoomDialog } from "@/components/global/create-room-dialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";

export default function PropertyRoomsPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const [createOpen, setCreateOpen] = useState(false);

  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            Bookable units for this property — add rooms, suites, or beds.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} disabled={!propertyId}>
          <PlusIcon data-icon="inline-start" />
          New room
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {roomsQuery.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading rooms...</p>
        ) : roomsQuery.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{roomsQuery.error.message}</p>
        ) : (roomsQuery.data?.rooms.length ?? 0) === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <p className="text-sm text-muted-foreground">No rooms yet.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              Add your first room
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/80">
            {roomsQuery.data?.rooms.map((room) => (
              <li
                key={room._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{room.name}</p>
                  {room.tagline ? (
                    <p className="text-sm text-muted-foreground">{room.tagline}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {room.type.replace(/_/g, " ")}
                    {room.floor ? ` · Floor ${room.floor}` : ""}
                    {` · Up to ${room.maxGuests} guest${room.maxGuests === 1 ? "" : "s"}`}
                    {(room.bedSize ?? room.bedSummary)
                      ? ` · ${room.bedSize ?? room.bedSummary}`
                      : ""}
                  </p>
                  {(room.priceWeekday != null || room.priceWeekend != null) && (
                    <p className="text-xs text-muted-foreground">
                      {room.priceWeekday != null && (
                        <span>Weekday {room.priceWeekday}</span>
                      )}
                      {room.priceWeekday != null && room.priceWeekend != null ? " · " : null}
                      {room.priceWeekend != null && (
                        <span>Weekend {room.priceWeekend}</span>
                      )}
                    </p>
                  )}
                  {room.amenities?.length ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {room.amenities.join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {room.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {propertyId ? (
        <CreateRoomDialog
          propertyId={propertyId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </main>
  );
}
