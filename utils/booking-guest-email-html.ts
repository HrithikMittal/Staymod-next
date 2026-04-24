import { format } from "date-fns";

import type { Booking } from "@/types/booking";
import type { BookingGuestEmailKind } from "@/types/booking-guest-email";
import type { Property } from "@/types/property";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function guestFirstName(guestName: string): string {
  const t = guestName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

export function formatPropertyAddressLine(property: Property): string {
  const a = property.address;
  const parts = [
    a.line1,
    a.line2,
    [a.city, a.state].filter(Boolean).join(", "),
    [a.postalCode, a.country].filter(Boolean).join(" "),
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.join(" • ");
}

export function buildBookingGuestEmailHtml(args: {
  kind: BookingGuestEmailKind;
  property: Property;
  booking: Booking;
  roomDetails: Array<{ name: string; roomType: string; quantity: number; roomNumbers?: string[] }>;
  roomAmount: number;
}): { subject: string; html: string } {
  const { kind, property, booking, roomDetails, roomAmount } = args;
  const companyName = property.name.trim() || "Property";
  const firstName = escapeHtml(guestFirstName(booking.guestName));
  const bookingRef = escapeHtml(booking._id.toString());
  const checkInD = booking.checkIn;
  const checkOutD = booking.checkOut;
  const bookingDate = escapeHtml(
    `${format(checkInD, "MMM d, yyyy")} – ${format(checkOutD, "MMM d, yyyy")}`,
  );
  const bookingTime = escapeHtml(
    `Check-in after ${property.checkInTime} · Check-out before ${property.checkOutTime}`,
  );
  const bookingLocation = escapeHtml(formatPropertyAddressLine(property));
  const guestCount =
    booking.numberOfGuests != null && booking.numberOfGuests > 0
      ? String(booking.numberOfGuests)
      : "—";
  const guestCountEscaped = escapeHtml(guestCount);
  const companyAddress = escapeHtml(formatPropertyAddressLine(property));
  const year = new Date().getFullYear();
  const guestPhone = booking.guestPhone?.trim() ? escapeHtml(booking.guestPhone) : "—";
  const specialRequests = booking.specialRequests?.trim() ? escapeHtml(booking.specialRequests) : "—";

  const nights = Math.max(1, Math.round((checkOutD.getTime() - checkInD.getTime()) / 86_400_000));
  const roomRowsHtml =
    roomDetails.length > 0
      ? roomDetails
          .map((room) => {
            const numbers = room.roomNumbers?.length ? ` · #${room.roomNumbers.join(", ")}` : "";
            return `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">${escapeHtml(room.name)} (${escapeHtml(room.roomType)}) × ${room.quantity}${escapeHtml(numbers)}</li>`;
          })
          .join("")
      : `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">No room details available.</li>`;

  const optionsRows = booking.selectedOptions ?? [];
  const optionsHtml =
    optionsRows.length > 0
      ? optionsRows
          .map((opt) => {
            const lineTotal = opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1);
            return `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">${escapeHtml(opt.name)} × ${opt.quantity} (${escapeHtml(opt.frequency)}) — ${escapeHtml(String(lineTotal))}</li>`;
          })
          .join("")
      : `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">No booking options.</li>`;

  const customRows = booking.customItems ?? [];
  const extrasHtml =
    customRows.length > 0
      ? customRows
          .map(
            (item) =>
              `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">${escapeHtml(item.name)} — ${escapeHtml(String(item.amount))}</li>`,
          )
          .join("")
      : `<li style="margin:0;padding:0;padding-top:2px;padding-bottom:2px">No custom extras.</li>`;

  const optionsAmount = optionsRows.reduce(
    (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1),
    0,
  );
  const extrasAmount = customRows.reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, booking.discount ?? 0);
  const advance = Math.max(0, booking.advanceAmount ?? 0);
  const safeRoomAmount = Math.max(0, roomAmount);
  const totalAmount = Math.max(0, safeRoomAmount + optionsAmount + extrasAmount - discount);
  const dueAmount = Math.max(0, totalAmount - advance);

  const preheader =
    kind === "confirmation"
      ? "Your reservation is confirmed and details are below."
      : kind === "cancellation"
        ? "Your booking has been cancelled."
        : "Your reservation details have been updated.";

  const h2 =
    kind === "confirmation"
      ? "Your booking is confirmed"
      : kind === "cancellation"
        ? "Your booking has been cancelled"
        : "Your booking has been updated";

  const introP =
    kind === "confirmation"
      ? `Thanks for booking with us. We&#x27;ve received your reservation and everything is set. Below are your booking details for your records.`
      : kind === "cancellation"
        ? `We&#x27;re writing to confirm that this reservation has been cancelled. If you did not request this or have questions, please reply to this email.`
        : `Your reservation details have changed. Below is the latest information for your records.`;

  const subject =
    kind === "confirmation"
      ? `Booking confirmed — ${companyName}`
      : kind === "cancellation"
        ? `Booking cancelled — ${companyName}`
        : `Booking updated — ${companyName}`;

  const statusLine = escapeHtml(booking.status);

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta
      content="telephone=no,address=no,email=no,date=no,url=no"
      name="format-detection" />
  </head>
  <body style="background-color:#ffffff">
    <div
      style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
      data-skip-in-text="true">
      ${escapeHtml(preheader)}
      <div>
        &#xA0;&#x200C;&#x200B;&#x200D;&#xFEFF;&#xA0;&#x200C;&#x200B;&#x200D;&#xFEFF;
      </div>
    </div>
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td
            style="font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:1em;min-height:100%;line-height:155%;background-color:#ffffff">
            <table
              align="left"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:600px;align:left;width:100%;color:#000000;background-color:#ffffff;padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;border-radius:0px;border-color:#000000;line-height:155%">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <h2
                      style="margin:0;padding:0;font-size:1.8em;line-height:1.44em;padding-top:0.389em;font-weight:600">
                      ${escapeHtml(h2)}
                    </h2>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      Hi ${firstName},
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      ${introP}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Booking reference: </strong>${bookingRef}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Status: </strong>${statusLine}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Stay dates: </strong>${bookingDate}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Times: </strong>${bookingTime}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Location: </strong>${bookingLocation}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Guests: </strong>${guestCountEscaped}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Phone: </strong>${guestPhone}
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <strong>Special requests: </strong>${specialRequests}
                    </p>
                    <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.25em">
                      <strong>Rooms</strong>
                    </p>
                    <ul style="margin:0;padding-left:18px">${roomRowsHtml}</ul>
                    <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.25em">
                      <strong>Booking options</strong>
                    </p>
                    <ul style="margin:0;padding-left:18px">${optionsHtml}</ul>
                    <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.25em">
                      <strong>Custom extras</strong>
                    </p>
                    <ul style="margin:0;padding-left:18px">${extrasHtml}</ul>
                    <table style="border-collapse:collapse;margin-top:8px">
                      <tr><td style="padding:2px 10px 2px 0;color:#555">Base room amount</td><td>${escapeHtml(String(safeRoomAmount))}</td></tr>
                      ${
                        optionsAmount > 0
                          ? `<tr><td style="padding:2px 10px 2px 0;color:#555">Options total</td><td>${escapeHtml(String(optionsAmount))}</td></tr>`
                          : ""
                      }
                      ${
                        extrasAmount > 0
                          ? `<tr><td style="padding:2px 10px 2px 0;color:#555">Extras total</td><td>${escapeHtml(String(extrasAmount))}</td></tr>`
                          : ""
                      }
                      ${
                        discount > 0
                          ? `<tr><td style="padding:2px 10px 2px 0;color:#555">Discount</td><td>- ${escapeHtml(String(discount))}</td></tr>`
                          : ""
                      }
                      <tr><td style="padding:2px 10px 2px 0;color:#555">Advance paid</td><td>${escapeHtml(String(advance))}</td></tr>
                      <tr><td style="padding:4px 10px 2px 0;font-weight:600">Total amount</td><td style="font-weight:600">${escapeHtml(String(totalAmount))}</td></tr>
                      <tr><td style="padding:2px 10px 2px 0;font-weight:600">Amount due</td><td style="font-weight:600">${escapeHtml(String(dueAmount))}</td></tr>
                    </table>
                    ${
                      kind === "cancellation"
                        ? `<p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      If you have questions about this cancellation, reply to this email and we&#x27;ll be happy to help.
                    </p>`
                        : ""
                    }
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      If you need to make changes or have any questions, just
                      reply to this email and we&#x27;ll be happy to help.
                    </p>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      ${
                        kind === "cancellation"
                          ? `Best regards,<br />The ${escapeHtml(companyName)} Team`
                          : `See you soon,<br />The ${escapeHtml(companyName)} Team`
                      }
                    </p>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      class="node-footer"
                      style="font-size:0.8em">
                      <tbody>
                        <tr>
                          <td>
                            <hr
                              class="divider"
                              style="width:100%;border:none;border-top:1px solid #eaeaea;padding-bottom:1em;border-width:2px" />
                            <p
                              style="margin:0;padding:0;font-size:12px;padding-top:0.5em;padding-bottom:0.5em;color:#6b7280;text-align:center">
                              ${escapeHtml(companyName)}
                              •
                              ${companyAddress}<br />© ${year}
                              ${escapeHtml(companyName)}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p
                      style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em">
                      <br />
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

  return { subject, html };
}
