"use client";

import {
  createBookingOption,
  deleteBookingOption,
  importDefaultBookingOptions,
  type BookingOptionItem,
  type ListBookingOptionsResponse,
  type UpsertBookingOptionPayload,
  updateBookingOption,
} from "@/api-clients";
import { BookingOptionForm } from "@/components/global/booking-option-form";
import { BookingOptionListItem } from "@/components/global/booking-option-list-item";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

function toPayload(value: BookingOptionItem): UpsertBookingOptionPayload {
  return {
    name: value.name,
    description: value.description,
    appliesTo: value.appliesTo,
    frequency: value.frequency,
    pricePerUnit: value.pricePerUnit,
    isActive: value.isActive,
    sortOrder: value.sortOrder,
  };
}

export function PropertyBookingOptionsPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BookingOptionItem | null>(null);

  const query = useApiQuery<ListBookingOptionsResponse>(
    ["booking-options", propertyId],
    `/api/properties/${propertyId}/booking-options`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const sortedOptions = useMemo(() => {
    const list = query.data?.bookingOptions ?? [];
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [query.data?.bookingOptions]);

  const createMutation = useMutation({
    mutationFn: (payload: UpsertBookingOptionPayload) => createBookingOption(propertyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-options", propertyId] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpsertBookingOptionPayload) => {
      if (!editing) {
        throw new Error("Nothing selected for update.");
      }
      return updateBookingOption(propertyId, editing._id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-options", propertyId] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bookingOptionId: string) => deleteBookingOption(propertyId, bookingOptionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-options", propertyId] });
    },
  });
  const importDefaultsMutation = useMutation({
    mutationFn: () => importDefaultBookingOptions(propertyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-options", propertyId] });
    },
  });
  const hasAnyOptions = sortedOptions.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Booking options</h1>
          <p className="text-sm text-muted-foreground">
            Configure extra services like food plans, heaters, and extra mattresses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasAnyOptions ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => importDefaultsMutation.mutate()}
              disabled={!propertyId || importDefaultsMutation.isPending}
            >
              <DownloadIcon data-icon="inline-start" />
              {importDefaultsMutation.isPending ? "Importing..." : "Import default options"}
            </Button>
          ) : null}
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={!propertyId}>
            <PlusIcon data-icon="inline-start" />
            New option
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        {query.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading booking options...</p>
        ) : query.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{query.error.message}</p>
        ) : sortedOptions.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <p className="text-sm text-muted-foreground">No booking options yet.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => importDefaultsMutation.mutate()}
                disabled={importDefaultsMutation.isPending}
              >
                <DownloadIcon data-icon="inline-start" />
                {importDefaultsMutation.isPending ? "Importing defaults..." : "Import default options"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Add your first booking option
              </Button>
            </div>
          </div>
        ) : (
          <ul className="list-none">
            {sortedOptions.map((bookingOption) => (
              <BookingOptionListItem
                key={bookingOption._id}
                bookingOption={bookingOption}
                onEdit={setEditing}
                onDelete={(value) => deleteMutation.mutate(value._id)}
              />
            ))}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Create booking option</DialogTitle>
          <BookingOptionForm
            key="create-booking-option-form"
            submitLabel="Create option"
            pendingLabel="Creating..."
            isPending={createMutation.isPending}
            errorMessage={createMutation.error?.message}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Edit booking option</DialogTitle>
          {editing ? (
            <BookingOptionForm
              key={`${editing._id}-${editing.updatedAt}`}
              initialValue={toPayload(editing)}
              submitLabel="Save changes"
              pendingLabel="Saving..."
              isPending={updateMutation.isPending}
              errorMessage={updateMutation.error?.message}
              onCancel={() => setEditing(null)}
              onSubmit={(payload) => updateMutation.mutate(payload)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      {importDefaultsMutation.isError ? (
        <p className="text-sm text-destructive">{importDefaultsMutation.error.message}</p>
      ) : null}
    </main>
  );
}
