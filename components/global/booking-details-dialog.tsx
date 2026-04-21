"use client";

import type { BookingListItem } from "@/api-clients/bookings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/utils/booking-pricing";

type BookingDetailsDialogProps = {
  open: boolean;
  booking: BookingListItem | null;
  roomSummary: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (booking: BookingListItem) => void;
};

function formatRange(checkIn: string, checkOut: string) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${a.toLocaleDateString(undefined, opts)} - ${b.toLocaleDateString(undefined, opts)}`;
}

export function BookingDetailsDialog({
  open,
  booking,
  roomSummary,
  onOpenChange,
  onEdit,
}: BookingDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Booking details</DialogTitle>
          <DialogDescription>
            {booking ? `Reference: ${booking._id}` : "Booking information"}
          </DialogDescription>
        </DialogHeader>

        {booking ? (
          <div className="space-y-3 text-sm">
            <p><strong>Guest:</strong> {booking.guestName}</p>
            <p><strong>Email:</strong> {booking.guestEmail?.trim() || "Not provided"}</p>
            <p><strong>Status:</strong> {booking.status.replace(/_/g, " ")}</p>
            <p><strong>Rooms:</strong> {roomSummary}</p>
            <p><strong>Stay:</strong> {formatRange(booking.checkIn, booking.checkOut)}</p>
            <p><strong>Guests:</strong> {booking.numberOfGuests ?? "-"}</p>
            <p><strong>Advance:</strong> {formatMoney(booking.advanceAmount ?? 0)}</p>
          </div>
        ) : null}

        <DialogFooter showCloseButton>
          {booking ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(booking);
              }}
            >
              Edit booking
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
