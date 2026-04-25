"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon, CameraIcon, FileTextIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks";
import {
  createCheckinUploadUrl,
  saveBookingCheckin,
  type BookingCheckinResponse,
  type UploadedIdentity,
} from "@/api-clients/check-in";
import type { BookingListItem } from "@/api-clients/bookings";

type CheckinGuestDraft = {
  name: string;
  email: string;
  phone: string;
  identityDocuments: UploadedIdentity[];
};

function createEmptyGuest(): CheckinGuestDraft {
  return { name: "", email: "", phone: "", identityDocuments: [] };
}

export function BookingCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  const [guests, setGuests] = useState<CheckinGuestDraft[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const bookingQuery = useApiQuery<{ booking: BookingListItem }>(
    ["booking", propertyId, bookingId],
    `/api/properties/${propertyId}/bookings/${bookingId}`,
    undefined,
    { enabled: Boolean(propertyId && bookingId) },
  );
  const checkinQuery = useApiQuery<BookingCheckinResponse>(
    ["booking-checkin", propertyId, bookingId],
    `/api/properties/${propertyId}/bookings/${bookingId}/check-in`,
    undefined,
    { enabled: Boolean(propertyId && bookingId) },
  );

  useEffect(() => {
    if (initialized || !bookingQuery.data || !checkinQuery.data) return;
    const existing = checkinQuery.data.checkin;
    if (existing && existing.guests.length > 0) {
      setGuests(
        existing.guests.map((g) => ({
          name: g.name ?? "",
          email: g.email ?? "",
          phone: g.phone ?? "",
          identityDocuments: g.identityDocuments ?? [],
        })),
      );
      setInitialized(true);
      return;
    }
    const booking = bookingQuery.data.booking;
    const count = Math.max(1, Number(booking?.numberOfGuests ?? 1));
    const seeded = Array.from({ length: count }, () => createEmptyGuest());
    seeded[0] = {
      name: booking?.guestName ?? "",
      email: booking?.guestEmail ?? "",
      phone: booking?.guestPhone ?? "",
      identityDocuments: [],
    };
    setGuests(seeded);
    setInitialized(true);
  }, [initialized, bookingQuery.data, checkinQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      saveBookingCheckin(propertyId, bookingId, {
        guests: guests.map((g) => ({
          name: g.name.trim(),
          email: g.email.trim() || undefined,
          phone: g.phone.trim() || undefined,
          identityDocuments: g.identityDocuments,
        })),
      }),
    onSuccess: () => {
      toast.success("Check-in completed successfully.");
      router.back();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to complete check-in.");
    },
  });

  async function uploadIdentityFile(
    guestIndex: number,
    source: UploadedIdentity["source"],
    file: File | null,
  ) {
    if (!file || !propertyId || !bookingId) return;
    const key = `${guestIndex}-${source}-${Date.now()}`;
    setUploadingKey(key);
    try {
      const signed = await createCheckinUploadUrl(propertyId, bookingId, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      const uploadRes = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file.");
      }
      setGuests((prev) =>
        prev.map((g, idx) =>
          idx === guestIndex
            ? {
                ...g,
                identityDocuments: [
                  ...g.identityDocuments,
                  {
                    fileUrl: signed.fileUrl,
                    fileKey: signed.key,
                    fileName: file.name,
                    contentType: file.type,
                    source,
                  },
                ],
              }
            : g,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  const loading = bookingQuery.isLoading || checkinQuery.isLoading || !initialized;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-3 pb-8 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Guest check-in</h1>
          <p className="text-sm text-muted-foreground">
            Upload identity documents for all guests and save check-in.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/${propertyId}/bookings`)}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading check-in details...</p>
      ) : bookingQuery.isError ? (
        <p className="text-sm text-destructive">{bookingQuery.error.message}</p>
      ) : (
        <>
          <section className="rounded-lg border border-border/70 bg-card p-4 text-sm">
            <p>
              <strong>Booking:</strong> {bookingQuery.data?.booking?._id}
            </p>
            <p>
              <strong>Primary guest:</strong> {bookingQuery.data?.booking?.guestName || "-"}
            </p>
            <p>
              <strong>Status:</strong> {String(bookingQuery.data?.booking?.status ?? "-").replace(/_/g, " ")}
            </p>
          </section>

          <section className="space-y-3">
            {guests.map((guest, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Guest {index + 1}</h2>
                  {guests.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setGuests((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={guest.name}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((g, i) => (i === index ? { ...g, name: e.target.value } : g)),
                        )
                      }
                      placeholder="Guest name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email (optional)</Label>
                    <Input
                      type="email"
                      value={guest.email}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((g, i) => (i === index ? { ...g, email: e.target.value } : g)),
                        )
                      }
                      placeholder="guest@email.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone (optional)</Label>
                    <Input
                      value={guest.phone}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((g, i) => (i === index ? { ...g, phone: e.target.value } : g)),
                        )
                      }
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Label className="sr-only" htmlFor={`camera-${index}`}>
                    Capture from camera
                  </Label>
                  <Input
                    id={`camera-${index}`}
                    className="hidden"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void uploadIdentityFile(index, "camera", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      (document.getElementById(`camera-${index}`) as HTMLInputElement | null)?.click()
                    }
                  >
                    <CameraIcon data-icon="inline-start" />
                    Camera
                  </Button>

                  <Label className="sr-only" htmlFor={`photo-${index}`}>
                    Upload photo
                  </Label>
                  <Input
                    id={`photo-${index}`}
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void uploadIdentityFile(index, "photo", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      (document.getElementById(`photo-${index}`) as HTMLInputElement | null)?.click()
                    }
                  >
                    <UploadIcon data-icon="inline-start" />
                    Upload photo
                  </Button>

                  <Label className="sr-only" htmlFor={`pdf-${index}`}>
                    Upload PDF
                  </Label>
                  <Input
                    id={`pdf-${index}`}
                    className="hidden"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void uploadIdentityFile(index, "pdf", file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      (document.getElementById(`pdf-${index}`) as HTMLInputElement | null)?.click()
                    }
                  >
                    <FileTextIcon data-icon="inline-start" />
                    Upload PDF
                  </Button>
                </div>

                {guest.identityDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No identity uploaded yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {guest.identityDocuments.map((doc, docIndex) => (
                      <li key={`${doc.fileKey}-${docIndex}`} className="flex items-center justify-between gap-2">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="truncate underline">
                          {doc.fileName}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setGuests((prev) =>
                              prev.map((g, i) =>
                                i === index
                                  ? {
                                      ...g,
                                      identityDocuments: g.identityDocuments.filter((_, dIdx) => dIdx !== docIndex),
                                    }
                                  : g,
                              ),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGuests((prev) => [...prev, createEmptyGuest()])}
            >
              <PlusIcon data-icon="inline-start" />
              Add guest
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || Boolean(uploadingKey)}
            >
              Complete Check-in
            </Button>
            {uploadingKey ? <p className="text-xs text-muted-foreground">Uploading file...</p> : null}
          </div>
        </>
      )}
    </main>
  );
}
