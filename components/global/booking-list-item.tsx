"use client";

import type { BookingListItem } from "@/api-clients/bookings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  CheckCheckIcon,
  CircleXIcon,
  DownloadIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  UserIcon,
} from "lucide-react";
import { formatMoney } from "@/utils/booking-pricing";

function formatRange(checkIn: string, checkOut: string) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${a.toLocaleDateString(undefined, opts)} → ${b.toLocaleDateString(undefined, opts)}`;
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500";
    case "checked_in":
      return "bg-sky-500";
    case "completed":
      return "bg-indigo-500";
    case "pending":
      return "bg-amber-500";
    case "cancelled":
      return "bg-muted-foreground/50";
    case "no_show":
      return "bg-rose-500";
    default:
      return "bg-muted-foreground/50";
  }
}

type BookingListItemRowProps = {
  booking: BookingListItem;
  roomSummary: string;
  amountToPay?: number;
  remainingAmount?: number;
  onOpenDetails?: () => void;
  onEdit: (booking: BookingListItem) => void;
  onResendConfirmation?: () => void;
  resendConfirmationPending?: boolean;
  onCheckIn?: () => void;
  onMarkCompleted?: () => void;
  markCompletedPending?: boolean;
  onCancelBooking?: () => void;
  cancelBookingPending?: boolean;
  onDownloadReceipt?: () => void;
  downloadReceiptPending?: boolean;
};

export function BookingListItemRow({
  booking,
  roomSummary,
  amountToPay,
  remainingAmount,
  onOpenDetails,
  onEdit,
  onResendConfirmation,
  resendConfirmationPending,
  onCheckIn,
  onMarkCompleted,
  markCompletedPending,
  onCancelBooking,
  cancelBookingPending,
  onDownloadReceipt,
  downloadReceiptPending,
}: BookingListItemRowProps) {
  const statusLabel = booking.status.replace(/_/g, " ");
  const canResendConfirmation =
    booking.status === "confirmed" && Boolean(booking.guestEmail?.trim()) && onResendConfirmation;
  const canCheckIn =
    booking.status !== "checked_in" &&
    booking.status !== "completed" &&
    booking.status !== "cancelled" &&
    booking.status !== "no_show" &&
    Boolean(onCheckIn);
  const canEditCheckIn =
    (booking.status === "checked_in" || booking.status === "completed") && Boolean(onCheckIn);
  const canMarkCompleted =
    booking.status === "checked_in" &&
    Boolean(onMarkCompleted);
  const canCancelBooking =
    (booking.status === "pending" || booking.status === "confirmed") &&
    Boolean(onCancelBooking);

  return (
    <li className="border-border/60 border-b last:border-b-0">
      <div
        className="flex cursor-pointer flex-wrap items-start gap-3 px-5 py-4 sm:flex-nowrap sm:items-center sm:justify-between"
        onClick={() => onOpenDetails?.()}
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground"
            aria-hidden
          >
            <UserIcon className="size-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{booking.guestName}</p>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{roomSummary}</span>
            </p>
            <p className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
              <CalendarIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
              {formatRange(booking.checkIn, booking.checkOut)}
            </p>
            <p className="text-xs font-medium text-foreground/90">
              Amount to pay: {formatMoney(amountToPay ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Advance: {formatMoney(booking.advanceAmount ?? 0)} · Remaining:{" "}
              {formatMoney(remainingAmount ?? Math.max(0, (amountToPay ?? 0) - (booking.advanceAmount ?? 0)))}
            </p>
          </div>
        </div>

        <div
          className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize",
            )}
            title={`Status: ${statusLabel}`}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", statusClass(booking.status))} aria-hidden />
            {statusLabel}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground opacity-80 hover:opacity-100"
                  aria-label="Booking actions"
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
              <DropdownMenuItem onClick={() => onEdit(booking)}>
                <PencilIcon className="size-4" />
                Edit
              </DropdownMenuItem>
              {canCheckIn ? (
                <DropdownMenuItem onClick={() => onCheckIn?.()}>
                  <CheckCheckIcon className="size-4" />
                  Check in
                </DropdownMenuItem>
              ) : null}
              {canEditCheckIn ? (
                <DropdownMenuItem onClick={() => onCheckIn?.()}>
                  <CheckCheckIcon className="size-4" />
                  Edit check-in
                </DropdownMenuItem>
              ) : null}
              {canMarkCompleted ? (
                <DropdownMenuItem onClick={() => onMarkCompleted?.()} disabled={markCompletedPending}>
                  <CheckCheckIcon className="size-4" />
                  Check out / Mark completed
                </DropdownMenuItem>
              ) : null}
              {canCancelBooking ? (
                <DropdownMenuItem onClick={() => onCancelBooking?.()} disabled={cancelBookingPending}>
                  <CircleXIcon className="size-4" />
                  Cancel booking
                </DropdownMenuItem>
              ) : null}
              {canResendConfirmation ? (
                <DropdownMenuItem
                  onClick={() => onResendConfirmation()}
                  disabled={resendConfirmationPending}
                >
                  <MailIcon className="size-4" />
                  Resend confirmation email
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => onDownloadReceipt?.()} disabled={downloadReceiptPending}>
                <DownloadIcon className="size-4" />
                Download receipt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
