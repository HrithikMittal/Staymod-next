/** Row shape from `GET .../room-availability` (unit-level). */
export type AvailabilityUnitRow = {
  rowId: string;
  roomId: string;
  listingName: string;
  roomType: string;
  unitLabel: string;
  cells: { dateKey: string; isFull: boolean; price: number | null; priceIsOverride?: boolean }[];
};

export type GroupedRoomListing = {
  roomId: string;
  listingName: string;
  roomType: string;
  unitRows: AvailabilityUnitRow[];
};

/** Preserves API row order; groups units under each room listing (`roomId`). */
export function groupAvailabilityRowsByListing(rows: AvailabilityUnitRow[]): GroupedRoomListing[] {
  const byRoom = new Map<string, AvailabilityUnitRow[]>();
  const order: string[] = [];

  for (const row of rows) {
    if (!byRoom.has(row.roomId)) {
      order.push(row.roomId);
      byRoom.set(row.roomId, []);
    }
    byRoom.get(row.roomId)!.push(row);
  }

  return order.map((roomId) => {
    const unitRows = byRoom.get(roomId)!;
    const first = unitRows[0]!;
    return {
      roomId,
      listingName: first.listingName,
      roomType: first.roomType,
      unitRows,
    };
  });
}
