import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY, // Using your env variable name
});

// Define the schema for parsed booking data
// Note: OpenAI structured outputs require .nullable() with .optional()
const BookingSchema = z.object({
  isBookingConfirmation: z.boolean().describe("True if this is a booking confirmation email, false otherwise"),
  source: z.string().describe("OTA platform name (airbnb, booking.com, makemytrip, goibibo, expedia, vrbo, or other)"),
  guestName: z.string().describe("Full name of the guest making the booking"),
  guestEmail: z.string().nullable().optional().describe("Guest's email address if provided"),
  guestPhone: z.string().nullable().optional().describe("Guest's phone number if provided"),
  checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
  checkOut: z.string().describe("Check-out date in YYYY-MM-DD format"),
  numberOfGuests: z.number().nullable().optional().describe("Total number of guests"),
  confirmationCode: z.string().nullable().optional().describe("Booking confirmation or reference number"),
  specialRequests: z.string().nullable().optional().describe("Special requests or notes from guest"),
  roomType: z.string().nullable().optional().describe("Type or category of room booked"),
  roomNumber: z.string().nullable().optional().describe("Specific room number if assigned"),
  totalAmount: z.number().nullable().optional().describe("Total booking amount (customer paid)"),
  currency: z.string().nullable().optional().describe("Currency code (USD, INR, EUR, etc.)"),
  grossCharges: z.number().nullable().optional().describe("Property gross charges (before OTA commission)"),
  otaCommission: z.number().nullable().optional().describe("OTA commission amount deducted"),
  netAmount: z.number().nullable().optional().describe("Net amount payable to property (after commission)"),
});

export type ParsedBooking = z.infer<typeof BookingSchema>;

/**
 * Parse OTA booking confirmation email using OpenAI GPT-4
 * with structured outputs for reliable JSON extraction.
 */
export async function parseOTAEmailWithLLM(
  from: string,
  subject: string,
  body: string
): Promise<ParsedBooking | null> {
  try {
    console.log("Parsing email with OpenAI GPT-4...");

    // Limit body length to avoid token limits (keep first 6000 chars)
    const truncatedBody = body.substring(0, 6000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Supports structured outputs
      temperature: 0, // Deterministic for parsing
      messages: [
        {
          role: "system",
          content: `You are a booking information extraction system for a property management platform called Staymod.

Your job is to extract structured booking details from hotel/accommodation booking confirmation emails from various OTA platforms (Airbnb, Booking.com, MakeMyTrip, GoIbibo, Expedia, VRBO, etc.).

CRITICAL RULES:
1. Only extract information from CONFIRMED booking emails
2. Set isBookingConfirmation to FALSE if this is NOT a booking confirmation (e.g., inquiry, cancellation, review request, password reset, promotional email, marketing email)
3. Parse all dates into ISO 8601 format (YYYY-MM-DD)
4. For phone numbers, extract in international format if possible (e.g., +91 98765 43210)
5. Be conservative - only extract data you're highly confident about
6. If a field is not clearly present in the email, leave it as null/undefined
7. Look for keywords like "Reservation", "Booking Confirmed", "Check-in", "Check-out", "Guest Name", "Confirmation Code"

PRICING EXTRACTION (important for commission tracking):
- totalAmount: Total amount customer paid (look for "Total", "Grand Total", "Amount Paid")
- grossCharges: Property gross charges before commission (look for "Property Gross Charges", "Gross Charges", "G")
- otaCommission: OTA commission deducted (look for "Commission", "Service Fee", "C")
- netAmount: Net amount payable to property (look for "Payable to Property", "Net Amount", "G-C")
- Extract ALL pricing fields if available in payment breakdown or invoice section

COMMON EMAIL TYPES TO REJECT (set isBookingConfirmation = false):
- Booking inquiries or requests
- Cancellation notifications
- Review requests
- Payment reminders
- Account verification emails
- Marketing/promotional emails
- Password reset emails`,
        },
        {
          role: "user",
          content: `Extract booking information from this email:

FROM: ${from}
SUBJECT: ${subject}

EMAIL BODY:
${truncatedBody}

Analyze the email and extract all available booking information.`,
        },
      ],
      response_format: zodResponseFormat(BookingSchema, "booking_extraction"),
    });

    // Extract the response - structured outputs return in content
    const messageContent = completion.choices[0].message.content;

    if (!messageContent) {
      console.log("No content in OpenAI response");
      return null;
    }

    // Parse the JSON response
    const parsed = JSON.parse(messageContent) as ParsedBooking;

    // Check if it's actually a booking confirmation
    if (!parsed.isBookingConfirmation) {
      console.log("LLM determined this is NOT a booking confirmation");
      return null;
    }

    // Validate required fields
    if (!parsed.guestName || !parsed.checkIn || !parsed.checkOut) {
      console.log("Missing required fields in extracted data:", {
        hasGuestName: !!parsed.guestName,
        hasCheckIn: !!parsed.checkIn,
        hasCheckOut: !!parsed.checkOut,
      });
      return null;
    }

    console.log("Successfully extracted booking data:", {
      source: parsed.source,
      guest: parsed.guestName,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      confirmationCode: parsed.confirmationCode,
    });

    return parsed;
  } catch (error) {
    console.error("OpenAI parsing error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return null;
  }
}

/**
 * Alternative version using JSON mode (older approach, less reliable)
 * Use this if structured outputs don't work for some reason.
 */
export async function parseOTAEmailWithLLMJsonMode(
  from: string,
  subject: string,
  body: string
): Promise<ParsedBooking | null> {
  try {
    const truncatedBody = body.substring(0, 6000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a booking information extraction system. Extract structured booking details from OTA confirmation emails.
Return JSON with these fields: isBookingConfirmation, source, guestName, guestEmail, guestPhone, checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), numberOfGuests, confirmationCode, specialRequests, roomType, roomNumber, totalAmount, currency.
Set isBookingConfirmation to false if this is not a booking confirmation email.`,
        },
        {
          role: "user",
          content: `FROM: ${from}\nSUBJECT: ${subject}\n\nBODY:\n${truncatedBody}`,
        },
      ],
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      return null;
    }

    const parsed = JSON.parse(responseText);

    if (!parsed.isBookingConfirmation) {
      return null;
    }

    return parsed as ParsedBooking;
  } catch (error) {
    console.error("OpenAI JSON mode parsing error:", error);
    return null;
  }
}
