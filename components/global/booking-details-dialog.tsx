"use client";

import type { BookingListItem } from "@/api-clients/bookings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateNightsCount, formatMoney } from "@/utils/booking-pricing";

type BookingDetailsDialogProps = {
  open: boolean;
  booking: BookingListItem | null;
  roomSummary: string;
  roomAmount: number;
  onOpenChange: (open: boolean) => void;
  onEdit: (booking: BookingListItem) => void;
  onCheckIn: (booking: BookingListItem) => void;
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
  roomAmount,
  onOpenChange,
  onEdit,
  onCheckIn,
}: BookingDetailsDialogProps) {
  const nights = booking ? Math.max(1, calculateNightsCount(booking.checkIn, booking.checkOut)) : 1;
  const optionsTotal = (booking?.selectedOptions ?? []).reduce(
    (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1),
    0,
  );
  const customTotal = (booking?.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, booking?.discount ?? 0);
  const totalAmount = Math.max(0, roomAmount + optionsTotal + customTotal - discount);
  const isEditableCheckinStatus =
    booking?.status === "checked_in" || booking?.status === "completed";

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
            <p><strong>Nights:</strong> {nights}</p>
            <p><strong>Guests:</strong> {booking.numberOfGuests ?? "-"}</p>

            <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-3">
              <p className="font-medium">Options</p>
              {(booking.selectedOptions ?? []).length === 0 ? (
                <p className="text-muted-foreground">No booking options selected.</p>
              ) : (
                <ul className="space-y-1">
                  {booking.selectedOptions?.map((opt, idx) => {
                    const lineTotal =
                      opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1);
                    return (
                      <li key={`${opt.bookingOptionId}-${idx}`} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {opt.name} x{opt.quantity} ({opt.frequency})
                        </span>
                        <span className="shrink-0 font-medium">{formatMoney(lineTotal)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-3">
              <p className="font-medium">Custom extras</p>
              {(booking.customItems ?? []).length === 0 ? (
                <p className="text-muted-foreground">No custom extras.</p>
              ) : (
                <ul className="space-y-1">
                  {booking.customItems?.map((item, idx) => (
                    <li key={`${item.name}-${idx}`} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 font-medium">{formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-border/70 bg-background p-3">
              <p><strong>Room amount:</strong> {formatMoney(roomAmount)}</p>
              <p><strong>Options total:</strong> {formatMoney(optionsTotal)}</p>
              <p><strong>Extras total:</strong> {formatMoney(customTotal)}</p>
              <p><strong>Discount:</strong> - {formatMoney(discount)}</p>
              <p className="mt-1 border-t border-border/70 pt-1">
                <strong>Total amount:</strong> {formatMoney(totalAmount)}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter showCloseButton>
          {booking ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onCheckIn(booking);
                }}
              >
                {isEditableCheckinStatus ? "Edit check-in" : "Check in"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(booking);
                }}
              >
                Edit booking
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
