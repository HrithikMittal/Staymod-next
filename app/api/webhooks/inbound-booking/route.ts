import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/mongodb";
import { ObjectId } from "mongodb";
import { parseOTAEmailWithLLM } from "@/utils/parse-ota-email-llm";
import { createBookingFromParsedData } from "@/utils/create-booking-from-email";

/**
 * Webhook handler for inbound booking emails from Resend.
 * Parses OTA confirmation emails using OpenAI and creates bookings automatically.
 *
 * POST /api/webhooks/inbound-booking
 */
export async function POST(request: NextRequest) {
  try {
    // Resend sends email data as JSON
    const emailData = await request.json();

    console.log('📧 Inbound email received:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
    });

    // Extract propertyId from recipient email
    // Format: property-inbound-{propertyId}@staymod.in
    const toEmail = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;
    const propertyIdMatch = toEmail.match(/property-inbound-([a-f0-9]{24})@/i);

    if (!propertyIdMatch) {
      console.log('❌ Invalid email format:', toEmail);
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const propertyId = propertyIdMatch[1];

    // Verify property exists and has inbound sync enabled
    const db = await getDb();
    const property = await db.collection('properties').findOne({
      _id: new ObjectId(propertyId),
    });

    if (!property) {
      console.log('❌ Property not found:', propertyId);
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Parse email body (Resend sends both text and html)
    const emailBody = emailData.text || emailData.html || '';

    if (!emailBody) {
      console.log('❌ Email has no body');
      return NextResponse.json({ error: 'Email has no content' }, { status: 400 });
    }

    // Parse email using OpenAI LLM
    console.log('🤖 Parsing email with OpenAI GPT-4...');
    const bookingData = await parseOTAEmailWithLLM(
      emailData.from,
      emailData.subject,
      emailBody
    );

    if (!bookingData) {
      console.log('ℹ️  Not a booking confirmation email');

      // Store as unprocessed email for potential review
      await db.collection('unprocessedEmails').insertOne({
        propertyId: new ObjectId(propertyId),
        from: emailData.from,
        subject: emailData.subject,
        receivedAt: new Date(),
        reason: 'not_a_booking_confirmation',
        emailPreview: emailBody.substring(0, 500),
      });

      return NextResponse.json({
        success: true,
        message: 'Email received but not a booking confirmation',
        processed: false,
      });
    }

    console.log('✅ LLM extracted booking data:', {
      source: bookingData.source,
      guest: bookingData.guestName,
      dates: `${bookingData.checkIn} to ${bookingData.checkOut}`,
      confirmationCode: bookingData.confirmationCode,
    });

    // Create booking in Staymod
    try {
      const booking = await createBookingFromParsedData(
        property,
        bookingData,
        emailData
      );

      console.log('🎉 Booking created successfully:', booking._id.toString());

      return NextResponse.json({
        success: true,
        processed: true,
        bookingId: booking._id.toString(),
        source: bookingData.source,
        guestName: bookingData.guestName,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
      });
    } catch (bookingError) {
      console.error('❌ Failed to create booking:', bookingError);

      // Store as failed processing
      await db.collection('failedBookingImports').insertOne({
        propertyId: new ObjectId(propertyId),
        from: emailData.from,
        subject: emailData.subject,
        parsedData: bookingData,
        error: bookingError instanceof Error ? bookingError.message : 'Unknown error',
        receivedAt: new Date(),
      });

      return NextResponse.json({
        error: 'Failed to create booking',
        details: bookingError instanceof Error ? bookingError.message : 'Unknown error',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Inbound booking webhook error:', error);
    return NextResponse.json({
      error: 'Failed to process email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow Resend webhook to bypass auth
export const runtime = 'nodejs';
