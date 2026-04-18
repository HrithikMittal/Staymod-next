import "server-only";

import { ObjectId } from "mongodb";
import { Resend } from "resend";

import type { Booking } from "@/types/booking";
import type { Property } from "@/types/property";
import { getDb } from "@/utils/mongodb";
import { loadDecryptedEmailSettings } from "@/utils/property-email-settings";

const PROPERTIES_COLLECTION = "properties";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

function bookingMeaningfullyChanged(previous: Booking, next: Booking): boolean {
  if (previous.status !== next.status) return true;
  if (previous.guestName !== next.guestName) return true;
  if ((previous.guestEmail ?? "") !== (next.guestEmail ?? "")) return true;
  if (previous.checkIn.getTime() !== next.checkIn.getTime()) return true;
  if (previous.checkOut.getTime() !== next.checkOut.getTime()) return true;
  if (previous.numberOfGuests !== next.numberOfGuests) return true;
  if (JSON.stringify(previous.rooms ?? {}) !== JSON.stringify(next.rooms ?? {})) return true;
  if (JSON.stringify(previous.selectedOptions ?? []) !== JSON.stringify(next.selectedOptions ?? [])) {
    return true;
  }
  if (JSON.stringify(previous.customItems ?? []) !== JSON.stringify(next.customItems ?? [])) {
    return true;
  }
  if (previous.advanceAmount !== next.advanceAmount) return true;
  return false;
}

export type BookingGuestEmailKind = "confirmation" | "update" | "cancellation";

export function classifyBookingGuestEmailKind(
  previous: Booking | undefined,
  next: Booking,
): BookingGuestEmailKind | null {
  const guestEmail = next.guestEmail?.trim();
  if (!guestEmail) return null;

  if (!previous) {
    if (next.status === "cancelled") return "cancellation";
    if (next.status === "confirmed") return "confirmation";
    return null;
  }

  if (next.status === "cancelled" && previous.status !== "cancelled") {
    return "cancellation";
  }

  if (next.status === "cancelled") {
    return null;
  }

  if (previous.status !== "confirmed" && next.status === "confirmed") {
    return "confirmation";
  }

  if (!bookingMeaningfullyChanged(previous, next)) {
    return null;
  }

  return "update";
}

function buildEmailBody(args: {
  kind: BookingGuestEmailKind;
  propertyName: string;
  booking: Booking;
}): { subject: string; html: string } {
  const { kind, propertyName, booking } = args;
  const name = escapeHtml(booking.guestName);
  const checkIn = formatDate(booking.checkIn);
  const checkOut = formatDate(booking.checkOut);
  const status = escapeHtml(booking.status);
  const id = booking._id.toString();

  const title =
    kind === "confirmation"
      ? "Your booking is confirmed"
      : kind === "cancellation"
        ? "Your booking has been cancelled"
        : "Your booking has been updated";

  const lead =
    kind === "confirmation"
      ? "Thank you for your reservation. Here are your booking details."
      : kind === "cancellation"
        ? "This booking is now cancelled. If you have questions, contact the property."
        : "Your reservation details have changed. Please review the updated information below.";

  const subject =
    kind === "confirmation"
      ? `Booking confirmed — ${propertyName}`
      : kind === "cancellation"
        ? `Booking cancelled — ${propertyName}`
        : `Booking updated — ${propertyName}`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
    <h1 style="font-size: 1.25rem;">${escapeHtml(title)}</h1>
    <p>${escapeHtml(lead)}</p>
    <table style="border-collapse: collapse; margin-top: 1rem;">
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Property</td><td>${escapeHtml(propertyName)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Guest</td><td>${name}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Check-in</td><td>${escapeHtml(checkIn)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Check-out</td><td>${escapeHtml(checkOut)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Status</td><td>${status}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #555;">Booking reference</td><td>${escapeHtml(id)}</td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}

async function loadPropertyName(orgId: string, propertyId: ObjectId): Promise<string | null> {
  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyId,
    orgId,
  });
  return property?.name?.trim() || null;
}

async function sendBookingGuestEmailOnce(args: {
  orgId: string;
  propertyId: ObjectId;
  kind: BookingGuestEmailKind;
  booking: Booking;
}): Promise<void> {
  const { orgId, propertyId, kind, booking } = args;
  const guestEmail = booking.guestEmail?.trim();
  if (!guestEmail) return;

  const settings = await loadDecryptedEmailSettings(orgId, propertyId);
  if (!settings) return;

  const allow =
    kind === "confirmation"
      ? settings.notifyOnConfirmation
      : kind === "update"
        ? settings.notifyOnUpdate
        : settings.notifyOnCancellation;
  if (!allow) return;

  const propertyName = (await loadPropertyName(orgId, propertyId)) ?? "Your stay";

  const { subject, html } = buildEmailBody({ kind, propertyName, booking });
  const resend = new Resend(settings.resendApiKey);

  const { error } = await resend.emails.send({
    from: settings.fromEmail,
    to: guestEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Resend rejected the email.");
  }
}

/**
 * Fire-and-forget guest notification via the property's Resend credentials.
 * Failures are logged and never thrown to callers.
 */
export function queueBookingGuestEmailNotification(args: {
  orgId: string;
  propertyId: ObjectId;
  previous: Booking | undefined;
  next: Booking;
}): void {
  const kind = classifyBookingGuestEmailKind(args.previous, args.next);
  if (!kind) return;

  void sendBookingGuestEmailOnce({
    orgId: args.orgId,
    propertyId: args.propertyId,
    kind,
    booking: args.next,
  }).catch((err) => {
    console.error("[booking-guest-email]", err);
  });
}
