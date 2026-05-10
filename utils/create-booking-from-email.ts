import { getDb } from "@/utils/mongodb";
import { ObjectId } from "mongodb";
import type { ParsedBooking } from "./parse-ota-email-llm";

/**
 * Create a booking in Staymod from parsed email data.
 * Handles duplicate detection, room matching, and proper data formatting.
 */
export async function createBookingFromParsedData(
  property: any,
  bookingData: ParsedBooking,
  rawEmail: any
) {
  const db = await getDb();

  // 1. Check for duplicate bookings
  if (bookingData.confirmationCode) {
    const existing = await db.collection('bookings').findOne({
      propertyId: property._id,
      'externalReference.confirmationCode': bookingData.confirmationCode,
      'externalReference.source': bookingData.source,
    });

    if (existing) {
      console.log('⚠️  Booking already exists:', existing._id.toString());
      return existing;
    }
  }

  // Also check by guest name + dates (in case confirmation code missing)
  const duplicateByGuestAndDates = await db.collection('bookings').findOne({
    propertyId: property._id,
    guestName: bookingData.guestName,
    checkIn: new Date(bookingData.checkIn),
    checkOut: new Date(bookingData.checkOut),
    status: { $in: ['confirmed', 'checked_in', 'pending'] }, // Exclude cancelled
  });

  if (duplicateByGuestAndDates) {
    console.log('⚠️  Similar booking already exists (same guest + dates):', duplicateByGuestAndDates._id.toString());
    return duplicateByGuestAndDates;
  }

  // 2. Get rooms for this property
  const rooms = await db.collection('rooms').find({
    propertyId: property._id,
  }).toArray();

  if (rooms.length === 0) {
    throw new Error('No rooms found for this property. Please create at least one room first.');
  }

  // 3. Smart room matching
  let assignedRoom = rooms[0]; // Default to first room

  if (bookingData.roomType || bookingData.roomNumber) {
    const matchedRoom = rooms.find(room => {
      // Match by room number (highest priority)
      if (bookingData.roomNumber && room.roomNumbers?.includes(bookingData.roomNumber)) {
        return true;
      }

      // Match by room type/name (fuzzy matching)
      if (bookingData.roomType) {
        const roomTypeLower = bookingData.roomType.toLowerCase();
        const roomNameLower = room.name.toLowerCase();
        const roomTypeEnumLower = room.type.toLowerCase().replace(/_/g, ' ');

        if (
          roomNameLower.includes(roomTypeLower) ||
          roomTypeLower.includes(roomNameLower) ||
          roomTypeEnumLower.includes(roomTypeLower)
        ) {
          return true;
        }
      }

      return false;
    });

    if (matchedRoom) {
      assignedRoom = matchedRoom;
      console.log('✅ Matched room:', assignedRoom.name);
    } else {
      console.log('⚠️  Could not match room, using default:', assignedRoom.name);
    }
  }

  // 4. Create booking object
  const booking = {
    _id: new ObjectId(),
    orgId: property.orgId,
    propertyId: property._id,

    // Guest information
    guestName: bookingData.guestName,
    guestEmail: bookingData.guestEmail,
    guestPhone: bookingData.guestPhone,
    numberOfGuests: bookingData.numberOfGuests,
    specialRequests: bookingData.specialRequests,

    // Dates
    checkIn: new Date(bookingData.checkIn),
    checkOut: new Date(bookingData.checkOut),

    // Room assignment
    rooms: {
      [assignedRoom._id.toString()]: {
        roomType: assignedRoom.type,
        quantity: 1,
        roomNumbers: bookingData.roomNumber ? [bookingData.roomNumber] : [],
      },
    },

    // Pricing (imported bookings treated as paid by OTA)
    selectedOptions: [],
    customItems: bookingData.totalAmount ? [
      {
        name: `${bookingData.source} booking (imported)`,
        amount: bookingData.totalAmount,
      }
    ] : [],
    discount: 0,
    advanceAmount: bookingData.netAmount || bookingData.totalAmount || 0, // Use net amount if available

    // Status - OTA bookings are already confirmed
    status: 'confirmed',

    // External reference for tracking
    externalReference: {
      source: bookingData.source,
      confirmationCode: bookingData.confirmationCode,
      totalAmount: bookingData.totalAmount,
      grossCharges: bookingData.grossCharges,
      otaCommission: bookingData.otaCommission,
      netAmount: bookingData.netAmount,
      currency: bookingData.currency,
      importedFrom: 'email',
      importedAt: new Date(),
      rawEmail: {
        from: rawEmail.from,
        subject: rawEmail.subject,
        messageId: rawEmail.messageId,
        receivedAt: new Date(),
      },
    },

    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 5. Insert booking
  await db.collection('bookings').insertOne(booking);

  console.log('✅ Created booking:', {
    id: booking._id.toString(),
    source: bookingData.source,
    guest: bookingData.guestName,
    dates: `${bookingData.checkIn} to ${bookingData.checkOut}`,
    room: assignedRoom.name,
    confirmation: bookingData.confirmationCode,
  });

  return booking;
}
