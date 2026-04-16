"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon, Trash2Icon, UserIcon } from "lucide-react";
import { FormEvent, useState } from "react";

import type { BookingListItem, CreateBookingPayload } from "@/api-clients/bookings";
import { createBooking, updateBooking } from "@/api-clients/bookings";
import type { RoomListItem } from "@/api-clients/rooms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BOOKING_STATUSES } from "@/types/booking";
import { calculateBookingAmount, calculateNightsCount, formatMoney } from "@/utils/booking-pricing";

const EMPTY: CreateBookingPayload = {
  roomId: "",
  guestName: "",
  guestEmail: "",
  checkIn: "",
  checkOut: "",
  quantity: 1,
  advanceAmount: 0,
  status: "confirmed",
};

function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function initialFormFromBooking(booking: BookingListItem): CreateBookingPayload {
  const firstRoomId = Object.keys(booking.rooms)[0] ?? "";
  const firstRoom = firstRoomId ? booking.rooms[firstRoomId] : undefined;
  return {
    roomId: firstRoomId,
    rooms: Object.fromEntries(
      Object.entries(booking.rooms).map(([roomId, row]) => [
        roomId,
        { quantity: row.quantity, roomNumbers: row.roomNumbers },
      ]),
    ),
    guestName: booking.guestName,
    guestEmail: booking.guestEmail ?? "",
    checkIn: isoDateOnly(booking.checkIn),
    checkOut: isoDateOnly(booking.checkOut),
    quantity: firstRoom?.quantity ?? 1,
    roomNumbers: firstRoom?.roomNumbers,
    advanceAmount: booking.advanceAmount ?? 0,
    status: booking.status as CreateBookingPayload["status"],
  };
}

function initialFormForCreate(rooms: RoomListItem[]): CreateBookingPayload {
  return {
    ...EMPTY,
    roomId: rooms[0]?._id ?? "",
  };
}

type CreateBookingDialogProps = {
  propertyId: string;
  rooms: RoomListItem[];
  existingBookings?: BookingListItem[];
  /** When true and `rooms` is still empty, show a loading state instead of the form. */
  roomsLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: BookingListItem | null;
  initialFormOverride?: Partial<CreateBookingPayload> | null;
};

