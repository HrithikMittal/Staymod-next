"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BedDoubleIcon } from "lucide-react";
import { FormEvent, useState } from "react";

import type { CreateRoomPayload, RoomListItem } from "@/api-clients";
import { RoomAmenityChecklist } from "@/components/global/room-amenity-checklist";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiMutation } from "@/hooks";
import { cn } from "@/lib/utils";
import { ROOM_STATUSES, ROOM_TYPES } from "@/types/room";

const EMPTY_FORM: CreateRoomPayload = {
  name: "",
  type: "double",
  status: "active",
  maxGuests: 2,
  amenities: [],
};

const borderless =
  "border-0 bg-transparent shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:border-0";

const pill =
  "inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm shadow-sm";

const pillSelect = cn(
  borderless,
  "max-w-[9rem] cursor-pointer text-sm font-medium text-foreground",
);

const pillInput = cn(
  borderless,
  "min-w-0 flex-1 text-sm font-medium placeholder:text-muted-foreground/70",
);

type CreateRoomDialogProps = {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateRoomDialog({ propertyId, open, onOpenChange }: CreateRoomDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateRoomPayload>(EMPTY_FORM);
  const [selectedPresetAmenities, setSelectedPresetAmenities] = useState<string[]>([]);
  const [extraAmenitiesText, setExtraAmenitiesText] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setForm(EMPTY_FORM);
      setSelectedPresetAmenities([]);
      setExtraAmenitiesText("");
    }
  }

  const createRoomMutation = useApiMutation<{ room: RoomListItem }, CreateRoomPayload>(
    `/api/properties/${propertyId}/rooms`,
    undefined,
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
        handleOpenChange(false);
      },
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const extra = extraAmenitiesText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const amenities = [...new Set([...selectedPresetAmenities, ...extra])];
    createRoomMutation.mutate({
      ...form,
      amenities,
    });
  }

  function handlePresetToggle(label: string, checked: boolean) {
    setSelectedPresetAmenities((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  }

  const descriptionClass = cn(
    borderless,
    "min-h-[150px] w-full resize-none text-[15px] leading-relaxed",
    "placeholder:text-muted-foreground/60",
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          "rounded-2xl ring-1 ring-foreground/8",
        )}
        showCloseButton
      >
        <DialogTitle className="sr-only">New room</DialogTitle>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          {/* Hero: breadcrumb, icon, title, tagline, pills */}
          <div className="shrink-0 space-y-4 px-8 pt-11 pb-2 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Rooms · New room
            </p>

            <div className="flex items-start gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground"
                aria-hidden
              >
                <BedDoubleIcon className="size-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  id="room-name"
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Room name"
                  required
                  className={cn(
                    borderless,
                    "w-full text-2xl font-semibold tracking-tight placeholder:text-muted-foreground/45",
                  )}
                  autoComplete="off"
                />
                <input
                  id="room-tagline"
                  name="tagline"
                  value={form.tagline ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, tagline: event.target.value || undefined }))
                  }
                  placeholder="Add a short summary…"
                  className={cn(
                    borderless,
                    "w-full text-[15px] text-muted-foreground placeholder:text-muted-foreground/55",
                  )}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={pill}>
                <span className="text-xs text-muted-foreground">Type</span>
                <select
                  id="room-type"
                  name="type"
                  className={pillSelect}
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as CreateRoomPayload["type"],
                    }))
                  }
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className={pill}>
                <span className="text-xs text-muted-foreground">Status</span>
                <select
                  id="room-status"
                  name="status"
                  className={pillSelect}
                  value={form.status ?? "active"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as CreateRoomPayload["status"],
                    }))
                  }
                >
                  {ROOM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className={pill}>
                <span className="text-xs text-muted-foreground">Guests</span>
                <input
                  id="room-guests"
                  name="maxGuests"
                  type="number"
                  min={1}
                  value={form.maxGuests ?? 2}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      maxGuests: Number.parseInt(event.target.value, 10) || 1,
                    }))
                  }
                  className={cn(pillInput, "w-12 text-center tabular-nums")}
                  required
                />
              </div>

              <div className={cn(pill, "min-w-[5.5rem] flex-1 sm:flex-initial")}>
                <span className="text-xs text-muted-foreground">Floor</span>
                <input
                  id="room-floor"
                  name="floor"
                  value={form.floor ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, floor: event.target.value || undefined }))
                  }
                  placeholder="—"
                  className={cn(pillInput, "w-16")}
                />
              </div>

              <div className={cn(pill, "min-w-[min(100%,12rem)] flex-[1_1_100%] sm:flex-1")}>
                <span className="text-xs text-muted-foreground">Beds</span>
                <input
                  id="room-bed"
                  name="bedSize"
                  value={form.bedSize ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bedSize: event.target.value || undefined }))
                  }
                  placeholder="e.g. King"
                  className={pillInput}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-2">
            <div className="space-y-6 py-4">
              <hr className="border-border/50" />

              <div className="space-y-2">
                <textarea
                  id="room-description"
                  name="description"
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value || undefined }))
                  }
                  placeholder="Write a description…"
                  className={descriptionClass}
                  rows={5}
                />
              </div>

              <hr className="border-border/50" />

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Standard rates
                </p>
                <p className="text-xs text-muted-foreground/90">
                  Same currency as this property. Leave blank if pricing varies.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Weekday</span>
                    <input
                      id="room-price-wd"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.priceWeekday ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          priceWeekday: raw === "" ? undefined : Number.parseFloat(raw),
                        }));
                      }}
                      placeholder="0"
                      className={cn(
                        borderless,
                        "w-full border-b border-border/70 pb-1.5 text-lg font-medium tabular-nums",
                        "placeholder:text-muted-foreground/40 focus-visible:border-primary",
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Weekend</span>
                    <input
                      id="room-price-we"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.priceWeekend ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          priceWeekend: raw === "" ? undefined : Number.parseFloat(raw),
                        }));
                      }}
                      placeholder="0"
                      className={cn(
                        borderless,
                        "w-full border-b border-border/70 pb-1.5 text-lg font-medium tabular-nums",
                        "placeholder:text-muted-foreground/40 focus-visible:border-primary",
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/25 p-4 sm:p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-foreground">Amenities</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tick what applies, then list anything extra.
                  </p>
                </div>
                <RoomAmenityChecklist
                  embedded
                  selected={selectedPresetAmenities}
                  onToggle={handlePresetToggle}
                  extraText={extraAmenitiesText}
                  onExtraTextChange={setExtraAmenitiesText}
                />
              </div>

              {createRoomMutation.error ? (
                <p className="text-sm text-destructive">{createRoomMutation.error.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-8 py-4">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRoomMutation.isPending} className="min-w-[7.5rem]">
              {createRoomMutation.isPending ? "Creating…" : "Create room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
