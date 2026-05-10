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
    // Resend sends webhook event with metadata
    const webhookData = await request.json();

    console.log('📧 Inbound webhook received:', {
      type: webhookData.type,
      emailId: webhookData.data?.email_id,
    });

    // Only process email.received events
    if (webhookData.type !== 'email.received') {
      console.log('ℹ️  Skipping non-email event:', webhookData.type);
      return NextResponse.json({ success: true, skipped: true });
    }

    const emailData = webhookData.data;

    console.log('📧 Email metadata:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      emailId: emailData.email_id,
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

    // Verify property exists
    const db = await getDb();
    const property = await db.collection('properties').findOne({
      _id: new ObjectId(propertyId),
    });

    if (!property) {
      console.log('❌ Property not found:', propertyId);
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch full email content from Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log('🔍 Fetching email content from Resend...');
    const emailContentResponse = await fetch(
      `https://api.resend.com/emails/${emailData.email_id}`,
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
        },
      }
    );

    if (!emailContentResponse.ok) {
      console.error('❌ Failed to fetch email content:', emailContentResponse.status);
      return NextResponse.json(
        { error: 'Failed to fetch email content' },
        { status: 500 }
      );
    }

    const fullEmailData = await emailContentResponse.json();
    console.log('✅ Email content fetched:', {
      hasText: !!fullEmailData.text,
      hasHtml: !!fullEmailData.html,
    });

    // Parse email body
    const emailBody = fullEmailData.text || fullEmailData.html || '';

    if (!emailBody) {
      console.log('❌ Email has no body');
      return NextResponse.json({ error: 'Email has no content' }, { status: 400 });
    }

    // Parse email using OpenAI LLM
    console.log('🤖 Parsing email with OpenAI GPT-4...');
    const bookingData = await parseOTAEmailWithLLM(
      fullEmailData.from || emailData.from,
      fullEmailData.subject || emailData.subject,
      emailBody
    );

    if (!bookingData) {
      console.log('ℹ️  Not a booking confirmation email');

      // Store as unprocessed email for potential review
      await db.collection('unprocessedEmails').insertOne({
        propertyId: new ObjectId(propertyId),
        from: fullEmailData.from || emailData.from,
        subject: fullEmailData.subject || emailData.subject,
        receivedAt: new Date(),
        reason: 'not_a_booking_confirmation',
        emailPreview: emailBody.substring(0, 500),
        resendEmailId: emailData.email_id,
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
        {
          ...fullEmailData,
          resendEmailId: emailData.email_id,
          to: emailData.to,
        }
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
        from: fullEmailData.from || emailData.from,
        subject: fullEmailData.subject || emailData.subject,
        parsedData: bookingData,
        error: bookingError instanceof Error ? bookingError.message : 'Unknown error',
        receivedAt: new Date(),
        resendEmailId: emailData.email_id,
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
