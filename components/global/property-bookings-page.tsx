"use client";

import type { BookingListItem, ListBookingsResponse } from "@/api-clients/bookings";
import { resendConfirmationEmail, updateBooking } from "@/api-clients/bookings";
import { BookingDetailsDialog } from "@/components/global/booking-details-dialog";
import type { ListRoomsResponse, RoomListItem } from "@/api-clients/rooms";
import { BookingListItemRow } from "@/components/global/booking-list-item";
import { CreateBookingDialog } from "@/components/global/create-booking-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks";
import { PlusIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { calculateBookingAmount } from "@/utils/booking-pricing";

export function PropertyBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = typeof params.id === "string" ? params.id : "";

  const [dialog, setDialog] = useState<{
    open: boolean;
    booking: BookingListItem | null;
  }>({ open: false, booking: null });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    booking: BookingListItem | null;
    roomAmount: number;
  }>({ open: false, booking: null, roomAmount: 0 });
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState<BookingListItem | null>(null);

  const resendMutation = useMutation({
    mutationFn: (bookingId: string) => resendConfirmationEmail(propertyId, bookingId),
    onSuccess: () => {
      setResendNotice("Confirmation email sent.");
    },
    onError: () => {
      setResendNotice(null);
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: Parameters<typeof updateBooking>[2] }) =>
      updateBooking(propertyId, bookingId, payload),
    onSuccess: () => {
      setStatusNotice("Booking marked as completed.");
      void bookingsQuery.refetch();
    },
    onError: () => {
      setStatusNotice(null);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: Parameters<typeof updateBooking>[2] }) =>
      updateBooking(propertyId, bookingId, payload),
    onSuccess: () => {
      setStatusNotice("Booking cancelled.");
      void bookingsQuery.refetch();
    },
    onError: () => {
      setStatusNotice(null);
    },
  });

  useEffect(() => {
    if (!resendNotice) return;
    const t = window.setTimeout(() => setResendNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [resendNotice]);

  useEffect(() => {
    if (!statusNotice) return;
    const t = window.setTimeout(() => setStatusNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [statusNotice]);

  const bookingsQuery = useApiQuery<ListBookingsResponse>(
    ["bookings", propertyId],
    `/api/properties/${propertyId}/bookings`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const roomNameById = useMemo(() => {
    const m = new Map<string, string>();
    roomsQuery.data?.rooms.forEach((r) => m.set(r._id, r.name));
    return m;
  }, [roomsQuery.data?.rooms]);

  const roomById = useMemo(() => {
    const m = new Map<string, RoomListItem>();
    roomsQuery.data?.rooms.forEach((r) => m.set(r._id, r));
    return m;
  }, [roomsQuery.data?.rooms]);

  function bookingRoomEntries(booking: BookingListItem) {
    return Object.entries(booking.rooms).map(([roomId, row]) => ({
      roomId,
      quantity: row.quantity,
    }));
  }

  const sortedBookings = useMemo(() => {
    const list = bookingsQuery.data?.bookings ?? [];
    return [...list].sort((a, b) => {
      const ca = new Date(a.checkIn).getTime();
      const cb = new Date(b.checkIn).getTime();
      return cb - ca;
    });
  }, [bookingsQuery.data?.bookings]);

  function openCreate() {
    setDialog({ open: true, booking: null });
  }

  function openEdit(booking: BookingListItem) {
    setDialog({ open: true, booking });
  }

  function openDetails(booking: BookingListItem, roomAmount: number) {
    setDetailsDialog({ open: true, booking, roomAmount });
  }

  function buildBookingUpdatePayload(booking: BookingListItem, status: "completed" | "cancelled") {
    return {
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      specialRequests: booking.specialRequests,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      numberOfGuests: booking.numberOfGuests,
      selectedOptions: booking.selectedOptions,
      customItems: booking.customItems,
      discount: booking.discount,
      advanceAmount: booking.advanceAmount,
      rooms: Object.fromEntries(
        Object.entries(booking.rooms).map(([roomId, row]) => [
          roomId,
          {
            quantity: row.quantity,
            roomNumbers: row.roomNumbers,
          },
        ]),
      ),
      status,
    } satisfies Parameters<typeof updateBooking>[2];
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Reservations for this property. Creating or editing a booking updates nightly room
            availability.
          </p>
          {resendNotice ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {resendNotice}
            </p>
          ) : null}
          {statusNotice ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {statusNotice}
            </p>
          ) : null}
          {resendMutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {resendMutation.error.message}
            </p>
          ) : null}
          {markCompletedMutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {markCompletedMutation.error.message}
            </p>
          ) : null}
          {cancelBookingMutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {cancelBookingMutation.error.message}
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={openCreate} disabled={!propertyId}>
          <PlusIcon data-icon="inline-start" />
          New booking
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        {bookingsQuery.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading bookings...</p>
        ) : bookingsQuery.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{bookingsQuery.error.message}</p>
        ) : sortedBookings.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              Create a booking
            </Button>
          </div>
        ) : (
          <ul className="list-none">
            {sortedBookings.map((b) => {
              const entries = bookingRoomEntries(b);
              const roomAmount = entries.reduce((sum, entry) => {
                const room = roomById.get(entry.roomId);
                if (b.status === "cancelled") {
                  return 0;
                }
                return (
                  sum +
                  calculateBookingAmount(b.checkIn, b.checkOut, entry.quantity, {
                    priceWeekday: room?.priceWeekday,
                    priceWeekend: room?.priceWeekend,
                  })
                );
              }, 0);
              const nights = Math.max(1, Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000));
              const optionsTotal = (b.selectedOptions ?? []).reduce(
                (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1),
                0,
              );
              const customTotal = (b.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
              const discount = Math.max(0, b.discount ?? 0);
              const totalAmount = Math.max(0, roomAmount + optionsTotal + customTotal - discount);
              const roomSummary =
                entries.length === 0
                  ? "Room"
                  : entries
                      .map((entry) => {
                        const room = roomById.get(entry.roomId);
                        const label = room?.name ?? roomNameById.get(entry.roomId) ?? "Room";
                        return entry.quantity > 1 ? `${label} ×${entry.quantity}` : label;
                      })
                      .join(", ");
              return (
              <BookingListItemRow
                key={b._id}
                booking={b}
                roomSummary={roomSummary}
                amountToPay={totalAmount}
                remainingAmount={Math.max(0, totalAmount - (b.advanceAmount ?? 0))}
                onOpenDetails={() => openDetails(b, roomAmount)}
                onEdit={openEdit}
                resendConfirmationPending={
                  resendMutation.isPending && resendMutation.variables === b._id
                }
                onResendConfirmation={() => resendMutation.mutate(b._id)}
                onCheckIn={() => router.push(`/${propertyId}/bookings/${b._id}/check-in`)}
                markCompletedPending={
                  markCompletedMutation.isPending && markCompletedMutation.variables?.bookingId === b._id
                }
                onMarkCompleted={() =>
                  markCompletedMutation.mutate({
                    bookingId: b._id,
                    payload: buildBookingUpdatePayload(b, "completed"),
                  })
                }
                cancelBookingPending={
                  cancelBookingMutation.isPending && cancelBookingMutation.variables?.bookingId === b._id
                }
                onCancelBooking={() => setCancelConfirmBooking(b)}
              />
              );
            })}
          </ul>
        )}
      </section>

      {propertyId ? (
        <CreateBookingDialog
          propertyId={propertyId}
          rooms={roomsQuery.data?.rooms ?? []}
          existingBookings={bookingsQuery.data?.bookings ?? []}
          roomsLoading={roomsQuery.isLoading}
          open={dialog.open}
          booking={dialog.booking}
          onOpenChange={(open) => {
            if (!open) {
              setDialog({ open: false, booking: null });
            }
          }}
        />
      ) : null}

      <BookingDetailsDialog
        open={detailsDialog.open}
        booking={detailsDialog.booking}
        roomAmount={detailsDialog.roomAmount}
        roomSummary={
          detailsDialog.booking
            ? bookingRoomEntries(detailsDialog.booking)
                .map((entry) => {
                  const room = roomById.get(entry.roomId);
                  const label = room?.name ?? roomNameById.get(entry.roomId) ?? "Room";
                  return entry.quantity > 1 ? `${label} ×${entry.quantity}` : label;
                })
                .join(", ") || "Room"
            : "Room"
        }
        onOpenChange={(open) => {
          if (!open) {
            setDetailsDialog({ open: false, booking: null, roomAmount: 0 });
          }
        }}
        onEdit={openEdit}
        onCheckIn={(booking) => {
          router.push(`/${propertyId}/bookings/${booking._id}/check-in`);
        }}
      />

      <Dialog
        open={Boolean(cancelConfirmBooking)}
        onOpenChange={(open) => {
          if (!open && !cancelBookingMutation.isPending) {
            setCancelConfirmBooking(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              {cancelConfirmBooking
                ? `This will mark ${cancelConfirmBooking.guestName}'s booking as cancelled. This action can be reversed by editing the booking status later.`
                : "Confirm cancellation"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              type="button"
              variant="destructive"
              disabled={!cancelConfirmBooking || cancelBookingMutation.isPending}
              onClick={() => {
                if (!cancelConfirmBooking) return;
                cancelBookingMutation.mutate(
                  {
                    bookingId: cancelConfirmBooking._id,
                    payload: buildBookingUpdatePayload(cancelConfirmBooking, "cancelled"),
                  },
                  {
                    onSuccess: () => {
                      setCancelConfirmBooking(null);
                    },
                  },
                );
              }}
            >
              {cancelBookingMutation.isPending ? "Cancelling..." : "Yes, cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
