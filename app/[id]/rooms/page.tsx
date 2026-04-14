"use client";

import type { ListRoomsResponse, RoomListItem } from "@/api-clients";
import { CreateRoomDialog } from "@/components/global/create-room-dialog";
import { DeleteRoomDialog } from "@/components/global/delete-room-dialog";
import { RoomListItemRow } from "@/components/global/room-list-item";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";
import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PropertyRoomsPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";

  const [roomDialog, setRoomDialog] = useState<{
    open: boolean;
    room: RoomListItem | null;
  }>({ open: false, room: null });
  const [deletingRoom, setDeletingRoom] = useState<RoomListItem | null>(null);

  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  function openCreate() {
    setRoomDialog({ open: true, room: null });
  }

  function openEdit(room: RoomListItem) {
    setRoomDialog({ open: true, room });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            Bookable units for this property — add rooms, suites, or beds.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={!propertyId}>
          <PlusIcon data-icon="inline-start" />
          New room
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        {roomsQuery.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading rooms...</p>
        ) : roomsQuery.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{roomsQuery.error.message}</p>
        ) : (roomsQuery.data?.rooms.length ?? 0) === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <p className="text-sm text-muted-foreground">No rooms yet.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              Add your first room
            </Button>
          </div>
        ) : (
          <ul className="list-none">
            {roomsQuery.data?.rooms.map((room) => (
              <RoomListItemRow
                key={room._id}
                room={room}
                onEdit={openEdit}
                onDelete={setDeletingRoom}
              />
            ))}
          </ul>
        )}
      </section>

      {propertyId ? (
        <>
          <CreateRoomDialog
            propertyId={propertyId}
            open={roomDialog.open}
            room={roomDialog.room}
            onOpenChange={(open) => {
              if (!open) {
                setRoomDialog({ open: false, room: null });
              }
            }}
          />
          <DeleteRoomDialog
            propertyId={propertyId}
            room={deletingRoom}
            open={deletingRoom !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeletingRoom(null);
              }
            }}
          />
        </>
      ) : null}
    </main>
  );
}
