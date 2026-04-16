"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UpsertBookingOptionPayload } from "@/api-clients";
import { FormEvent, useState } from "react";

type BookingOptionFormProps = {
  initialValue?: UpsertBookingOptionPayload;
  submitLabel: string;
  pendingLabel: string;
  errorMessage?: string;
  isPending?: boolean;
  onSubmit: (payload: UpsertBookingOptionPayload) => void;
  onCancel?: () => void;
};

const EMPTY_FORM: UpsertBookingOptionPayload = {
  name: "",
  description: "",
  appliesTo: "user",
  frequency: "day",
  pricePerUnit: 0,
  isActive: true,
  sortOrder: 0,
};

export function BookingOptionForm({
  initialValue,
  submitLabel,
  pendingLabel,
  errorMessage,
  isPending,
  onSubmit,
  onCancel,
}: BookingOptionFormProps) {
  const [form, setForm] = useState<UpsertBookingOptionPayload>(() => initialValue ?? EMPTY_FORM);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...form,
      description: form.description?.trim() || undefined,
      isActive: form.isActive ?? true,
      sortOrder: form.sortOrder ?? 0,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Name</span>
          <Input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Food Plan"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Price per unit</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.pricePerUnit}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                pricePerUnit: Number.parseFloat(event.target.value || "0"),
              }))
            }
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Applies to</span>
          <select
            className={cn(
              "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
            value={form.appliesTo}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                appliesTo: event.target.value as UpsertBookingOptionPayload["appliesTo"],
              }))
            }
          >
            <option value="user">Per User</option>
            <option value="room">Per Room</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Frequency</span>
          <select
            className={cn(
              "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
            value={form.frequency}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                frequency: event.target.value as UpsertBookingOptionPayload["frequency"],
              }))
            }
          >
            <option value="day">Per Day</option>
            <option value="booking">Per Booking</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase">Description</span>
        <textarea
          value={form.description ?? ""}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Optional details shown to booking team."
          className={cn(
            "min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Sort order</span>
          <Input
            type="number"
            step={1}
            value={form.sortOrder ?? 0}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                sortOrder: Number.parseInt(event.target.value || "0", 10),
              }))
            }
          />
        </label>

        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={Boolean(form.isActive)}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          <span className="text-sm">Active</span>
        </label>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
