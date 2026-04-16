"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, BedDoubleIcon, ImageIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { CreateRoomPayload, ListRoomTagsResponse, RoomListItem } from "@/api-clients";
import { createRoom, createRoomImageUploadUrl, updateRoom } from "@/api-clients/rooms";
import { RoomAmenityChecklist } from "@/components/global/room-amenity-checklist";
import { RoomNumberFields } from "@/components/global/room-number-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiQuery } from "@/hooks";
import { splitAmenitiesForEditForm } from "@/constants/room-amenity-presets";
import { cn } from "@/lib/utils";
import { ROOM_STATUSES, ROOM_TYPES } from "@/types/room";

const EMPTY_FORM: CreateRoomPayload = {
  name: "",
  type: "double",
  status: "active",
  maxGuests: 2,
  bedCount: 1,
  unitCount: 1,
  roomNumbers: [""],
  imageUrls: [""],
  tagNames: [],
  amenities: [],
};

type RoomImageDraft = {
  url: string;
  tagIds?: string[];
  sortOrder: number;
};

function padRoomNumbers(unitCount: number, existing?: string[]): string[] {
  const n = Math.max(1, unitCount);
  const base = Array.isArray(existing) ? existing : [];
  return Array.from({ length: n }, (_, i) => base[i] ?? "");
}

function normalizeRoomImages(images: RoomImageDraft[]): RoomImageDraft[] {
  return images.map((img, idx) => ({ ...img, sortOrder: idx }));
}

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
  /** When set, the dialog updates this room; otherwise it creates a new one. */
  room?: RoomListItem | null;
};

