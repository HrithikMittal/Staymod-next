import "server-only";

import { ObjectId } from "mongodb";
import { Resend } from "resend";

import type { Booking } from "@/types/booking";
import type { BookingGuestEmailKind } from "@/types/booking-guest-email";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { buildBookingGuestEmailHtml } from "@/utils/booking-guest-email-html";
import { calculateBookingAmount } from "@/utils/booking-pricing";
import { getDb } from "@/utils/mongodb";
import { loadDecryptedEmailSettings } from "@/utils/property-email-settings";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

export type { BookingGuestEmailKind } from "@/types/booking-guest-email";

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
  if (previous.discount !== next.discount) return true;
  if (previous.advanceAmount !== next.advanceAmount) return true;
  return false;
}

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

async function loadPropertyForEmail(orgId: string, propertyId: ObjectId): Promise<Property | null> {
  const db = await getDb();
  return db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyId,
    orgId,
  });
}

type EmailRoomDetail = {
  name: string;
  roomType: string;
  quantity: number;
  roomNumbers?: string[];
  priceWeekday?: number;
  priceWeekend?: number;
};

async function loadEmailRoomDetails(args: {
  orgId: string;
  propertyId: ObjectId;
  booking: Booking;
}): Promise<EmailRoomDetail[]> {
  const roomIds = Object.keys(args.booking.rooms ?? {}).filter((id) => ObjectId.isValid(id));
  if (roomIds.length === 0) return [];
  const db = await getDb();
  const rooms = await db
    .collection<Room>(ROOMS_COLLECTION)
    .find({
      orgId: args.orgId,
      propertyId: args.propertyId,
      _id: { $in: roomIds.map((id) => new ObjectId(id)) },
    })
    .toArray();
  const roomById = new Map(rooms.map((r) => [r._id.toString(), r]));
  return roomIds.map((roomId) => {
    const alloc = args.booking.rooms?.[roomId];
    const room = roomById.get(roomId);
    return {
      name: room?.name ?? `Room ${roomId.slice(-4)}`,
      roomType: alloc?.roomType ?? room?.type ?? "other",
      quantity: Math.max(1, alloc?.quantity ?? 1),
      roomNumbers: alloc?.roomNumbers,
      priceWeekday: room?.priceWeekday,
      priceWeekend: room?.priceWeekend,
    };
  });
}

async function sendGuestEmailWithResend(args: {
  orgId: string;
  propertyId: ObjectId;
  kind: BookingGuestEmailKind;
  booking: Booking;
  /** When false, sends if Resend is configured (manual resend from dashboard). */
  enforceNotifyToggles: boolean;
}): Promise<void> {
  const { orgId, propertyId, kind, booking, enforceNotifyToggles } = args;
  const guestEmail = booking.guestEmail?.trim();
  if (!guestEmail) {
    if (enforceNotifyToggles) return;
    throw new Error("Guest email is required.");
  }

  const settings = await loadDecryptedEmailSettings(orgId, propertyId);
  if (!settings) {
    if (enforceNotifyToggles) return;
    throw new Error(
      "Guest email is not configured for this property. Add your Resend API key under Integrations.",
    );
  }

  if (enforceNotifyToggles) {
    const allow =
      kind === "confirmation"
        ? settings.notifyOnConfirmation
        : kind === "update"
          ? settings.notifyOnUpdate
          : settings.notifyOnCancellation;
    if (!allow) return;
  }

  const property = await loadPropertyForEmail(orgId, propertyId);
  if (!property) {
    if (enforceNotifyToggles) return;
    throw new Error("Property not found.");
  }

  const roomDetails = await loadEmailRoomDetails({ orgId, propertyId, booking });
  const roomAmount = roomDetails.reduce(
    (sum, room) =>
      sum +
      calculateBookingAmount(booking.checkIn.toISOString(), booking.checkOut.toISOString(), room.quantity, {
        priceWeekday: room.priceWeekday,
        priceWeekend: room.priceWeekend,
      }),
    0,
  );
  const { subject, html } = buildBookingGuestEmailHtml({
    kind,
    property,
    booking,
    roomDetails,
    roomAmount,
  });
  const resend = new Resend(settings.resendApiKey);

  const { error } = await resend.emails.send({
    from: settings.fromEmail,
    to: guestEmail,
    ...(settings.ccEmail ? { cc: settings.ccEmail } : {}),
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Resend rejected the email.");
  }
}

async function sendBookingGuestEmailOnce(args: {
  orgId: string;
  propertyId: ObjectId;
  kind: BookingGuestEmailKind;
  booking: Booking;
}): Promise<void> {
  await sendGuestEmailWithResend({ ...args, enforceNotifyToggles: true });
}

/**
 * Sends the confirmation template again (e.g. from the bookings dashboard).
 * Does not require notification toggles to be enabled; still requires Resend + from address.
 */
export async function resendBookingConfirmationEmail(args: {
  orgId: string;
  propertyId: ObjectId;
  booking: Booking;
}): Promise<void> {
  await sendGuestEmailWithResend({
    orgId: args.orgId,
    propertyId: args.propertyId,
    kind: "confirmation",
    booking: args.booking,
    enforceNotifyToggles: false,
  });
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