export function CreateBookingDialog({
  propertyId,
  rooms,
  existingBookings = [],
  roomsLoading = false,
  open,
  onOpenChange,
  booking = null,
  initialFormOverride = null,
}: CreateBookingDialogProps) {
  const isEdit = Boolean(booking);
  /** Remount edit form when booking data changes; create form mounts once rooms are ready. */
  const roomsKey = rooms.map((r) => r._id).join("|");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  const waitingForRooms = !booking && roomsLoading && rooms.length === 0;
  const noRoomsYet = !booking && !roomsLoading && rooms.length === 0;
  const canShowForm = Boolean(booking) || rooms.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          "rounded-2xl ring-1 ring-foreground/8",
        )}
        showCloseButton
      >
        <DialogTitle className="sr-only">{isEdit ? "Edit booking" : "New booking"}</DialogTitle>
        {open && waitingForRooms ? (
          <div className="px-6 pt-10 pb-8 pr-12">
            <p className="text-sm text-muted-foreground">Loading rooms…</p>
          </div>
        ) : null}
        {open && noRoomsYet ? (
          <div className="px-6 pt-10 pb-8 pr-12">
            <p className="text-sm text-muted-foreground">
              Add at least one active room before creating a booking.
            </p>
          </div>
        ) : null}
        {open && canShowForm ? (
          <BookingForm
            key={
              booking
                ? `${booking._id}-${booking.updatedAt}`
                : `new-${roomsKey}-${JSON.stringify(initialFormOverride ?? {})}`
            }
            propertyId={propertyId}
            rooms={rooms}
            existingBookings={existingBookings}
            booking={booking}
            onClose={() => handleOpenChange(false)}
            initialForm={
              booking
                ? initialFormFromBooking(booking)
                : { ...initialFormForCreate(rooms), ...(initialFormOverride ?? {}) }
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type BookingFormProps = {
  propertyId: string;
  rooms: RoomListItem[];
  existingBookings: BookingListItem[];
  booking: BookingListItem | null;
  initialForm: CreateBookingPayload;
  onClose: () => void;
};

type RoomSelection = {
  roomId: string;
  quantity: number;
  roomNumbers?: string[];
};

function initialRoomSelections(initialForm: CreateBookingPayload): RoomSelection[] {
  if (initialForm.rooms && Object.keys(initialForm.rooms).length > 0) {
    return Object.entries(initialForm.rooms).map(([roomId, row]) => ({
      roomId,
      quantity: row.quantity,
      roomNumbers: row.roomNumbers,
    }));
  }
  return [
    {
      roomId: initialForm.roomId ?? "",
      quantity: initialForm.quantity ?? 1,
      roomNumbers: initialForm.roomNumbers,
    },
  ];
}

function normalizeRoomSelections(selections: RoomSelection[]): RoomSelection[] {
  return selections
    .filter((s) => Boolean(s.roomId))
    .map((s) => ({
      roomId: s.roomId,
      quantity: Math.max(1, s.quantity || 1),
      roomNumbers: (s.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean),
    }));
}

function hasDuplicateRoomSelections(selections: RoomSelection[]): boolean {
  const ids = normalizeRoomSelections(selections).map((s) => s.roomId);
  return new Set(ids).size !== ids.length;
}

function isOverlappingRange(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a1 = new Date(aStart).getTime();
  const a2 = new Date(aEnd).getTime();
  const b1 = new Date(bStart).getTime();
  const b2 = new Date(bEnd).getTime();
  if ([a1, a2, b1, b2].some((v) => Number.isNaN(v))) {
    return false;
  }
  return a1 < b2 && b1 < a2;
}

function BookingForm({
  propertyId,
  rooms,
  existingBookings,
  booking,
  initialForm,
  onClose,
}: BookingFormProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(booking);
  const [form, setForm] = useState<Omit<CreateBookingPayload, "roomId" | "quantity">>({
    guestName: initialForm.guestName,
    guestEmail: initialForm.guestEmail,
    checkIn: initialForm.checkIn,
    checkOut: initialForm.checkOut,
    advanceAmount: initialForm.advanceAmount ?? 0,
    status: initialForm.status,
  });
  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>(() =>
    initialRoomSelections(initialForm),
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedSelections = normalizeRoomSelections(roomSelections);
      if (normalizedSelections.length === 0) {
        throw new Error("Select at least one room type.");
      }
      if (hasDuplicateRoomSelections(normalizedSelections)) {
        throw new Error("Each room type can only be selected once.");
      }

      const payloadBase = {
        ...form,
        guestEmail: form.guestEmail?.trim() || undefined,
        advanceAmount: Math.max(0, Number(form.advanceAmount) || 0),
        status: form.status ?? "confirmed",
      } satisfies Omit<CreateBookingPayload, "roomId" | "quantity" | "rooms" | "roomNumbers">;

      const rooms = Object.fromEntries(
        normalizedSelections.map((selection) => [
          selection.roomId,
          {
            quantity: selection.quantity,
            roomNumbers: selection.roomNumbers,
          },
        ]),
      );

      const payload: CreateBookingPayload = {
        ...payloadBase,
        rooms,
      };

      if (booking) {
        return updateBooking(propertyId, booking._id, payload);
      }
      return createBooking(propertyId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookings", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["room-availability", propertyId] });
      onClose();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  const field = cn(
    "rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
  );

  function suggestRoomNumbers(
    roomId: string,
    quantity: number,
    checkIn: string,
    checkOut: string,
  ): string[] {
    const room = rooms.find((r) => r._id === roomId);
    const configured = (room?.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean);
    if (configured.length === 0) {
      return [];
    }

    const taken = new Set<string>();
    for (const b of existingBookings) {
      if (b.status === "cancelled") continue;
      if (booking && b._id === booking._id) continue;
      if (!isOverlappingRange(checkIn, checkOut, b.checkIn, b.checkOut)) continue;

      const mapped = b.rooms?.[roomId]?.roomNumbers ?? [];
      for (const n of mapped) {
        if (n) taken.add(n);
      }
    }

    return configured.filter((n) => !taken.has(n)).slice(0, Math.max(1, quantity));
  }

  function updateRoomSelection(index: number, patch: Partial<RoomSelection>) {
    setRoomSelections((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, ...patch } : row));
      const row = next[index];
      if (row?.roomId) {
        row.roomNumbers = suggestRoomNumbers(row.roomId, row.quantity, form.checkIn, form.checkOut);
      }
      return [...next];
    });
  }

  function addRoomSelection() {
    const roomId = rooms[0]?._id ?? "";
    setRoomSelections((prev) => [
      ...prev,
      {
        roomId,
        quantity: 1,
        roomNumbers: suggestRoomNumbers(roomId, 1, form.checkIn, form.checkOut),
      },
    ]);
  }

  function removeRoomSelection(index: number) {
    setRoomSelections((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const hasDuplicateSelections = hasDuplicateRoomSelections(roomSelections);
  const roomById = new Map(rooms.map((room) => [room._id, room]));
  const nights = calculateNightsCount(form.checkIn, form.checkOut);
  const estimatedAmount =
    form.status === "cancelled"
      ? 0
      : roomSelections.reduce((sum, selection) => {
          const room = roomById.get(selection.roomId);
          return (
            sum +
            calculateBookingAmount(form.checkIn, form.checkOut, selection.quantity, {
              priceWeekday: room?.priceWeekday,
              priceWeekend: room?.priceWeekend,
            })
          );
        }, 0);
  const advanceAmount = Math.max(0, Number(form.advanceAmount) || 0);
  const remainingAmount = Math.max(0, estimatedAmount - advanceAmount);
  const roomBreakdown = roomSelections
    .filter((selection) => selection.roomId)
    .map((selection) => {
      const room = roomById.get(selection.roomId);
      const subtotal = calculateBookingAmount(form.checkIn, form.checkOut, selection.quantity, {
        priceWeekday: room?.priceWeekday,
        priceWeekend: room?.priceWeekend,
      });
      return {
        key: selection.roomId,
        label: room?.name ?? "Room",
        quantity: selection.quantity,
        subtotal,
      };
    });

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>
      <div className="border-border/60 border-b px-6 pt-10 pb-4 pr-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {isEdit ? "Bookings · Edit" : "Bookings · New"}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground"
            aria-hidden
          >
            <UserIcon className="size-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="booking-guest">Guest name</Label>
              <Input
                id="booking-guest"
                value={form.guestName}
                onChange={(ev) => setForm((p) => ({ ...p, guestName: ev.target.value }))}
                className={field}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-email">Email (optional)</Label>
              <Input
                id="booking-email"
                type="email"
                value={form.guestEmail ?? ""}
                onChange={(ev) =>
                  setForm((p) => ({ ...p, guestEmail: ev.target.value || undefined }))
                }
                className={field}
                autoComplete="email"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[min(60vh,480px)] overflow-y-auto px-6 py-4 pr-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Room type(s)</Label>
              {!isEdit ? (
                <Button type="button" variant="ghost" size="sm" onClick={addRoomSelection}>
                  <PlusIcon className="size-4" />
                  Add room type
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              {roomSelections.map((selection, index) => (
                <div key={`room-row-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <select
                    required
                    value={selection.roomId}
                    onChange={(ev) => updateRoomSelection(index, { roomId: ev.target.value })}
                    className={cn(field, "w-full cursor-pointer")}
                    disabled={rooms.length === 0}
                  >
                    <option value="">Select a room</option>
                    {rooms.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={selection.quantity}
                    onChange={(ev) =>
                      updateRoomSelection(index, {
                        quantity: Math.max(1, Number.parseInt(ev.target.value, 10) || 1),
                      })
                    }
                    className={cn(field, "w-20")}
                  />
                  {!isEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRoomSelection(index)}
                      disabled={roomSelections.length <= 1}
                      aria-label="Remove room row"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                  <Input
                    placeholder="Auto-assigned room number(s)"
                    value={(selection.roomNumbers ?? []).join(", ")}
                    readOnly
                    className={cn(field, "col-span-3")}
                  />
                </div>
              ))}
            </div>
            {rooms.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Add at least one active room before creating a booking.
              </p>
            ) : null}
            {hasDuplicateSelections ? (
              <p className="text-xs text-destructive">Room types must be unique in one submission.</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="booking-in" className="inline-flex items-center gap-1">
                <CalendarIcon className="size-3.5 opacity-70" aria-hidden />
                Check-in
              </Label>
              <Input
                id="booking-in"
                type="date"
                required
                value={form.checkIn}
                onChange={(ev) => {
                  const nextCheckIn = ev.target.value;
                  setForm((p) => ({ ...p, checkIn: nextCheckIn }));
                  setRoomSelections((prev) =>
                    prev.map((row) => ({
                      ...row,
                      roomNumbers: row.roomId
                        ? suggestRoomNumbers(row.roomId, row.quantity, nextCheckIn, form.checkOut)
                        : [],
                    })),
                  );
                }}
                className={field}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-out">Check-out</Label>
              <Input
                id="booking-out"
                type="date"
                required
                value={form.checkOut}
                onChange={(ev) => {
                  const nextCheckOut = ev.target.value;
                  setForm((p) => ({ ...p, checkOut: nextCheckOut }));
                  setRoomSelections((prev) =>
                    prev.map((row) => ({
                      ...row,
                      roomNumbers: row.roomId
                        ? suggestRoomNumbers(row.roomId, row.quantity, form.checkIn, nextCheckOut)
                        : [],
                    })),
                  );
                }}
                className={field}
              />
            </div>
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="booking-status">Status</Label>
              <select
                id="booking-status"
                value={form.status ?? "confirmed"}
                onChange={(ev) =>
                  setForm((p) => ({
                    ...p,
                    status: ev.target.value as CreateBookingPayload["status"],
                  }))
                }
                className={cn(field, "w-full cursor-pointer")}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "Select valid dates"} ·
              Estimated amount
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{formatMoney(estimatedAmount)}</p>
            {roomBreakdown.length > 0 ? (
              <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                {roomBreakdown.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2 text-xs">
                    <p className="text-muted-foreground">
                      {row.label} × {row.quantity}
                    </p>
                    <p className="font-medium text-foreground">{formatMoney(row.subtotal)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="booking-advance">Advance amount</Label>
              <Input
                id="booking-advance"
                type="number"
                min={0}
                step="0.01"
                value={form.advanceAmount ?? 0}
                onChange={(ev) =>
                  setForm((p) => ({
                    ...p,
                    advanceAmount: Math.max(0, Number.parseFloat(ev.target.value) || 0),
                  }))
                }
                className={field}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-remaining">Remaining amount</Label>
              <Input
                id="booking-remaining"
                value={formatMoney(remainingAmount)}
                className={field}
                readOnly
              />
            </div>
          </div>

          {saveMutation.error ? (
            <p className="text-sm text-destructive">{saveMutation.error.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-border/60 bg-background/95 px-5 py-2.5 supports-[backdrop-filter]:bg-background/80">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={saveMutation.isPending || (!isEdit && rooms.length === 0) || hasDuplicateSelections}
        >
          {saveMutation.isPending ? "Saving…" : isEdit ? "Save" : "Create bookings"}
        </Button>
      </div>
    </form>
  );
}