export function CreateRoomDialog({
  propertyId,
  open,
  onOpenChange,
  room = null,
}: CreateRoomDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(room);
  const [form, setForm] = useState<CreateRoomPayload>(EMPTY_FORM);
  const [roomImages, setRoomImages] = useState<RoomImageDraft[]>([{ url: "", sortOrder: 0 }]);
  const [tagNamesText, setTagNamesText] = useState("");
  const [roomNumberError, setRoomNumberError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  /** Free-text amenities line; preset checkboxes live in `form.amenities`. */
  const [amenitiesExtraText, setAmenitiesExtraText] = useState("");
  const imageStripRef = useRef<HTMLDivElement | null>(null);
  const imageStripDragState = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startScrollLeft: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });

  const roomTagsQuery = useApiQuery<ListRoomTagsResponse>(
    ["room-tags", propertyId],
    `/api/properties/${propertyId}/room-tags`,
    undefined,
    { enabled: Boolean(propertyId && open) },
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (room) {
      const unitCount = room.unitCount ?? 1;
      const amenitySplit = splitAmenitiesForEditForm(room.amenities ?? []);
      setForm({
        name: room.name,
        type: room.type as CreateRoomPayload["type"],
        status: (room.status as CreateRoomPayload["status"]) ?? "active",
        tagline: room.tagline,
        description: room.description,
        floor: room.floor,
        maxGuests: room.maxGuests,
        bedCount: room.bedCount ?? 1,
        unitCount,
        roomNumbers: padRoomNumbers(unitCount, room.roomNumbers),
        bedSize: room.bedSize ?? room.bedSummary,
        priceWeekday: room.priceWeekday,
        priceWeekend: room.priceWeekend,
        imageUrls: room.imageUrls && room.imageUrls.length > 0 ? room.imageUrls : [],
        roomImages:
          room.roomImages && room.roomImages.length > 0
            ? room.roomImages.map((img, idx) => ({
                url: img.url,
                tagIds: img.tagIds,
                sortOrder: idx,
              }))
            : (room.imageUrls ?? []).map((url, idx) => ({ url, sortOrder: idx })),
        tagNames: room.tags?.map((tag) => tag.name) ?? [],
        isActive: room.isActive,
        sortOrder: room.sortOrder,
        amenities: amenitySplit.selectedPresets,
      });
      setAmenitiesExtraText(amenitySplit.extraText);
      const initialRoomImages = room.roomImages?.length
        ? room.roomImages.map((img, idx) => ({
            url: img.url,
            tagIds: img.tagIds,
            sortOrder: idx,
          }))
        : (room.imageUrls ?? []).map((url, idx) => ({ url, sortOrder: idx }));
      setRoomImages(initialRoomImages.length > 0 ? initialRoomImages : [{ url: "", sortOrder: 0 }]);
      setTagNamesText((room.tags ?? []).map((tag) => tag.name).join(", "));
    } else {
      setForm(EMPTY_FORM);
      setRoomImages([{ url: "", sortOrder: 0 }]);
      setTagNamesText("");
      setAmenitiesExtraText("");
    }
    setRoomNumberError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room identity via _id + updatedAt
  }, [open, room?._id, room?.updatedAt]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setForm(EMPTY_FORM);
      setRoomImages([{ url: "", sortOrder: 0 }]);
      setTagNamesText("");
      setAmenitiesExtraText("");
      setImageUploadError(null);
      setUploadingImageIndex(null);
      setDraggingImageIndex(null);
    }
    setRoomNumberError(null);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: CreateRoomPayload) =>
      room
        ? updateRoom(propertyId, room._id, payload)
        : createRoom(propertyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      handleOpenChange(false);
    },
  });

  async function uploadImageFile(file: File, index: number) {
    setImageUploadError(null);
    setUploadingImageIndex(index);
    try {
      const signed = await createRoomImageUploadUrl(propertyId, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });

      const putRes = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status}).`);
      }

      setRoomImages((prev) =>
        normalizeRoomImages(prev.map((img, i) => (i === index ? { ...img, url: signed.fileUrl } : img))),
      );
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Failed to upload image.");
    } finally {
      setUploadingImageIndex(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoomNumberError(null);
    const parsedTagNames = tagNamesText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const normalizedImages = normalizeRoomImages(
      roomImages
        .map((img) => ({ ...img, url: img.url.trim() }))
        .filter((img) => Boolean(img.url))
        .map((img) => ({
          ...img,
          tagIds: img.tagIds?.length ? [...new Set(img.tagIds)] : undefined,
        })),
    );
    const imageUrls = normalizedImages.map((img) => img.url);
    const nums = (form.roomNumbers ?? []).map((s) => s.trim());
    const allEmpty = nums.every((s) => !s);
    if (!allEmpty && nums.some((s) => !s)) {
      setRoomNumberError("Enter a room number for each unit, or clear all room number fields.");
      return;
    }
    const extraAmenities = amenitiesExtraText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const mergedAmenities = [...new Set([...(form.amenities ?? []), ...extraAmenities])];
    saveMutation.mutate({
      ...form,
      amenities: mergedAmenities,
      tagNames: [...new Set(parsedTagNames)],
      roomImages: normalizedImages,
      imageUrls,
      roomNumbers: allEmpty ? [] : nums,
    });
  }

  function handleAmenityPresetToggle(label: string, checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.amenities ?? []);
      if (checked) {
        next.add(label);
      } else {
        next.delete(label);
      }
      return { ...prev, amenities: Array.from(next) };
    });
  }

  const descriptionClass = cn(
    borderless,
    "min-h-[150px] w-full resize-none text-[15px] leading-relaxed",
    "placeholder:text-muted-foreground/60",
  );

  const breadcrumb = isEdit ? "Rooms · Edit room" : "Rooms · New room";
  const dialogTitle = isEdit ? "Edit room" : "New room";
  const submitLabel = isEdit ? "Save changes" : "Create room";
  const pendingLabel = isEdit ? "Saving…" : "Creating…";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(90vh,880px)] max-h-[min(90vh,880px)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          "rounded-2xl ring-1 ring-foreground/8",
        )}
        showCloseButton
      >
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="shrink-0 space-y-4 border-b border-border/60 bg-background px-8 pt-11 pb-4 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {breadcrumb}
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
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-4 pr-14">
            <div className="space-y-6 py-4">
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

              <div className={pill}>
                <span className="text-xs text-muted-foreground">No. of beds</span>
                <input
                  id="room-bed-count"
                  name="bedCount"
                  type="number"
                  min={1}
                  value={form.bedCount ?? 1}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      bedCount: Number.parseInt(event.target.value, 10) || 1,
                    }))
                  }
                  className={cn(pillInput, "w-12 text-center tabular-nums")}
                  required
                  title="Physical beds or sleep surfaces (each bunk level counts as one bed)"
                />
              </div>

              <div className={pill}>
                <span className="text-xs text-muted-foreground">No. of rooms</span>
                <input
                  id="room-unit-count"
                  name="unitCount"
                  type="number"
                  min={1}
                  value={form.unitCount ?? 1}
                  onChange={(event) => {
                    const nextCount = Math.max(1, Number.parseInt(event.target.value, 10) || 1);
                    setForm((prev) => {
                      const prevNums = prev.roomNumbers ?? [];
                      const nextNums = Array.from({ length: nextCount }, (_, i) => prevNums[i] ?? "");
                      return { ...prev, unitCount: nextCount, roomNumbers: nextNums };
                    });
                  }}
                  className={cn(pillInput, "w-12 text-center tabular-nums")}
                  required
                  title="How many physical rooms share this name, rates, tags, and setup (e.g. 2 identical Deluxe rooms)"
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

              <RoomNumberFields
                unitCount={form.unitCount ?? 1}
                values={form.roomNumbers ?? []}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, roomNumbers: next }))
                }
              />
              {roomNumberError ? (
                <p className="text-sm text-destructive" role="alert">
                  {roomNumberError}
                </p>
              ) : null}

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

              <div className="rounded-xl border border-border/60 bg-muted/25 p-4 sm:p-5">
                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Facilities & amenities
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select features that apply to this room, or add more below.
                  </p>
                </div>
                <RoomAmenityChecklist
                  embedded
                  selected={form.amenities ?? []}
                  onToggle={handleAmenityPresetToggle}
                  extraText={amenitiesExtraText}
                  onExtraTextChange={setAmenitiesExtraText}
                />
              </div>

              <hr className="border-border/50" />

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
                <input
                  id="room-tags"
                  name="tagNames"
                  value={tagNamesText}
                  onChange={(event) => setTagNamesText(event.target.value)}
                  placeholder="e.g. Sea view, Balcony, Family friendly"
                  className={cn(
                    borderless,
                    "w-full border-b border-border/70 pb-1.5 text-sm",
                    "placeholder:text-muted-foreground/50 focus-visible:border-primary",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Use comma-separated tags. Tags are stored in a separate schema and linked to this room.
                </p>
              </div>

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
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Room images</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Upload from your device (presigned S3) or paste an image URL.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRoomImages((prev) => normalizeRoomImages([...prev, { url: "", sortOrder: prev.length }]))
                    }
                  >
                    <PlusIcon className="size-4" />
                    Add image
                  </Button>
                </div>
                <div
                  ref={imageStripRef}
                  className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (
                      target.closest(
                        "input,textarea,select,button,[role='menuitemcheckbox'],[contenteditable='true']",
                      )
                    ) {
                      return;
                    }
                    const el = imageStripRef.current;
                    if (!el) return;
                    imageStripDragState.current = {
                      active: true,
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startScrollLeft: el.scrollLeft,
                    };
                    el.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const state = imageStripDragState.current;
                    const el = imageStripRef.current;
                    if (!state.active || !el || state.pointerId !== event.pointerId) return;
                    const dx = event.clientX - state.startX;
                    el.scrollLeft = state.startScrollLeft - dx;
                  }}
                  onPointerUp={(event) => {
                    const state = imageStripDragState.current;
                    const el = imageStripRef.current;
                    if (state.pointerId !== event.pointerId) return;
                    imageStripDragState.current.active = false;
                    imageStripDragState.current.pointerId = null;
                    if (el?.hasPointerCapture(event.pointerId)) {
                      el.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    const state = imageStripDragState.current;
                    const el = imageStripRef.current;
                    if (state.pointerId !== event.pointerId) return;
                    imageStripDragState.current.active = false;
                    imageStripDragState.current.pointerId = null;
                    if (el?.hasPointerCapture(event.pointerId)) {
                      el.releasePointerCapture(event.pointerId);
                    }
                  }}
                >
                  {roomImages.map((image, idx) => (
                    <div
                      key={`room-image-${idx}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", String(idx));
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingImageIndex(idx);
                      }}
                      onDragEnd={() => setDraggingImageIndex(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceIdxRaw = event.dataTransfer.getData("text/plain");
                        const sourceIdx = Number.parseInt(sourceIdxRaw, 10);
                        if (!Number.isFinite(sourceIdx) || sourceIdx === idx) return;
                        setRoomImages((prev) => {
                          const next = [...prev];
                          const [moved] = next.splice(sourceIdx, 1);
                          next.splice(idx, 0, moved);
                          return normalizeRoomImages(next);
                        });
                        setDraggingImageIndex(null);
                      }}
                      className={cn(
                        "w-[min(100%,320px)] min-w-[280px] rounded-lg border border-border/60 bg-background/70 p-3",
                        draggingImageIndex === idx && "opacity-60",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <ImageIcon className="size-4 shrink-0" />
                          Image {idx + 1}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Drag to reorder</div>
                      </div>
                      <div className="space-y-2">
                        <div className="overflow-hidden rounded-md border border-border/60 bg-muted/20">
                          {image.url ? (
                            <img
                              src={image.url}
                              alt={`Room image ${idx + 1}`}
                              className="h-40 w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                              No image selected
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button type="button" variant="outline" size="sm" className="w-full justify-between" />
                            }
                          >
                            <span className="truncate">
                              {(image.tagIds?.length ?? 0) > 0
                                ? `${image.tagIds!.length} tag${image.tagIds!.length === 1 ? "" : "s"} selected`
                                : "Select tags"}
                            </span>
                            <span className="text-xs text-muted-foreground">Multi-select</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            {(roomTagsQuery.data?.tags ?? []).map((tag) => {
                              const checked = (image.tagIds ?? []).includes(tag._id);
                              return (
                                <DropdownMenuCheckboxItem
                                  key={tag._id}
                                  checked={checked}
                                  onCheckedChange={(nextChecked) => {
                                    setRoomImages((prev) =>
                                      normalizeRoomImages(
                                        prev.map((img, i) => {
                                          if (i !== idx) return img;
                                          const current = img.tagIds ?? [];
                                          const next = nextChecked
                                            ? [...new Set([...current, tag._id])]
                                            : current.filter((id) => id !== tag._id);
                                          return { ...img, tagIds: next.length ? next : undefined };
                                        }),
                                      ),
                                    );
                                  }}
                                >
                                  {tag.name}
                                </DropdownMenuCheckboxItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        id={`room-image-file-${idx}`}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          await uploadImageFile(file, idx);
                          event.currentTarget.value = "";
                        }}
                        disabled={uploadingImageIndex !== null}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const el = document.getElementById(`room-image-file-${idx}`) as HTMLInputElement | null;
                          el?.click();
                        }}
                        disabled={uploadingImageIndex !== null}
                      >
                        {uploadingImageIndex === idx ? "Uploading..." : "Upload"}
                      </Button>
                      <input
                        type="url"
                        value={image.url}
                        onChange={(event) =>
                          setRoomImages((prev) =>
                            normalizeRoomImages(
                              prev.map((img, i) => (i === idx ? { ...img, url: event.target.value } : img)),
                            ),
                          )
                        }
                        placeholder="or paste image URL"
                        className={cn(
                          borderless,
                          "mt-2 w-full border-b border-border/70 pb-1.5 text-xs",
                          "placeholder:text-muted-foreground/50 focus-visible:border-primary",
                        )}
                      />
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Move image up"
                          disabled={idx === 0}
                          onClick={() =>
                            setRoomImages((prev) => {
                              if (idx === 0) return prev;
                              const next = [...prev];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              return normalizeRoomImages(next);
                            })
                          }
                        >
                          <ArrowUpIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Move image down"
                          disabled={idx === roomImages.length - 1}
                          onClick={() =>
                            setRoomImages((prev) => {
                              if (idx === prev.length - 1) return prev;
                              const next = [...prev];
                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                              return normalizeRoomImages(next);
                            })
                          }
                        >
                          <ArrowDownIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove image URL"
                          onClick={() =>
                            setRoomImages((prev) =>
                              normalizeRoomImages(
                                prev.length <= 1 ? [{ url: "", sortOrder: 0 }] : prev.filter((_, i) => i !== idx),
                              ),
                            )
                          }
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {imageUploadError ? (
                  <p className="mt-2 text-xs text-destructive">{imageUploadError}</p>
                ) : null}
              </div>

              {saveMutation.error ? (
                <p className="text-sm text-destructive">{saveMutation.error.message}</p>
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
            <Button type="submit" disabled={saveMutation.isPending} className="min-w-[7.5rem]">
              {saveMutation.isPending ? pendingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
