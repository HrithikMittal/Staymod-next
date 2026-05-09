"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "react-toastify";

import { generateRoomIcalToken, generateRoomIcalTokensByRoomNumber, type RoomListItem } from "@/api-clients/rooms";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks";

/**
 * Hook to get window.location.origin in a safe, SSR-compatible way.
 * Returns empty string during SSR, then hydrates to actual origin on client.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {}, // no-op subscribe (origin never changes after mount)
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => "", // server snapshot
  );
}

type RoomCalendarCardProps = {
  room: RoomListItem;
  propertyId: string;
  origin: string;
};

/**
 * Individual room card showing iCal URL(s) with copy-to-clipboard functionality.
 * For multi-unit rooms, shows two sections: combined and per-number feeds.
 */
function RoomCalendarCard({ room, propertyId, origin }: RoomCalendarCardProps) {
  const queryClient = useQueryClient();

  const generateCombinedTokenMutation = useMutation({
    mutationFn: () => generateRoomIcalToken(propertyId, room._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      toast.success("Combined calendar URL generated");
    },
    onError: () => {
      toast.error("Failed to generate combined calendar URL");
    },
  });

  const generatePerNumberTokensMutation = useMutation({
    mutationFn: () => generateRoomIcalTokensByRoomNumber(propertyId, room._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      toast.success("Per-room-number calendar URLs generated");
    },
    onError: () => {
      toast.error("Failed to generate per-room-number URLs");
    },
  });

  const handleGenerateCombined = () => {
    generateCombinedTokenMutation.mutate();
  };

  const handleGeneratePerNumber = () => {
    generatePerNumberTokensMutation.mutate();
  };

  const combinedIcalUrl = room.icalToken
    ? `${origin}/api/public/ical/rooms/${room._id}/${room.icalToken}.ics`
    : null;

  const handleCopy = async (url: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(`${label} URL copied to clipboard`);
      } else {
        // Fallback for older browsers or insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (success) {
          toast.success(`${label} URL copied to clipboard`);
        } else {
          toast.error("Failed to copy URL");
        }
      }
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const isMultiUnit = room.roomNumbers && room.roomNumbers.length > 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground">{room.name}</h3>
        <p className="text-sm text-muted-foreground">
          {room.type.replace(/_/g, " ")}
          {isMultiUnit && ` • ${room.roomNumbers?.length} units: ${room.roomNumbers?.join(", ")}`}
        </p>
      </div>

      {!isMultiUnit ? (
        // Single-unit room: show simple single-URL UI
        <>
          {!room.icalToken && (
            <Button
              size="sm"
              onClick={handleGenerateCombined}
              disabled={generateCombinedTokenMutation.isPending}
              className="mb-3"
            >
              {generateCombinedTokenMutation.isPending && (
                <LoaderIcon className="animate-spin" />
              )}
              Generate URL
            </Button>
          )}

          {combinedIcalUrl ? (
            <div className="space-y-2">
              <Label htmlFor={`ical-url-${room._id}`}>iCal Feed URL</Label>
              <div className="flex gap-2">
                <Input
                  id={`ical-url-${room._id}`}
                  value={combinedIcalUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleCopy(combinedIcalUrl, "Calendar")}
                  aria-label="Copy URL"
                >
                  <CopyIcon />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">✓ Ready to use</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate a calendar URL to sync this room with OTA platforms
            </p>
          )}
        </>
      ) : (
        // Multi-unit room: show two-section layout
        <div className="space-y-6">
          {/* Combined Calendar Section */}
          <div>
            <div className="mb-2 border-b border-border pb-1">
              <h4 className="text-sm font-semibold text-foreground">
                Combined Calendar (All Units)
              </h4>
              <p className="text-xs text-muted-foreground">
                Use when OTA lists as single room with quantity
              </p>
            </div>

            {!room.icalToken && (
              <Button
                size="sm"
                onClick={handleGenerateCombined}
                disabled={generateCombinedTokenMutation.isPending}
                className="mb-2"
              >
                {generateCombinedTokenMutation.isPending && (
                  <LoaderIcon className="animate-spin" />
                )}
                Generate Combined URL
              </Button>
            )}

            {combinedIcalUrl ? (
              <div className="space-y-2">
                <Label htmlFor={`ical-combined-${room._id}`} className="text-xs">
                  iCal Feed URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`ical-combined-${room._id}`}
                    value={combinedIcalUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => handleCopy(combinedIcalUrl, "Combined calendar")}
                    aria-label="Copy combined URL"
                  >
                    <CopyIcon />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">✓ Ready to use</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generate URL to sync all room numbers together
              </p>
            )}
          </div>

          {/* Per Room Number Section */}
          <div>
            <div className="mb-2 border-b border-border pb-1">
              <h4 className="text-sm font-semibold text-foreground">Per Room Number</h4>
              <p className="text-xs text-muted-foreground">
                Use when each room is a separate OTA listing
              </p>
            </div>

            {!room.icalTokensByRoomNumber && (
              <Button
                size="sm"
                onClick={handleGeneratePerNumber}
                disabled={generatePerNumberTokensMutation.isPending}
                className="mb-2"
              >
                {generatePerNumberTokensMutation.isPending && (
                  <LoaderIcon className="animate-spin" />
                )}
                Generate Per-Number URLs
              </Button>
            )}

            {room.icalTokensByRoomNumber ? (
              <div className="space-y-3">
                {room.roomNumbers?.map((roomNumber) => {
                  const token = room.icalTokensByRoomNumber?.[roomNumber];
                  const url = token
                    ? `${origin}/api/public/ical/rooms/${room._id}/${token}.ics`
                    : null;

                  return (
                    <div key={roomNumber} className="space-y-1">
                      <Label
                        htmlFor={`ical-${room._id}-${roomNumber}`}
                        className="text-xs font-medium"
                      >
                        Room {roomNumber}
                      </Label>
                      {url && (
                        <div className="flex gap-2">
                          <Input
                            id={`ical-${room._id}-${roomNumber}`}
                            value={url}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleCopy(url, `Room ${roomNumber}`)}
                            aria-label={`Copy URL for room ${roomNumber}`}
                          >
                            <CopyIcon />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generate separate URLs for each room number
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type OtaCalendarSyncSectionProps = {
  propertyId: string;
};

/**
 * Main section component for OTA calendar synchronization.
 * Displays instructions for popular OTA platforms and generates iCal URLs per room.
 */
export function OtaCalendarSyncSection({ propertyId }: OtaCalendarSyncSectionProps) {
  const origin = useOrigin();

  const roomsQuery = useApiQuery<{ rooms: RoomListItem[] }>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const rooms = roomsQuery.data?.rooms ?? [];
  const isLoading = roomsQuery.isLoading;
  const isError = roomsQuery.isError;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">OTA Calendar Sync</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Synchronize your availability with Airbnb, Booking.com, and other platforms using
          iCal feeds.
        </p>
      </div>

      <Accordion>
        <AccordionItem value="airbnb">
          <AccordionTrigger>How to sync with Airbnb</AccordionTrigger>
          <AccordionContent>
            <ol className="ml-4 list-decimal space-y-2 text-sm">
              <li>
                Log in to your Airbnb hosting account and navigate to{" "}
                <strong>Calendar</strong>
              </li>
              <li>
                Select the listing you want to sync, then click{" "}
                <strong>Availability settings</strong>
              </li>
              <li>
                Scroll to <strong>Calendar sync</strong> and click{" "}
                <strong>Import calendar</strong>
              </li>
              <li>Paste the calendar URL from the room card below</li>
              <li>
                Give it a name (e.g., &quot;Staymod - Room Name&quot;) and click{" "}
                <strong>Import</strong>
              </li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Airbnb will sync your calendar automatically. Updates may take a few hours.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="booking">
          <AccordionTrigger>How to sync with Booking.com</AccordionTrigger>
          <AccordionContent>
            <ol className="ml-4 list-decimal space-y-2 text-sm">
              <li>
                Log in to the Booking.com extranet and go to{" "}
                <strong>Calendar & Pricing</strong>
              </li>
              <li>
                Click <strong>Sync calendars</strong> in the left menu
              </li>
              <li>
                Select <strong>Import calendar</strong>
              </li>
              <li>Paste the calendar URL from the room card below</li>
              <li>
                Choose the room type to sync and click <strong>Connect</strong>
              </li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Booking.com syncs imported calendars multiple times per day.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="makemytrip">
          <AccordionTrigger>How to sync with MakeMyTrip</AccordionTrigger>
          <AccordionContent>
            <ol className="ml-4 list-decimal space-y-2 text-sm">
              <li>
                Log in to your MakeMyTrip partner portal and navigate to{" "}
                <strong>Inventory Management</strong>
              </li>
              <li>
                Go to <strong>Calendar Sync</strong> or <strong>Channel Manager</strong>
              </li>
              <li>
                Select <strong>Add New Calendar</strong> or <strong>Import Calendar</strong>
              </li>
              <li>Paste the calendar URL from the room card below</li>
              <li>
                Map it to the correct room type and save changes
              </li>
            </ol>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              Refer to{" "}
              <a
                href="https://partners.makemytrip.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                MakeMyTrip Partner Help
                <ExternalLinkIcon className="size-3" />
              </a>
              {" "}for detailed steps.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vrbo">
          <AccordionTrigger>How to sync with Vrbo (Expedia Group)</AccordionTrigger>
          <AccordionContent>
            <ol className="ml-4 list-decimal space-y-2 text-sm">
              <li>
                Log in to your Vrbo owner account and go to{" "}
                <strong>Dashboard</strong>
              </li>
              <li>
                Select the listing, then navigate to <strong>Calendar</strong>
              </li>
              <li>
                Click <strong>Import/Export</strong> and choose{" "}
                <strong>Import Calendar</strong>
              </li>
              <li>Paste the calendar URL from the room card below</li>
              <li>
                Name the import (e.g., &quot;Staymod Sync&quot;) and click{" "}
                <strong>Save</strong>
              </li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Vrbo refreshes imported calendars every few hours. Blocked dates from Staymod
              will appear in your Vrbo calendar.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Room Calendar URLs</h3>

        {isLoading && (
          <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 py-12">
            <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load rooms. Please try again.
          </div>
        )}

        {!isLoading && !isError && rooms.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No rooms found. Create rooms in your property to generate calendar URLs.
            </p>
          </div>
        )}

        {!isLoading && !isError && rooms.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => (
              <RoomCalendarCard
                key={room._id}
                room={room}
                propertyId={propertyId}
                origin={origin}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
