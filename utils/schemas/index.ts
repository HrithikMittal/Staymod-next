/** Property create/parse helpers and document builders. */
export {
  createPropertyDocument,
  parseCreatePropertyInput,
} from "./property";

/** Room create/parse helpers and document builders (scoped by org + property). */
export {
  createRoomDocument,
  parseCreateRoomInput,
  parsePropertyId,
  parseRoomId,
} from "./room";

/** Booking create/parse helpers (room type resolved from `Room`). */
export {
  createBookingDocument,
  parseBookingId,
  parseCreateBookingBody,
} from "./booking";

/** Room availability document helpers. */
export {
  createRoomAvailabilityDocument,
  ensureDateKey,
  ensureRoomTypeForAvailability,
} from "./room-availability";

/** Booking option create/parse helpers (extra chargeable services). */
export {
  createBookingOptionDocument,
  parseBookingOptionId,
  parseCreateBookingOptionInput,
} from "./booking-option";
