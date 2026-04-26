import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { calculateBookingAmount, calculateNightsCount, formatMoney } from "@/utils/booking-pricing";
import { getDb } from "@/utils/mongodb";
import { parseBookingId } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  let propertyObjectId;
  let bookingObjectId;
  try {
    const params = await context.params;
    propertyObjectId = parsePropertyId(params.propertyId);
    bookingObjectId = parseBookingId(params.bookingId);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyObjectId,
    orgId,
  });
  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });

  const booking = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    _id: bookingObjectId,
    orgId,
    propertyId: propertyObjectId,
  });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const roomIds = Object.keys(booking.rooms ?? {}).map((id) => parsePropertyId(id));
  const rooms = roomIds.length
    ? await db
        .collection<Room>(ROOMS_COLLECTION)
        .find({ orgId, propertyId: propertyObjectId, _id: { $in: roomIds } })
        .toArray()
    : [];
  const roomById = new Map(rooms.map((r) => [r._id.toString(), r]));

  const nights = Math.max(1, calculateNightsCount(booking.checkIn.toISOString(), booking.checkOut.toISOString()));
  const roomRows = Object.entries(booking.rooms ?? {}).map(([roomId, row]) => {
    const room = roomById.get(roomId);
    const subtotal = calculateBookingAmount(
      booking.checkIn.toISOString(),
      booking.checkOut.toISOString(),
      row.quantity,
      { priceWeekday: room?.priceWeekday, priceWeekend: room?.priceWeekend },
    );
    return {
      name: room?.name ?? "Room",
      quantity: row.quantity,
      subtotal,
    };
  });

  const roomAmount = roomRows.reduce((sum, row) => sum + row.subtotal, 0);
  const optionsTotal = (booking.selectedOptions ?? []).reduce(
    (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1),
    0,
  );
  const extrasTotal = (booking.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, booking.discount ?? 0);
  const total = Math.max(0, roomAmount + optionsTotal + extrasTotal - discount);
  const advance = Math.max(0, booking.advanceAmount ?? 0);
  const fileName = `receipt-${booking._id.toString()}.pdf`;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const borderColor = rgb(0.886, 0.91, 0.941);
  const lineColor = rgb(0.82, 0.82, 0.82);
  const textMuted = rgb(0.62, 0.62, 0.62);
  const textPrimary = rgb(0.22, 0.22, 0.22);

  const drawText = (text: string, x: number, y: number, size = 11, isBold = false, color = textPrimary) => {
    page.drawText(text, { x, y, size, font: isBold ? bold : font, color });
  };
  const lineHeightFor = (size: number) => Math.round(size * 1.35);
  const drawWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    isBold = false,
    color = textPrimary,
  ) => {
    const targetFont = isBold ? bold : font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (targetFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    const lh = lineHeightFor(size);
    lines.forEach((line, idx) => {
      drawText(line, x, y - idx * lh, size, isBold, color);
    });
    return lines.length * lh;
  };
  const drawRightText = (
    text: string,
    rightEdge: number,
    y: number,
    size = 11,
    isBold = false,
    color = textPrimary,
  ) => {
    const targetFont = isBold ? bold : font;
    const width = targetFont.widthOfTextAtSize(text, size);
    drawText(text, rightEdge - width, y, size, isBold, color);
  };
  const drawDashedLine = (startX: number, y: number, width: number) => {
    const dash = 5;
    const gap = 4;
    let cursor = startX;
    while (cursor < startX + width) {
      const seg = Math.min(dash, startX + width - cursor);
      page.drawLine({
        start: { x: cursor, y },
        end: { x: cursor + seg, y },
        thickness: 1,
        color: lineColor,
      });
      cursor += dash + gap;
    }
  };

  const cardX = 44;
  const cardY = 312;
  const cardW = 508;
  const cardH = 486;
  const padX = 22;
  const right = cardX + cardW - padX;
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    borderColor,
    borderWidth: 1,
  });

  drawText(property.name, cardX + padX, cardY + cardH - 36, 34 / 2.2, false, textPrimary);
  drawText("Booking confirmation", cardX + padX, cardY + cardH - 54, 10, false, textMuted);

  let y = cardY + cardH - 85;
  drawDashedLine(cardX + padX, y, cardW - 2 * padX);
  y -= 18;
  drawText("CONFIRMATION NUMBER", cardX + padX, y, 8, false, textMuted);
  y -= 16;
  drawText(booking._id.toString(), cardX + padX, y, 24 / 2.1, true, textPrimary);

  y -= 28;
  const writeTwoCol = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) => {
    const leftX = cardX + padX;
    const rightX = cardX + cardW / 2 + 4;
    drawText(leftLabel.toUpperCase(), leftX, y, 8, false, textMuted);
    drawText(rightLabel.toUpperCase(), rightX, y, 8, false, textMuted);
    const leftH = drawWrappedText(leftValue || "-", leftX, y - 14, cardW / 2 - padX - 14, 11);
    const rightH = drawWrappedText(rightValue || "-", rightX, y - 14, cardW / 2 - padX - 14, 11);
    y -= Math.max(leftH, rightH) + 20;
  };
  writeTwoCol("Guest", booking.guestName, "Guests", String(booking.guests));

  drawText("ROOM", cardX + padX, y, 8, false, textMuted);
  y -= 14;
  const roomLabel =
    roomRows.length > 1
      ? roomRows.map((room) => `${room.name} x${room.quantity}`).join(" · ")
      : `${roomRows[0]?.name ?? "Room"} x${roomRows[0]?.quantity ?? 1}`;
  y -= drawWrappedText(roomLabel, cardX + padX, y, cardW - 2 * padX, 11) + 6;

  writeTwoCol(
    "Check-in",
    new Date(booking.checkIn).toLocaleDateString("en-IN"),
    "Check-out",
    new Date(booking.checkOut).toLocaleDateString("en-IN"),
  );
  writeTwoCol("Nights", String(nights), "Status", booking.status.replace(/_/g, " "));

  y -= 2;
  page.drawLine({ start: { x: cardX + padX, y }, end: { x: cardX + cardW - padX, y }, thickness: 1, color: lineColor });
  y -= 28;

  const writeAmount = (label: string, amount: string, emphasize = false) => {
    drawText(label.toUpperCase(), cardX + padX, y, 8, false, textMuted);
    drawRightText(amount, right, y - 1, emphasize ? 16 : 12, emphasize, textPrimary);
    y -= 30;
  };
  writeAmount("Total (INR)", total > 0 ? formatMoney(total) : "—", true);
  writeAmount("Amount paid", formatMoney(advance));

  y -= 2;
  drawText("CONTACT", cardX + padX, y, 8, false, textMuted);
  y -= 16;
  drawWrappedText(booking.guestEmail ?? "-", cardX + padX, y, cardW - 2 * padX, 10, false, textPrimary);
  if (booking.guestPhone) {
    y -= 16;
    drawText(booking.guestPhone, cardX + padX, y, 10, false, textPrimary);
  }

  drawText(
    "Payment and special requests: our team will contact you using the details above. Please keep this confirmation for your records.",
    cardX + padX,
    cardY + 32,
    8,
    false,
    textMuted,
  );
  drawText(`Issued ${new Date().toLocaleString("en-IN")}`, cardX + padX, cardY + 16, 8, false, textMuted);

  const pdf = Buffer.from(await pdfDoc.save());
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
