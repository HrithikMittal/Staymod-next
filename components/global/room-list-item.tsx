"use client";

import type { RoomListItem } from "@/api-clients";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BedDoubleIcon,
  Building2Icon,
  HashIcon,
  HomeIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TagIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

function formatPrice(n: number) {
  return `Rs.\u00a0${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function statusIndicatorClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "maintenance":
    case "out_of_order":
      return "bg-amber-500";
    case "inactive":
      return "bg-muted-foreground/50";
    default:
      return "bg-muted-foreground/50";
  }
}

function RoomStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize text-foreground"
      title={`Status: ${label}`}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", statusIndicatorClass(status))}
        aria-hidden
      />
      {label}
    </span>
  );
}

type RoomListItemRowProps = {
  room: RoomListItem;
  onEdit: (room: RoomListItem) => void;
  onDelete: (room: RoomListItem) => void;
};

export function RoomListItemRow({ room, onEdit, onDelete }: RoomListItemRowProps) {
  const bedCount = room.bedCount ?? 1;
  const unitCount = room.unitCount ?? 1;
  const typeLabel = room.type.replace(/_/g, " ");
  const bedSize = room.bedSize ?? room.bedSummary;
  const firstImageUrl =
    room.roomImages && room.roomImages.length > 0 ? room.roomImages[0].url : room.imageUrls?.[0];

  return (
    <li
      className={cn(
        "group flex flex-col gap-3 border-b border-border/60 px-4 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5",
        "hover:bg-muted/25",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {firstImageUrl ? (
            <img
              src={firstImageUrl}
              alt={`${room.name} preview`}
              className="h-28 w-full shrink-0 rounded-lg border border-border/60 object-cover sm:h-40 sm:w-64"
              loading="lazy"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">{room.name}</h2>
              {room.tagline ? (
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{room.tagline}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-xs capitalize text-foreground shadow-sm"
            title="Room type"
          >
            <LayersIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {typeLabel}
          </span>
          {room.floor ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
              title="Floor"
            >
              <Building2Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              Floor {room.floor}
            </span>
          ) : null}
          <span
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
            title="Guest capacity"
          >
            <UsersIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {room.maxGuests} guest{room.maxGuests === 1 ? "" : "s"}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
            title="Number of beds"
          >
            <BedDoubleIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {bedCount} bed{bedCount === 1 ? "" : "s"}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
            title="Physical rooms of this type (identical setup)"
          >
            <HomeIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {unitCount} room{unitCount === 1 ? "" : "s"}
          </span>
          {room.roomNumbers && room.roomNumbers.length > 0 ? (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
              title="Room numbers"
            >
              <HashIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="truncate">{room.roomNumbers.join(", ")}</span>
            </span>
          ) : null}
          {bedSize ? (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs text-muted-foreground"
              title="Bed configuration"
            >
              <TagIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{bedSize}</span>
            </span>
          ) : null}
            </div>

            {(room.priceWeekday != null || room.priceWeekend != null) && (
              <div className="flex flex-wrap gap-2">
            {room.priceWeekday != null && (
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Weekday
                </p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatPrice(room.priceWeekday)}
                </p>
              </div>
            )}
            {room.priceWeekend != null && (
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Weekend
                </p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatPrice(room.priceWeekend)}
                </p>
              </div>
            )}
              </div>
            )}

            {room.tags?.length ? (
              <div className="flex flex-wrap gap-1">
            {room.tags.map((tag) => (
              <span
                key={tag._id}
                className="inline-flex max-w-full items-center rounded-full border border-border/50 bg-primary/10 px-2 py-0.5 text-[11px] leading-tight text-foreground"
              >
                <span className="truncate">{tag.name}</span>
              </span>
            ))}
              </div>
            ) : null}

            {room.amenities?.length ? (
              <div className="flex flex-wrap gap-1">
            {room.amenities.map((a) => (
              <span
                key={a}
                className="inline-flex max-w-full items-center rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] leading-tight text-muted-foreground"
              >
                <span className="truncate">{a}</span>
              </span>
            ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-end sm:pt-0.5">
        <RoomStatusBadge status={room.status} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground opacity-80 hover:opacity-100"
                aria-label="Room actions"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            <DropdownMenuItem onClick={() => onEdit(room)}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(room)}>
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
