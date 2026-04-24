"use client";

import type { ChangeEvent } from "react";

import type { BookingOptionItem } from "@/api-clients/booking-options";
import type { RoomListItem } from "@/api-clients/rooms";
import type { PurposalBuilderFormState } from "@/components/global/purposal-builder/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PurposalFormProps = {
  value: PurposalBuilderFormState;
  onChange: (next: PurposalBuilderFormState) => void;
  rooms: RoomListItem[];
  bookingOptions: BookingOptionItem[];
};

function parseNum(v: string): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function PurposalForm({ value, onChange, rooms, bookingOptions }: PurposalFormProps) {
  const setText =
    (key: keyof PurposalBuilderFormState) => (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...value, [key]: ev.target.value });
    };
  const setNum = (key: keyof PurposalBuilderFormState) => (ev: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [key]: parseNum(ev.target.value) });
  };
  const updateRoomSelection = (idx: number, patch: { roomId?: string; quantity?: number }) => {
    const next = value.roomSelections.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    onChange({ ...value, roomSelections: next });
  };
  const removeRoomSelection = (idx: number) => {
    onChange({ ...value, roomSelections: value.roomSelections.filter((_, i) => i !== idx) });
  };
  const addRoomSelection = () => {
    const fallbackRoomId = rooms[0]?._id ?? "";
    onChange({
      ...value,
      roomSelections: [...value.roomSelections, { roomId: fallbackRoomId, quantity: 1 }],
    });
  };
  const updateOptionQty = (bookingOptionId: string, quantity: number) => {
    const existing = value.bookingOptionSelections.find((row) => row.bookingOptionId === bookingOptionId);
    if (existing) {
      onChange({
        ...value,
        bookingOptionSelections: value.bookingOptionSelections.map((row) =>
          row.bookingOptionId === bookingOptionId ? { ...row, quantity } : row,
        ),
      });
      return;
    }
    onChange({
      ...value,
      bookingOptionSelections: [...value.bookingOptionSelections, { bookingOptionId, quantity }],
    });
  };
  const optionQty = (bookingOptionId: string) =>
    value.bookingOptionSelections.find((row) => row.bookingOptionId === bookingOptionId)?.quantity ?? 0;

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Input details</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Guests</Label>
          <Input type="number" min={1} value={value.guests} onChange={setNum("guests")} />
        </div>
        <div className="space-y-1.5">
          <Label>Nights</Label>
          <Input type="number" min={1} value={value.nights} onChange={setNum("nights")} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Rooms</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRoomSelection} disabled={rooms.length === 0}>
            Add room
          </Button>
        </div>
        {value.roomSelections.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rooms added yet.</p>
        ) : (
          <div className="space-y-2">
            {value.roomSelections.map((row, idx) => (
              <div key={`room-row-${idx}`} className="grid grid-cols-[1fr_92px_auto] gap-2">
                <select
                  value={row.roomId}
                  onChange={(ev) => updateRoomSelection(idx, { roomId: ev.target.value })}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(ev) => updateRoomSelection(idx, { quantity: parseNum(ev.target.value) })}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRoomSelection(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Room rate (per night)</Label>
          <Input type="number" min={0} value={value.roomRatePerNight} onChange={setNum("roomRatePerNight")} />
        </div>
        <div className="space-y-1.5">
          <Label>B2B rate (per person/night)</Label>
          <Input type="number" min={0} value={value.b2bRatePerPersonNight} onChange={setNum("b2bRatePerPersonNight")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mattress count</Label>
          <Input type="number" min={0} value={value.mattressCount} onChange={setNum("mattressCount")} />
        </div>
        <div className="space-y-1.5">
          <Label>Mattress rate (per day/count)</Label>
          <Input type="number" min={0} value={value.mattressRatePerDay} onChange={setNum("mattressRatePerDay")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Booking options</Label>
        {bookingOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No booking options found for this property.</p>
        ) : (
          <div className="space-y-2">
            {bookingOptions.map((option) => (
              <div key={option._id} className="grid grid-cols-[1fr_92px] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{option.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rs. {Math.round(option.pricePerUnit).toLocaleString("en-IN")} / {option.frequency}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={optionQty(option._id)}
                  onChange={(ev) => updateOptionQty(option._id, parseNum(ev.target.value))}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>B2B note</Label>
        <Textarea rows={2} value={value.b2bNote} onChange={setText("b2bNote")} />
      </div>
    </section>
  );
}
